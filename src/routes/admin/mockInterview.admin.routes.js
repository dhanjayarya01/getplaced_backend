import express from 'express'
import {
    getAllMockInterviews,
    getMockInterviewById,
    createMockInterview,
    updateMockInterview,
    deleteMockInterview,
    toggleActiveStatus,
} from '../../controllers/admin/mockInterview.admin.controller.js'

const router = express.Router()

// CRUD routes
router.get('/', getAllMockInterviews)
router.get('/:id', getMockInterviewById)
router.post('/', createMockInterview)
router.put('/:id', updateMockInterview)
router.delete('/:id', deleteMockInterview)

// Toggle active status
router.patch('/:id/toggle-active', toggleActiveStatus)

export default router
