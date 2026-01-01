import { UserProgress } from '../models/index.js'
import redis from '../config/redis.js'

/**
 * Manually update user progress for testing
 */
export const manualUpdateProgress = async (req, res) => {
    try {
        const { interviewId, interviewType, currentStage, overallScore, totalAttempts } = req.body
        const userId = req.user._id

        let userProgress = await UserProgress.findOne({ user: userId })

        if (!userProgress) {
            userProgress = await UserProgress.create({ user: userId })
        }

        const existingIndex = userProgress.interviewProgress.findIndex(
            p => p.interviewId.toString() === interviewId.toString()
        )

        const progressData = {
            interviewId,
            interviewType: interviewType || 'Mock Interview',
            currentStage: currentStage || 1,
            overallScore: overallScore || 0,
            totalAttempts: totalAttempts || 1,
            lastAttemptDate: new Date(),
            stageScores: [{
                stage: currentStage - 1 || 1,
                score: overallScore || 0,
                attemptedAt: new Date()
            }]
        }

        if (existingIndex >= 0) {
            userProgress.interviewProgress[existingIndex] = {
                ...userProgress.interviewProgress[existingIndex],
                ...progressData
            }
        } else {
            userProgress.interviewProgress.push(progressData)
        }

        await userProgress.save()

        res.json({
            success: true,
            message: 'Progress updated successfully',
            data: userProgress
        })
    } catch (error) {
        console.error('Manual update progress error:', error)
        res.status(500).json({ success: false, message: error.message })
    }
}

/**
 * Get user progress
 */
export const getUserProgress = async (req, res) => {
    try {
        const userId = req.user._id

        const userProgress = await UserProgress.findOne({ user: userId })
            .populate('interviewProgress.interviewId', 'title icon')

        if (!userProgress) {
            return res.json({
                success: true,
                data: {
                    user: userId,
                    interviewProgress: []
                }
            })
        }

        res.json({
            success: true,
            data: userProgress
        })
    } catch (error) {
        console.error('Get user progress error:', error)
        res.status(500).json({ success: false, message: error.message })
    }
}
