import express from 'express'
import {
    getAllDSAProblems,
    getDSAProblem,
    runDSACode,
    submitDSASolution,
    getSubmissionResult,
    getDSAStats,
    createDSAProblem,
    updateDSAProblem,
    deleteDSAProblem,
} from '../controllers/dsa.controller.js'
import { getDSAFilters } from '../controllers/admin.controller.js'
import { authenticateUser, isAdmin } from '../middleware/auth.middleware.js'

const router = express.Router()

// Public routes
router.get('/filters', getDSAFilters) // Must be before /:id
router.get('/', getAllDSAProblems)
router.get('/stats', authenticateUser, getDSAStats)
router.get('/:id', getDSAProblem)

// Protected routes
router.post('/:id/run', authenticateUser, runDSACode) // Run visible test cases only
router.post('/:id/submit', authenticateUser, submitDSASolution) // Submit all test cases
router.get('/submission/:submissionId', authenticateUser, getSubmissionResult)

// Admin routes
router.post('/', authenticateUser, isAdmin, createDSAProblem)
router.put('/:id', authenticateUser, isAdmin, updateDSAProblem)
router.delete('/:id', authenticateUser, isAdmin, deleteDSAProblem)

export default router
