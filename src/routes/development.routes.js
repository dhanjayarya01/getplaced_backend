import express from 'express'
import {
    getAllDevelopmentProblems,
    getDevelopmentProblem,
    submitDevelopmentSolution,
    startProjectChallenge,
    getDevelopmentStats,
    createDevelopmentProblem,
    updateDevelopmentProblem,
    deleteDevelopmentProblem,
} from '../controllers/development.controller.js'
import { authenticateUser, isAdmin } from '../middleware/auth.middleware.js'

const router = express.Router()

// Public routes
router.get('/', getAllDevelopmentProblems)
router.get('/stats', authenticateUser, getDevelopmentStats)
router.get('/:id', getDevelopmentProblem)

// Protected routes
router.post('/:id/submit', authenticateUser, submitDevelopmentSolution)
router.post('/:id/start-project', authenticateUser, startProjectChallenge)

// Admin routes
router.post('/', authenticateUser, isAdmin, createDevelopmentProblem)
router.put('/:id', authenticateUser, isAdmin, updateDevelopmentProblem)
router.delete('/:id', authenticateUser, isAdmin, deleteDevelopmentProblem)

export default router
