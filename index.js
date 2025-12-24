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
// 🔐 IMPORTANT: trust proxy (Render / Heroku / Railway / DigitalOcean)
// Required for 'secure' cookies to work behind a proxy
// --------------------------------------------------
app.set('trust proxy', 1)

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
// Pass secret to cookie parser for signed cookies
app.use(cookieParser(process.env.SESSION_SECRET))

// --------------------------------------------------
// 🌍 CORS Configuration (MUST match frontend)
// --------------------------------------------------
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'https://getplaced-vrjp.vercel.app'
].filter(Boolean);

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) === -1) {
                // For development, you might want to allow all, but be careful
                // return callback(null, true); 
                return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
            }
            return callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
        exposedHeaders: ['Set-Cookie'],
    })
)

// --------------------------------------------------
// 🗄️ Session Configuration (PRODUCTION READY)
// --------------------------------------------------
const isProduction = process.env.NODE_ENV === 'production';

app.use(
    session({
        name: 'getplaced.sid',
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        proxy: true, // 🔥 REQUIRED for secure cookies behind proxy

        store: MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            collectionName: 'sessions',
            ttl: 24 * 60 * 60, // 1 day
            autoRemove: 'native',
            touchAfter: 24 * 3600 // time period in seconds
        }),

        cookie: {
            httpOnly: true,
            // 🔥 CRITICAL: For Cross-Site (Vercel -> DigitalOcean), we NEED:
            // 1. secure: true (Cookie sent over HTTPS only)
            // 2. sameSite: 'none' (Cookie sent in cross-site requests)
            secure: true,
            sameSite: 'none',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            path: '/',
            // Domain: undefined allows the cookie to be "host-only" or match the backend domain.
            // Do NOT set it to the frontend domain.
            domain: undefined
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
        sessionID: req.sessionID,
        cookie: req.session?.cookie,
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
})

export default app