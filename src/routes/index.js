import authRoutes from './auth.routes.js'
import dsaRoutes from './dsa.routes.js'
import developmentRoutes from './development.routes.js'
import companyRoutes from './company.routes.js'
import companyInterviewRoutes from './companyInterview.routes.js'
import mockInterviewRoutes from './mockInterview.routes.js'
import userRoutes from './user.routes.js'
import adminRoutes from './admin.routes.js'
import resumeRoutes from './resume.routes.js'
import interviewSessionRoutes from './interviewSession.routes.js'
import userProgressRoutes from './userProgress.routes.js'
import cacheMonitoringRoutes from './cacheMonitoring.routes.js'
import jobRoutes from './jobs.routes.js'
import { startJobSyncCron } from '../services/jobSyncCron.js'

export default function setupRoutes(app) {
    // API routes
    app.use('/api/auth', authRoutes)
    app.use('/api/dsa', dsaRoutes)
    app.use('/api/development', developmentRoutes)
    app.use('/api/companies', companyRoutes)
    app.use('/api/companies', companyInterviewRoutes) // Company-specific interviews
    app.use('/api/mock-interviews', mockInterviewRoutes)
    app.use('/api/users', userRoutes)
    app.use('/api/admin', adminRoutes)
    app.use('/api/resume', resumeRoutes)
    app.use('/api/interview-sessions', interviewSessionRoutes)
    app.use('/api/user-progress', userProgressRoutes)
    app.use('/api/cache', cacheMonitoringRoutes) // Cache monitoring & management
    app.use('/api/jobs',  jobRoutes)              // Job board & ML recommendations

    // Start daily cron job for job scraping & ML evaluation
    startJobSyncCron()

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({
            success: true,
            message: 'GetPlaced API is running',
            timestamp: new Date().toISOString(),
        })
    })
}
