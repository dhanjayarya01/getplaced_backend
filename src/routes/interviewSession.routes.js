import express from 'express'
import { authenticateUser } from '../middleware/auth.middleware.js'
import { startSession, updateScore, getSession } from '../controllers/interviewSession.controller.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateUser)

// Start new session
router.post('/start', startSession)

// Update session score
router.patch('/:id/score', updateScore)

// Get session details
router.get('/:id', getSession)

export default router
