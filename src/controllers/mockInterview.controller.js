import { MockInterview, MockInterviewSession, User } from '../models/index.js'
import redis from '../config/redis.js'
import { generateCacheKey, invalidateMockInterviewCache, invalidateUserCache } from '../utils/cache.utils.js'

export const getAllMockInterviews = async (req, res) => {
    try {
        const {
            type,
            subType,
            difficulty,
            minPackage,
            maxPackage,
            company,
            page = 1,
            limit = 20,
            sort = '-createdAt',
        } = req.query

        const cacheKey = generateCacheKey('mock:all', {
            type, subType, difficulty, minPackage, maxPackage, company, page, limit, sort
        })

        try {
            const cachedData = await redis.get(cacheKey)
            if (cachedData) {
                const parsed = JSON.parse(cachedData)
                console.log(`✅ [CACHE HIT] Mock Interviews List - Returning ${parsed.data?.length || 0} questions from cache`)
                return res.json(parsed)
            }
        } catch (cacheError) {
            console.error('❌ [CACHE ERROR] Mock interviews read:', cacheError.message)
        }

        console.log(`⚠️  [CACHE MISS] Mock Interviews List - Fetching from database`)

        const query = { isActive: true }

        if (type) query.type = type
        if (subType) query.subType = subType
        if (difficulty) query.difficulty = difficulty
        if (company) query['companies.name'] = company

        if (minPackage || maxPackage) {
            query['packageRange.min'] = {}
            if (minPackage) query['packageRange.min'].$gte = parseInt(minPackage)
            if (maxPackage) query['packageRange.max'].$lte = parseInt(maxPackage)
        }

        const skip = (page - 1) * limit

        const questions = await MockInterview.find(query)
            .select('-technicalDetails.solution -behavioralDetails.sampleAnswer')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))

        const total = await MockInterview.countDocuments(query)

        const response = {
            success: true,
            data: questions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        }

        try {
            await redis.setex(cacheKey, 900, JSON.stringify(response))
            console.log(`💾 [CACHED] Mock Interviews List - Stored ${questions.length} questions (TTL: 15min)`)
        } catch (cacheError) {
            console.error('❌ [CACHE ERROR] Mock interviews write:', cacheError.message)
        }

        res.json(response)
    } catch (error) {
        console.error('Error fetching mock interviews:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching questions',
            error: error.message,
        })
    }
}

export const getMockInterview = async (req, res) => {
    try {
        const { id } = req.params
        const cacheKey = `mock:interview:${id}`

        try {
            const cachedData = await redis.get(cacheKey)
            if (cachedData) {
                console.log(`✅ Cache HIT: ${cacheKey}`)
                return res.json(JSON.parse(cachedData))
            }
        } catch (cacheError) {
            console.error('Cache read error:', cacheError)
        }

        console.log(`⚠️  Cache MISS: ${cacheKey}`)

        const question = await MockInterview.findOne({
            _id: id,
            isActive: true,
        }).select('-technicalDetails.solution -behavioralDetails.sampleAnswer')

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found',
            })
        }

        const response = {
            success: true,
            data: question,
        }

        try {
            await redis.setex(cacheKey, 1800, JSON.stringify(response))
            console.log(`💾 [CACHED] Mock Interview Detail - Question: ${question.title} (TTL: 30min)`)
        } catch (cacheError) {
            console.error('❌ [CACHE ERROR] Mock interview detail write:', cacheError.message)
        }

        res.json(response)
    } catch (error) {
        console.error('Error fetching mock interview:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching question',
            error: error.message,
        })
    }
}

export const createMockInterviewSession = async (req, res) => {
    try {
        const { type, difficulty, packageRange, questionCount = 5 } = req.body

        if (!type) {
            return res.status(400).json({
                success: false,
                message: 'Interview type is required',
            })
        }

        const query = { isActive: true, type }
        if (difficulty) query.difficulty = difficulty
        if (packageRange) {
            query['packageRange.min'] = { $lte: packageRange.max }
            query['packageRange.max'] = { $gte: packageRange.min }
        }

        const questions = await MockInterview.aggregate([
            { $match: query },
            { $sample: { size: parseInt(questionCount) } },
        ])

        if (questions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No questions found matching criteria',
            })
        }

        const session = new MockInterviewSession({
            user: req.user._id,
            type,
            difficulty,
            packageRange,
            duration: questionCount * 5, // 5 minutes per question
            questions: questions.map((q, index) => ({
                questionId: q._id,
                order: index + 1,
            })),
            status: 'scheduled',
        })

        await session.save()

        res.status(201).json({
            success: true,
            message: 'Mock interview session created',
            data: session,
        })
    } catch (error) {
        console.error('Error creating session:', error)
        res.status(500).json({
            success: false,
            message: 'Error creating session',
            error: error.message,
        })
    }
}

export const startMockInterviewSession = async (req, res) => {
    try {
        const { sessionId } = req.params

        const session = await MockInterviewSession.findOne({
            _id: sessionId,
            user: req.user._id,
        }).populate('questions.questionId')

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
            })
        }

        if (session.status !== 'scheduled') {
            return res.status(400).json({
                success: false,
                message: 'Session already started or completed',
            })
        }

        session.status = 'in-progress'
        session.startedAt = new Date()
        await session.save()

        res.json({
            success: true,
            message: 'Session started',
            data: session,
        })
    } catch (error) {
        console.error('Error starting session:', error)
        res.status(500).json({
            success: false,
            message: 'Error starting session',
            error: error.message,
        })
    }
}

export const submitAnswer = async (req, res) => {
    try {
        const { sessionId, questionIndex } = req.params
        const { answer, codeSubmitted, timeSpent } = req.body

        const session = await MockInterviewSession.findOne({
            _id: sessionId,
            user: req.user._id,
        })

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
            })
        }

        if (session.status !== 'in-progress') {
            return res.status(400).json({
                success: false,
                message: 'Session not in progress',
            })
        }

        const question = session.questions[questionIndex]
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found',
            })
        }

        question.answer = answer
        question.codeSubmitted = codeSubmitted
        question.timeSpent = timeSpent

        await session.save()

        res.json({
            success: true,
            message: 'Answer submitted',
            data: question,
        })
    } catch (error) {
        console.error('Error submitting answer:', error)
        res.status(500).json({
            success: false,
            message: 'Error submitting answer',
            error: error.message,
        })
    }
}

export const completeMockInterviewSession = async (req, res) => {
    try {
        const { sessionId } = req.params

        const session = await MockInterviewSession.findOne({
            _id: sessionId,
            user: req.user._id,
        }).populate('questions.questionId')

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
            })
        }

        if (session.status !== 'in-progress') {
            return res.status(400).json({
                success: false,
                message: 'Session not in progress',
            })
        }

        session.status = 'completed'
        session.completedAt = new Date()

        const totalScore = session.questions.reduce((sum, q) => sum + (q.score || 0), 0)
        session.overallScore = totalScore / session.questions.length

        session.xpEarned = Math.floor(session.overallScore * 10)

        await session.save()

        const user = await User.findById(req.user._id)
        user.stats.mockInterviewsCompleted += 1
        user.stats.totalXP += session.xpEarned
        await user.save()

        await invalidateUserCache(req.user._id)
        console.log(`🔄 [CACHE INVALIDATED] User cache cleared after session completion`)

        res.json({
            success: true,
            message: 'Session completed',
            data: session,
        })
    } catch (error) {
        console.error('Error completing session:', error)
        res.status(500).json({
            success: false,
            message: 'Error completing session',
            error: error.message,
        })
    }
}

export const getUserSessions = async (req, res) => {
    try {
        const { status, type, page = 1, limit = 10 } = req.query
        const userId = req.user._id

        const cacheKey = generateCacheKey(`mock:sessions:${userId}`, { status, type, page, limit })

        try {
            const cachedData = await redis.get(cacheKey)
            if (cachedData) {
                console.log(`✅ Cache HIT: ${cacheKey}`)
                return res.json(JSON.parse(cachedData))
            }
        } catch (cacheError) {
            console.error('Cache read error:', cacheError)
        }

        console.log(`⚠️  Cache MISS: ${cacheKey}`)

        const query = { user: userId }
        if (status) query.status = status
        if (type) query.type = type

        const skip = (page - 1) * limit

        const sessions = await MockInterviewSession.find(query)
            .sort('-createdAt')
            .skip(skip)
            .limit(parseInt(limit))

        const total = await MockInterviewSession.countDocuments(query)

        const response = {
            success: true,
            data: sessions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        }

        try {
            await redis.setex(cacheKey, 180, JSON.stringify(response))
            console.log(`💾 [CACHED] User Sessions - Stored ${sessions.length} sessions (TTL: 3min)`)
        } catch (cacheError) {
            console.error('❌ [CACHE ERROR] User sessions write:', cacheError.message)
        }

        res.json(response)
    } catch (error) {
        console.error('Error fetching sessions:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching sessions',
            error: error.message,
        })
    }
}

export const getSessionDetails = async (req, res) => {
    try {
        const { sessionId } = req.params

        const session = await MockInterviewSession.findOne({
            _id: sessionId,
            user: req.user._id,
        }).populate('questions.questionId')

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
            })
        }

        res.json({
            success: true,
            data: session,
        })
    } catch (error) {
        console.error('Error fetching session:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching session',
            error: error.message,
        })
    }
}

export const createMockInterview = async (req, res) => {
    try {
        const question = new MockInterview(req.body)
        await question.save()

        await invalidateMockInterviewCache()

        res.status(201).json({
            success: true,
            message: 'Question created successfully',
            data: question,
        })
    } catch (error) {
        console.error('Error creating question:', error)
        res.status(500).json({
            success: false,
            message: 'Error creating question',
            error: error.message,
        })
    }
}

export const updateMockInterview = async (req, res) => {
    try {
        const { id } = req.params

        const question = await MockInterview.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        })

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found',
            })
        }

        await invalidateMockInterviewCache(id)

        res.json({
            success: true,
            message: 'Question updated successfully',
            data: question,
        })
    } catch (error) {
        console.error('Error updating question:', error)
        res.status(500).json({
            success: false,
            message: 'Error updating question',
            error: error.message,
        })
    }
}
