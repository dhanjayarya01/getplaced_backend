import express from 'express'
import {
    syncDailyJobs,
    getMyRecommendations,
    getAllJobs,
    updateRecommendationStatus,
} from '../controllers/jobs.controller.js'
import { getJobAdminStats, getAdminJobsList, deleteAdminJobs, deleteAllAdminJobs } from '../controllers/jobAdmin.controller.js'
import { authenticateUser, isAdmin } from '../middleware/auth.middleware.js'

const router = express.Router()

// ── Public: browse all scraped jobs ─────────────────────────────────────────
router.get('/all', getAllJobs)

// ── Authenticated: personalized recommendations ──────────────────────────────
router.get('/recommendations',       authenticateUser, getMyRecommendations)
router.patch('/recommendations/:id', authenticateUser, updateRecommendationStatus)

// ── Admin: trigger job scraping + ML evaluation ──────────────────────────────
router.post('/sync-daily',           authenticateUser, isAdmin, syncDailyJobs)

// ── Admin: dashboard stats ───────────────────────────────────────────────────
router.get('/admin/stats',           authenticateUser, isAdmin, getJobAdminStats)
router.get('/admin/list',            authenticateUser, isAdmin, getAdminJobsList)

router.delete('/admin/jobs',         authenticateUser, isAdmin, deleteAdminJobs)
router.delete('/admin/jobs/all',     authenticateUser, isAdmin, deleteAllAdminJobs)

export default router
