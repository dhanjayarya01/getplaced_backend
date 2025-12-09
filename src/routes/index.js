// Central export file for all routes
import authRoutes from './auth.routes.js'
import dsaRoutes from './dsa.routes.js'
import developmentRoutes from './development.routes.js'
import companyRoutes from './company.routes.js'
import mockInterviewRoutes from './mockInterview.routes.js'
import userRoutes from './user.routes.js'

export default function setupRoutes(app) {
    // API routes
    app.use('/api/auth', authRoutes)
    app.use('/api/dsa', dsaRoutes)
    app.use('/api/development', developmentRoutes)
    app.use('/api/companies', companyRoutes)
    app.use('/api/mock-interviews', mockInterviewRoutes)
    app.use('/api/users', userRoutes)

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({
            success: true,
            message: 'GetPlaced API is running',
            timestamp: new Date().toISOString(),
        })
    })
}
