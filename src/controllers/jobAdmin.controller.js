import { Job, JobRecommendation, Resume, User } from '../models/index.js'
import fetch from 'node-fetch'
import { Queue } from 'bullmq'
import redis from '../config/redis.js'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5002'

// Shared BullMQ queue ref for stats
const mlQueue = new Queue('ml-evaluation', { connection: redis })

// ── GET /api/admin/job-stats ───────────────────────────────────────────────────
// Full stats dump for the admin Job Recommendations panel
export const getJobAdminStats = async (req, res) => {
    try {
        const now          = new Date()
        const todayStart   = new Date(now); todayStart.setHours(0,0,0,0)
        const weekStart    = new Date(now); weekStart.setDate(now.getDate() - 7)
        const monthStart   = new Date(now); monthStart.setDate(now.getDate() - 30)

        // Parallel queries
        const [
            totalJobs,
            todayJobs,
            weekJobs,
            monthJobs,
            totalRecs,
            todayRecs,
            topRecs,
            queueCounts,
            mlHealth,
            usersWithResume,
        ] = await Promise.allSettled([
            Job.countDocuments({ isActive: true }),
            Job.countDocuments({ fetchedAt: { $gte: todayStart } }),
            Job.countDocuments({ fetchedAt: { $gte: weekStart } }),
            Job.countDocuments({ fetchedAt: { $gte: monthStart } }),
            JobRecommendation.countDocuments(),
            JobRecommendation.countDocuments({ batchDate: { $gte: todayStart } }),
            // Top recent recommendations with job + user info
            JobRecommendation.find({ isRecommended: true })
                .sort({ matchScore: -1, createdAt: -1 })
                .limit(50)
                .populate('jobId', 'title company location source url fetchedAt skills')
                .populate('userId', 'name email profilePicture')
                .lean(),
            // BullMQ queue stats
            Promise.all([
                mlQueue.getActiveCount(),
                mlQueue.getWaitingCount(),
                mlQueue.getCompletedCount(),
                mlQueue.getFailedCount(),
            ]).then(([active, waiting, completed, failed]) => ({ active, waiting, completed, failed })),
            // Python ML service health
            fetch(`${ML_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) })
                .then(r => r.json()).catch(() => ({ status: 'unreachable', model_loaded: false })),
            // Users with resumes
            Resume.distinct('userId').then(ids => ids.length),
        ])

        const resolve = (p) => p.status === 'fulfilled' ? p.value : null

        return res.json({
            success: true,
            data: {
                jobs: {
                    total:    resolve(totalJobs)  || 0,
                    today:    resolve(todayJobs)  || 0,
                    week:     resolve(weekJobs)   || 0,
                    month:    resolve(monthJobs)  || 0,
                },
                recommendations: {
                    total:    resolve(totalRecs)  || 0,
                    today:    resolve(todayRecs)  || 0,
                    list:     resolve(topRecs)    || [],
                },
                queue:          resolve(queueCounts) || { active: 0, waiting: 0, completed: 0, failed: 0 },
                mlService:      resolve(mlHealth),
                usersWithResume: resolve(usersWithResume) || 0,
                serverTime:     now.toISOString(),
            },
        })
    } catch (e) {
        console.error('[JobAdminStats] Error:', e.message)
        return res.status(500).json({ success: false, message: e.message })
    }
}

// ── GET /api/admin/jobs-list ──────────────────────────────────────────────────
// Paginated list of all scraped jobs for admin table
export const getAdminJobsList = async (req, res) => {
    try {
        const { page = 1, limit = 20, filter = 'all', q } = req.query
        const skip = (parseInt(page) - 1) * parseInt(limit)
        const now  = new Date()

        const dateFilter = {
            all:   {},
            today: { fetchedAt: { $gte: new Date(now.setHours(0,0,0,0)) } },
            week:  { fetchedAt: { $gte: new Date(Date.now() - 7  * 86400000) } },
            month: { fetchedAt: { $gte: new Date(Date.now() - 30 * 86400000) } },
        }

        const base = { isActive: true, ...(dateFilter[filter] || {}) }
        if (q) base.$text = { $search: q }

        const [jobs, total] = await Promise.all([
            Job.find(base).sort({ fetchedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
            Job.countDocuments(base),
        ])

        return res.json({
            success: true,
            data: { jobs, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } },
        })
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message })
    }
}

// ── DELETE /api/admin/jobs ───────────────────────────────────────────────────
// Delete specific jobs by IDs
export const deleteAdminJobs = async (req, res) => {
    try {
        const { jobIds } = req.body
        if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No job IDs provided' })
        }

        await Promise.all([
            Job.deleteMany({ _id: { $in: jobIds } }),
            JobRecommendation.deleteMany({ jobId: { $in: jobIds } })
        ])

        return res.json({ success: true, message: `Deleted ${jobIds.length} jobs successfully` })
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message })
    }
}

// ── DELETE /api/admin/jobs/all ───────────────────────────────────────────────
// Delete ALL jobs and recommendations
export const deleteAllAdminJobs = async (req, res) => {
    try {
        await Promise.all([
            Job.deleteMany({}),
            JobRecommendation.deleteMany({})
        ])

        return res.json({ success: true, message: 'All jobs and recommendations have been deleted' })
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message })
    }
}
