import express from 'express'
import {
    getCacheStats,
    resetCacheStats,
    getCacheHealth,
    warmCache,
    clearAllCache,
    getKeys,
    getKey,
    deleteKey,
    deleteKeys,
    setKey,
    getQueuesStatus
} from '../controllers/cacheMonitoring.controller.js'
import { authenticateUser, isAdmin } from '../middleware/auth.middleware.js'

const router = express.Router()

// ── Public ─────────────────────────────────────────────────────────────────
router.get('/health', getCacheHealth)

// ── Admin: stats & management ──────────────────────────────────────────────
router.get('/stats',           authenticateUser, isAdmin, getCacheStats)
router.get('/queues',          authenticateUser, isAdmin, getQueuesStatus)
router.post('/stats/reset',    authenticateUser, isAdmin, resetCacheStats)
router.post('/warm',           authenticateUser, isAdmin, warmCache)
router.post('/clear',          authenticateUser, isAdmin, clearAllCache)

// ── Admin: key management ──────────────────────────────────────────────────
router.get('/keys',            authenticateUser, isAdmin, getKeys)       // list keys
router.post('/key',            authenticateUser, isAdmin, setKey)         // create/update key
router.get('/key/:key',        authenticateUser, isAdmin, getKey)         // get single key value
router.delete('/key/:key',     authenticateUser, isAdmin, deleteKey)      // delete single key
router.delete('/keys/bulk',    authenticateUser, isAdmin, deleteKeys)     // bulk delete

export default router
