// Central export file for all routes
import authRoutes from './auth.routes.js'
import dsaRoutes from './dsa.routes.js'
import developmentRoutes from './development.routes.js'
import companyRoutes from './company.routes.js'
import mockInterviewRoutes from './mockInterview.routes.js'
import userRoutes from './user.routes.js'
import adminRoutes from './admin.routes.js'
import resumeRoutes from './resume.routes.js'

export default function setupRoutes(app) {
    // API routes
    app.use('/api/auth', authRoutes)
    app.use('/api/dsa', dsaRoutes)
    app.use('/api/development', developmentRoutes)
    app.use('/api/companies', companyRoutes)
    app.use('/api/mock-interviews', mockInterviewRoutes)
    app.use('/api/users', userRoutes)
    app.use('/api/admin', adminRoutes)
    app.use('/api/resume', resumeRoutes)

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({
            success: true,
            message: 'GetPlaced API is running',
            timestamp: new Date().toISOString(),
        })
    })
}
