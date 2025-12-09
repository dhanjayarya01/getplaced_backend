// Middleware to check if user is authenticated (supports both session and JWT)
export const authenticateUser = (req, res, next) => {
    // Check if user is authenticated via session (Passport)
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next()
    }

    // TODO: Add JWT token verification here if implementing JWT
    // const token = req.headers.authorization?.split(' ')[1]
    // if (token) {
    //     const decoded = verifyJWT(token)
    //     req.user = decoded
    //     return next()
    // }

    res.status(401).json({
        success: false,
        message: 'Unauthorized. Please log in.',
    })
}

// Legacy alias for backward compatibility
export const isAuthenticated = authenticateUser

// Middleware to check if user is admin
export const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized. Please log in.',
        })
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Forbidden. Admin access required.',
        })
    }

    next()
}

// Optional middleware to attach user even if not authenticated
export const optionalAuth = (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        // User is authenticated, continue
        return next()
    }
    // User not authenticated, but continue anyway
    next()
}
