// Middleware to check if user is authenticated
export const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next()
    }
    res.status(401).json({
        success: false,
        message: 'Unauthorized. Please log in.'
    })
}
