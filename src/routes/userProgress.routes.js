import express from 'express'
import { authenticateUser } from '../middleware/auth.middleware.js'
import { manualUpdateProgress, getUserProgress } from '../controllers/userProgress.controller.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateUser)

// Manual update progress (for testing)
router.post('/manual-update', manualUpdateProgress)

// Get user progress
router.get('/', getUserProgress)

export default router
