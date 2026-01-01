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
router.get('/:id', getMockInterview)

// Protected user routes
router.post('/session', authenticateUser, createMockInterviewSession)
router.post('/session/:sessionId/start', authenticateUser, startMockInterviewSession)
router.post('/session/:sessionId/submit/:questionIndex', authenticateUser, submitAnswer)
router.post('/session/:sessionId/complete', authenticateUser, completeMockInterviewSession)
router.get('/user/sessions', authenticateUser, getUserSessions)
router.get('/session/:sessionId', authenticateUser, getSessionDetails)

// Admin routes
router.post('/admin/create', authenticateUser, isAdmin, createMockInterview)
router.put('/admin/:id', authenticateUser, isAdmin, updateMockInterview)

export default router
