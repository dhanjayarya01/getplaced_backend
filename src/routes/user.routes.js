import express from 'express'
import {
    getUserProfile,
    updateUserProfile,
    uploadResume,
    getUserStats,
    updateStreak,
    getLeaderboard,
} from '../controllers/user.controller.js'
import { authenticateUser } from '../middleware/auth.middleware.js'

const router = express.Router()

// All user routes require authentication
router.get('/profile', authenticateUser, getUserProfile)
router.put('/profile', authenticateUser, updateUserProfile)
router.post('/resume', authenticateUser, uploadResume)
router.get('/stats', authenticateUser, getUserStats)
router.post('/streak', authenticateUser, updateStreak)

// Public leaderboard
router.get('/leaderboard', getLeaderboard)

export default router
