import express from 'express'
import {
    getCacheStats,
    resetCacheStats,
    getCacheHealth,
    warmCache,
    clearAllCache
} from '../controllers/cacheMonitoring.controller.js'
import { protect, adminOnly } from '../middleware/auth.middleware.js'

const router = express.Router()

// Public health check (no auth required)
router.get('/health', getCacheHealth)

// Protected admin routes
router.get('/stats', protect, adminOnly, getCacheStats)
router.post('/stats/reset', protect, adminOnly, resetCacheStats)
router.post('/warm', protect, adminOnly, warmCache)
router.post('/clear', protect, adminOnly, clearAllCache)

export default router
