import express from 'express'
import { authenticateUser } from '../middleware/auth.middleware.js'
import {
    startCompanyInterview,
    submitInterviewRound,
    getCompanyInterviewProgress,
    getUserResumeForInterview
} from '../controllers/companyInterview.controller.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateUser)

// Start a company-specific interview
router.post('/:companyId/interview/start', startCompanyInterview)

// Submit interview round result
router.post('/:companyId/interview/submit', submitInterviewRound)

// Get user's progress for a company
router.get('/:companyId/interview/progress', getCompanyInterviewProgress)

// Get user's resume for interview context
router.get('/interview/resume', getUserResumeForInterview)

export default router
