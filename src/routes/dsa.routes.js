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
    searchDSAProblemsForInterview,
    getDSAProblemForInterview,
    getCodeExecutionStatus,
} from '../controllers/dsa.controller.js'
import { getDSAFilters } from '../controllers/admin.controller.js'
import { authenticateUser, isAdmin } from '../middleware/auth.middleware.js'

const router = express.Router()

// Public routes
router.get('/filters', getDSAFilters) // Must be before /:id
router.get('/interview/search', searchDSAProblemsForInterview) // Interview search
router.get('/interview/:id', getDSAProblemForInterview) // Interview problem fetch
router.get('/', getAllDSAProblems)
router.get('/stats', authenticateUser, getDSAStats)
router.get('/:id', getDSAProblem)

// Protected routes
router.post('/:id/run', authenticateUser, runDSACode) // Run visible test cases only (synchronous)
router.post('/:id/submit', authenticateUser, submitDSASolution) // Submit all test cases (async with BullMQ)
router.get('/submission/:submissionId', authenticateUser, getSubmissionResult)
router.get('/submission-status/:jobId', authenticateUser, getCodeExecutionStatus) // Poll job status

//Admin routes
router.post('/', authenticateUser, isAdmin, createDSAProblem)
router.put('/:id', authenticateUser, isAdmin, updateDSAProblem)
router.delete('/:id', authenticateUser, isAdmin, deleteDSAProblem)

export default router
