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
    linkDSAProblem,
    unlinkDSAProblem,
    linkDevProblem,
    unlinkDevProblem,
    addInterviewQuestion,
    removeInterviewQuestion,
    getCompanyWithProblems,
    deleteCompany,
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

// Admin routes - Company Management
router.post('/', authenticateUser, isAdmin, createCompany)
router.put('/:id', authenticateUser, isAdmin, updateCompany)
router.delete('/:id', authenticateUser, isAdmin, deleteCompany)
router.get('/:id/with-problems', authenticateUser, isAdmin, getCompanyWithProblems)

// Admin routes - Link DSA Problems
router.post('/:id/link-dsa', authenticateUser, isAdmin, linkDSAProblem)
router.delete('/:id/link-dsa/:linkId', authenticateUser, isAdmin, unlinkDSAProblem)

// Admin routes - Link Dev Problems
router.post('/:id/link-dev', authenticateUser, isAdmin, linkDevProblem)
router.delete('/:id/link-dev/:linkId', authenticateUser, isAdmin, unlinkDevProblem)

// Admin routes - Interview Questions
router.post('/:id/interview-question', authenticateUser, isAdmin, addInterviewQuestion)
router.delete('/:id/interview-question/:questionId', authenticateUser, isAdmin, removeInterviewQuestion)

export default router
