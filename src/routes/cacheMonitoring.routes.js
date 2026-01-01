import express from 'express'
import {
    getCacheStats,
    resetCacheStats,
    getCacheHealth,
    warmCache,
    clearAllCache
} from '../controllers/cacheMonitoring.controller.js'
import { authenticateUser, isAdmin } from '../middleware/auth.middleware.js'

const router = express.Router()

// Public health check (no auth required)
router.get('/health', getCacheHealth)

// Protected admin routes
router.get('/stats', authenticateUser, isAdmin, getCacheStats)
router.post('/stats/reset', authenticateUser, isAdmin, resetCacheStats)
router.post('/warm', authenticateUser, isAdmin, warmCache)
router.post('/clear', authenticateUser, isAdmin, clearAllCache)

export default router
