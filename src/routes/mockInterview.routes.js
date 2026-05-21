import express from 'express'
import {
    getAllMockInterviews,
    getMockInterview,
    createMockInterviewSession,
    startMockInterviewSession,
    submitAnswer,
    completeMockInterviewSession,
    getUserSessions,
    getSessionDetails,
    createMockInterview,
    updateMockInterview,
} from '../controllers/mockInterview.controller.js'
import { authenticateUser, isAdmin } from '../middleware/auth.middleware.js'

const router = express.Router()

// Public routes
router.get('/', getAllMockInterviews)

// Protected user routes — must come BEFORE /:id to avoid being captured as an id
router.post('/session', authenticateUser, createMockInterviewSession)
router.post('/session/:sessionId/start', authenticateUser, startMockInterviewSession)
router.post('/session/:sessionId/submit/:questionIndex', authenticateUser, submitAnswer)
router.post('/session/:sessionId/complete', authenticateUser, completeMockInterviewSession)
router.get('/user/sessions', authenticateUser, getUserSessions)
router.get('/session/:sessionId', authenticateUser, getSessionDetails)

// Admin routes — must come BEFORE /:id
router.post('/admin/create', authenticateUser, isAdmin, createMockInterview)
router.put('/admin/:id', authenticateUser, isAdmin, updateMockInterview)

// Dynamic route LAST so it doesn't swallow named paths
router.get('/:id', getMockInterview)

export default router
