import express from 'express'
import session from 'express-session'
import passport from 'passport'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import connectDB from './src/config/database.js'
import configurePassport from './src/config/passport.js'
import setupRoutes from './src/routes/index.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Connect to MongoDB
connectDB()

// Configure Passport
configurePassport()


// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// CORS configuration
app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true, // Allow cookies to be sent
    })
)

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // HTTPS in production
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        },
    })
)

// Initialize Passport
app.use(passport.initialize())
app.use(passport.session())

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'GetPlaced Backend API',
        version: '2.0.0',
        endpoints: {
            auth: '/api/auth',
            dsa: '/api/dsa',
            development: '/api/development',
            companies: '/api/companies',
            mockInterviews: '/api/mock-interviews',
            users: '/api/users',
            admin: '/api/admin',
            health: '/api/health',
        },
        documentation: 'See README.md for API documentation',
    })
})

// Setup all API routes
setupRoutes(app)

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err)
    res.status(500).json({
        success: false,
        message: err.message || 'Internal server error',
    })
})

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`)
    console.log(`🔐 Environment: ${process.env.NODE_ENV}`)
    console.log(`\n📚 API Endpoints:`)
    console.log(`   - Auth: http://localhost:${PORT}/api/auth`)
    console.log(`   - DSA: http://localhost:${PORT}/api/dsa`)
    console.log(`   - Development: http://localhost:${PORT}/api/development`)
    console.log(`   - Companies: http://localhost:${PORT}/api/companies`)
    console.log(`   - Mock Interviews: http://localhost:${PORT}/api/mock-interviews`)
    console.log(`   - Users: http://localhost:${PORT}/api/users`)
    console.log(`   - Admin: http://localhost:${PORT}/api/admin`)
})
