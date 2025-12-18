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

/**
 * @route   GET /api/mock-interviews/:id
 * @desc    Get single interview by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
    try {
        const interview = await MockInterview.findById(req.params.id)

        if (!interview) {
            return res.status(404).json({
                success: false,
                message: 'Interview not found',
            })
        }

        res.json({
            success: true,
            data: interview,
        })
    } catch (error) {
        console.error('Get interview by ID error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch interview',
            error: error.message,
        })
    }
})

export default router
