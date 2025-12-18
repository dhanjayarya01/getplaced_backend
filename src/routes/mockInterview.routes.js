import express from 'express'

const router = express.Router()

// Public routes (no auth required)
import { MockInterview } from '../models/index.js'

/**
 * @route   GET /api/mock-interviews
 * @desc    Get active mock interviews (public)
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const interviews = await MockInterview.find({ isActive: true })
            .select('title icon description codingType duration interviewStages tags')
            .sort({ createdAt: -1 })

        res.json({
            success: true,
            data: interviews,
        })
    } catch (error) {
        console.error('Get mock interviews error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch interviews',
            error: error.message,
        })
    }
})

export default router
