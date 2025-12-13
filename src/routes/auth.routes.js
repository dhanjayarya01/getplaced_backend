import express from 'express'
import {
    googleAuth,
    googleAuthCallback,
    getCurrentUser,
    checkAuth,
    logout,
} from '../controllers/auth.controller.js'
import { isAuthenticated } from '../middleware/auth.middleware.js'

const router = express.Router()

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth
// @access  Public
router.get('/google', googleAuth)

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback', googleAuthCallback)

// @route   GET /api/auth/current-user
// @desc    Get current authenticated user
// @access  Private
router.get('/current-user', isAuthenticated, getCurrentUser)

// @route   GET /api/auth/check
// @desc    Check if user is authenticated
// @access  Public
router.get('/check', checkAuth)

// @route   GET /api/auth/logout
// @desc    Logout user
// @access  Private
router.get('/logout', isAuthenticated, logout)

// @route   GET /api/auth/test-cookie
// @desc    Test endpoint to check if cookies are being sent
// @access  Public
router.get('/test-cookie', (req, res) => {
    res.json({
        success: true,
        cookies: req.headers.cookie || 'NO COOKIES',
        sessionID: req.sessionID,
        isAuthenticated: req.isAuthenticated?.() || false,
        user: req.user || null,
    })
})

export default router
