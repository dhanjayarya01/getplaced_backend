import express from 'express'
import {
    getAdminDashboard,
    getDSAFilters,
    getDevelopmentFilters,
    getMockInterviewFilters,
    getCompanyFilters,
    getAllUsers,
    updateUserRole,
    deactivateUser,
    getPlatformStats,
} from '../controllers/admin.controller.js'
import { authenticateUser, isAdmin } from '../middleware/auth.middleware.js'
import mockInterviewRoutes from './admin/mockInterview.admin.routes.js'

const router = express.Router()

// All admin routes require authentication and admin role
router.use(authenticateUser, isAdmin)

// Dashboard
router.get('/dashboard', getAdminDashboard)
router.get('/stats', getPlatformStats)

// Filter aggregations (useful for frontend dropdowns)
router.get('/filters/dsa', getDSAFilters)
router.get('/filters/development', getDevelopmentFilters)
router.get('/filters/mock-interviews', getMockInterviewFilters)
router.get('/filters/companies', getCompanyFilters)

// User management
router.get('/users', getAllUsers)
router.put('/users/:userId/role', updateUserRole)
router.put('/users/:userId/deactivate', deactivateUser)

// Mock Interview management
router.use('/mock-interviews', mockInterviewRoutes)

export default router
