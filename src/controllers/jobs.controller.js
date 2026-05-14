import fetch from 'node-fetch'
import crypto from 'crypto'
import { Queue } from 'bullmq'
import { Job, JobRecommendation, Resume, User } from '../models/index.js'
import redis from '../config/redis.js'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5002'

// Shared BullMQ queue — ml-worker listens to this
const mlQueue = new Queue('ml-evaluation', {
    connection: redis,
})

// ── Helper: fingerprint a job for dedup ──────────────────────────────────────
function fingerprint(title, company, url) {
    return crypto.createHash('md5').update(`${title}|${company}|${url}`).digest('hex')
}

// ── POST /api/jobs/sync-daily ─────────────────────────────────────────────────
// Scrapes today's jobs, saves new ones to DB, queues ML evaluation for all users
export const syncDailyJobs = async (req, res) => {
    try {
        const { query = 'software developer', location = 'Remote', limit = 30 } = req.body || {}

        // 1. Fetch jobs from the Python scraper
        console.log(`\n[JobSync] 🔍 Fetching jobs: "${query}" in "${location}"...`)
        const scrapeRes = await fetch(`${ML_SERVICE_URL}/api/jobs/fetch`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ query, location, limit }),
        })

        if (!scrapeRes.ok) {
            const err = await scrapeRes.text()
            return res.status(502).json({ success: false, message: `ML service error: ${err}` })
        }

        const scraped = await scrapeRes.json()
        const rawJobs = scraped.jobs || []
        console.log(`[JobSync] ✅ Scraped ${rawJobs.length} raw jobs`)

        // 2. Deduplicate & upsert into DB
        const batchDate = new Date()
        let savedCount  = 0
        const savedJobIds = []

        for (const j of rawJobs) {
            const fp = fingerprint(j.title, j.company, j.url || '')
            try {
                const doc = await Job.findOneAndUpdate(
                    { fingerprint: fp },
                    {
                        $setOnInsert: {
                            title:       j.title,
                            company:     j.company,
                            location:    j.location || location,
                            description: j.description || '',
                            url:         j.url || '',
                            source:      j.source || 'scraped',
                            skills:      j.skills || [],
                            postedAt:    j.postedDate ? new Date(j.postedDate) : batchDate,
                            isActive:    true,
                            fingerprint: fp,
                        },
                        $set: { fetchedAt: batchDate },
                    },
                    { upsert: true, new: true }
                )
                savedJobIds.push(doc._id)
                savedCount++
            } catch (e) {
                // Duplicate fingerprint — already saved, just track the ID
                const existing = await Job.findOne({ fingerprint: fp }).select('_id')
                if (existing) savedJobIds.push(existing._id)
            }
        }

        console.log(`[JobSync] 💾 Saved/updated ${savedCount} jobs (total tracked: ${savedJobIds.length})`)

        // 3. Find all active users who have a resume
        const resumeUserIds = await Resume.distinct('userId')
        const activeUsers   = await User.find({
            _id:      { $in: resumeUserIds },
            isActive: { $ne: false },
        }).select('_id').lean()

        console.log(`[JobSync] 👥 Queuing evaluation for ${activeUsers.length} users`)

        // 4. Push one BullMQ task per user into ml-evaluation queue
        const queueOps = activeUsers.map(u =>
            mlQueue.add(
                'evaluate-user',
                { userId: u._id.toString(), jobIds: savedJobIds.map(id => id.toString()), batchDate: batchDate.toISOString() },
                { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
            )
        )
        await Promise.all(queueOps)

        return res.json({
            success:        true,
            message:        'Job sync started. Recommendations will be ready shortly.',
            jobsScraped:    rawJobs.length,
            jobsSaved:      savedCount,
            usersQueued:    activeUsers.length,
            batchDate:      batchDate.toISOString(),
        })

    } catch (error) {
        console.error('[JobSync] ❌ Error:', error.message)
        return res.status(500).json({ success: false, message: error.message })
    }
}

// ── GET /api/jobs/recommendations ─────────────────────────────────────────────
// Returns ML-recommended jobs for the logged-in user
export const getMyRecommendations = async (req, res) => {
    try {
        const userId = req.user._id
        const { page = 1, limit = 20, minScore = 0 } = req.query

        const skip = (parseInt(page) - 1) * parseInt(limit)

        const [recs, total] = await Promise.all([
            JobRecommendation.find({ userId, isRecommended: true, matchScore: { $gte: parseFloat(minScore) } })
                .sort({ matchScore: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('jobId')
                .lean(),
            JobRecommendation.countDocuments({ userId, isRecommended: true }),
        ])

        // Mark as viewed
        await JobRecommendation.updateMany(
            { userId, isViewed: false, _id: { $in: recs.map(r => r._id) } },
            { $set: { isViewed: true } }
        )

        return res.json({
            success: true,
            data: {
                recommendations: recs.map(r => ({
                    _id:        r._id,
                    matchScore: r.matchScore,
                    isViewed:   r.isViewed,
                    isSaved:    r.isSaved,
                    isApplied:  r.isApplied,
                    batchDate:  r.batchDate,
                    job:        r.jobId,
                })),
                pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
            },
        })
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message })
    }
}

// ── GET /api/jobs/all ─────────────────────────────────────────────────────────
// Returns paginated list of all scraped jobs (no ML filter — browse all)
export const getAllJobs = async (req, res) => {
    try {
        const { page = 1, limit = 20, q, location, source, days, tech } = req.query
        const skip   = (parseInt(page) - 1) * parseInt(limit)
        const filter = { isActive: true }

        if (q)        filter.$text = { $search: q }
        
        // Location (exact 'remote' or regex)
        if (location) {
            if (location.toLowerCase() === 'remote') {
                filter.location = { $regex: /remote/i }
            } else if (location.toLowerCase() === 'onsite' || location.toLowerCase() === 'on-site') {
                filter.location = { $not: { $regex: /remote/i } }
            } else {
                filter.location = new RegExp(location, 'i')
            }
        }
        
        if (source)   filter.source = source

        // Tech Stack
        if (tech) {
            // tech can be a comma-separated string: "react,node,aws"
            const techs = tech.split(',').map(t => t.trim()).filter(Boolean)
            if (techs.length > 0) {
                // If they have full-text search, we might not need this, but checking skills explicitly is better
                filter.skills = { $in: techs.map(t => new RegExp(`^${t}$`, 'i')) }
            }
        }

        // Date filter
        if (days) {
            const dateLimit = new Date()
            dateLimit.setDate(dateLimit.getDate() - parseInt(days))
            filter.fetchedAt = { $gte: dateLimit }
        }

        const [jobs, total] = await Promise.all([
            Job.find(filter).sort({ fetchedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
            Job.countDocuments(filter),
        ])

        return res.json({
            success: true,
            data: { jobs, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } },
        })
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message })
    }
}

// ── PATCH /api/jobs/recommendations/:id ──────────────────────────────────────
// Save / mark applied on a recommendation
export const updateRecommendationStatus = async (req, res) => {
    try {
        const { id }     = req.params
        const { isSaved, isApplied } = req.body
        const update     = {}
        if (isSaved   !== undefined) update.isSaved   = isSaved
        if (isApplied !== undefined) { update.isApplied = isApplied; if (isApplied) update.appliedAt = new Date() }

        const rec = await JobRecommendation.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            { $set: update },
            { new: true }
        )
        if (!rec) return res.status(404).json({ success: false, message: 'Recommendation not found' })
        return res.json({ success: true, data: rec })
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message })
    }
}
