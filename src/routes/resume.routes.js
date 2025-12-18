import express from 'express'
import {
    uploadResume,
    getUserResume,
    updateResume,
    deleteResume,
    uploadMiddleware,
} from '../controllers/resume.controller.js'
import { authenticateUser } from '../middleware/auth.middleware.js'

const router = express.Router()

// All routes require authentication
router.use(authenticateUser)

// Upload and parse resume
router.post('/upload', uploadMiddleware, uploadResume)

// Get user's resume
router.get('/', getUserResume)

// Update resume parsed data
router.put('/:id', updateResume)

// Delete resume
router.delete('/:id', deleteResume)

export default router
