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

// REQUIRED for DigitalOcean App Platform reverse proxy (HTTPS)
app.set("trust proxy", 1);

// Connect to MongoDB
connectDB()

// Configure Passport
configurePassport()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ======================
// CORS FIX (WORKING CONFIG)
// ======================
app.use(
    cors({
        origin: process.env.FRONTEND_URL, // MUST be exactly the Vercel URL
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    })
)

// ======================
// SESSION FIX (WORKING CONFIG)
// ======================
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            httpOnly: true,
            secure: true,      // DigitalOcean App Platform uses HTTPS
            sameSite: "none",  // REQUIRED for cross-site (Vercel <-> DO)
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
        frontend: process.env.FRONTEND_URL,
        environment: process.env.NODE_ENV,
        endpoints: {
            auth: '/api/auth',
            dsa: '/api/dsa',
            development: '/api/development',
            companies: '/api/companies',
            mockInterviews: '/api/mock-interviews',
            users: '/api/users',
            admin: '/api/admin',
            health: '/api/health'
        }
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
})
