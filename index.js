import express from 'express'
import session from 'express-session'
import passport from 'passport'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import MongoStore from 'connect-mongo'

import connectDB from './src/config/database.js'
import configurePassport from './src/config/passport.js'
import setupRoutes from './src/routes/index.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// --------------------------------------------------
// 🔐 IMPORTANT: trust proxy (Render / Heroku / Railway)
// --------------------------------------------------
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1)
}

// --------------------------------------------------
// 📦 Connect to MongoDB
// --------------------------------------------------
connectDB()

// --------------------------------------------------
// 🔑 Configure Passport strategies
// --------------------------------------------------
configurePassport()

// --------------------------------------------------
// 🧱 Global Middleware
// --------------------------------------------------
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// --------------------------------------------------
// 🌍 CORS Configuration (MUST match frontend)
// --------------------------------------------------
app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    })
)

// --------------------------------------------------
// 🗄️ Session Configuration (PRODUCTION READY)
// --------------------------------------------------
app.use(
    session({
        name: 'getplaced.sid',

        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,

        proxy: true, // 🔥 REQUIRED on DigitalOcean/production

        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            collectionName: 'sessions',
            ttl: 24 * 60 * 60, // 1 day
        }),

        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            path: '/', // Ensure cookie is available for all paths
            // Don't set domain - let browser handle cross-domain cookies
        },
    })
)

// --------------------------------------------------
// 🛂 Passport Middleware
// --------------------------------------------------
app.use(passport.initialize())
app.use(passport.session())

// --------------------------------------------------
// 🏠 Root Endpoint
// --------------------------------------------------
app.get('/', (req, res) => {
    res.json({
        message: 'GetPlaced Backend API',
        version: '2.0.0',
        environment: process.env.NODE_ENV,
        authenticated: req.isAuthenticated?.() || false,
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
    })
})

// --------------------------------------------------
// 🚏 API Routes
// --------------------------------------------------
setupRoutes(app)

// --------------------------------------------------
// ❌ Global Error Handler
// --------------------------------------------------
app.use((err, req, res, next) => {
    console.error('🔥 Error:', err)

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    })
})

// --------------------------------------------------
// 🚀 Start Server
// --------------------------------------------------
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`)
    console.log(`🔐 Environment: ${process.env.NODE_ENV}`)
    console.log(`📦 MongoDB: Connected`)
    console.log(`\n📚 API Endpoints:`)
    console.log(`   - Auth: /api/auth`)
    console.log(`   - DSA: /api/dsa`)
    console.log(`   - Development: /api/development`)
    console.log(`   - Companies: /api/companies`)
    console.log(`   - Mock Interviews: /api/mock-interviews`)
    console.log(`   - Users: /api/users`)
    console.log(`   - Admin: /api/admin`)
})

export default app
