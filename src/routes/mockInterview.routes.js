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
router.get('/questions', getAllMockInterviews)
router.get('/questions/:id', getMockInterview)

// Protected routes - Sessions
router.post('/sessions', authenticateUser, createMockInterviewSession)
router.get('/sessions', authenticateUser, getUserSessions)
router.get('/sessions/:sessionId', authenticateUser, getSessionDetails)
router.post('/sessions/:sessionId/start', authenticateUser, startMockInterviewSession)
router.post('/sessions/:sessionId/questions/:questionIndex/answer', authenticateUser, submitAnswer)
router.post('/sessions/:sessionId/complete', authenticateUser, completeMockInterviewSession)

// Admin routes
router.post('/questions', authenticateUser, isAdmin, createMockInterview)
router.put('/questions/:id', authenticateUser, isAdmin, updateMockInterview)

export default router
