import express from 'express'
import {
    getAllCompanies,
    getCompany,
    applyToCompany,
    getUserApplications,
    getApplicationDetails,
    startInterviewRound,
    submitRound,
    createCompany,
    updateCompany,
} from '../controllers/company.controller.js'
import { authenticateUser, isAdmin } from '../middleware/auth.middleware.js'

const router = express.Router()

// Public routes
router.get('/', getAllCompanies)
router.get('/:id', getCompany)

// Protected routes - Applications
router.post('/:id/apply', authenticateUser, applyToCompany)
router.get('/applications/my', authenticateUser, getUserApplications)
router.get('/applications/:applicationId', authenticateUser, getApplicationDetails)
router.post('/applications/:applicationId/start-round', authenticateUser, startInterviewRound)
router.post('/applications/:applicationId/submit-round', authenticateUser, submitRound)

// Admin routes
router.post('/', authenticateUser, isAdmin, createCompany)
router.put('/:id', authenticateUser, isAdmin, updateCompany)

export default router
