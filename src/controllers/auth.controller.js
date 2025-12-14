import passport from 'passport'

// Controller for Google OAuth login
export const googleAuth = passport.authenticate('google', {
    scope: ['profile', 'email'],
})

// Controller for Google OAuth callback
export const googleAuthCallback = (req, res, next) => {
    passport.authenticate('google', (err, user) => {
        if (err || !user) {
            console.error('Google auth failed:', err)
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`)
        }

        // ✅ CRITICAL: Call req.logIn() to create and persist session
        req.logIn(user, (err) => {
            if (err) {
                console.error('Session login failed:', err)
                return res.redirect(`${process.env.FRONTEND_URL}/login?error=session_failed`)
            }

            // ✅ SESSION IS CREATED HERE
            // ✅ SESSION IS CREATED HERE

            // Save session before redirect to ensure cookie is persisted
            req.session.save((err) => {
                if (err) {
                    console.error('❌ Session save error:', err)
                    return res.redirect(`${process.env.FRONTEND_URL}/login?error=session_failed`)
                }

                // Redirect to callback page so frontend can verify session
                // express-session will automatically set the Set-Cookie header in the redirect response
                res.redirect(`${process.env.FRONTEND_URL}/auth/callback`)
            })
        })
    })(req, res, next)
}

export const getCurrentUser = (req, res) => {

    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
        res.json({
            success: true,
            user: {
                id: req.user._id,
                googleId: req.user.googleId,
                email: req.user.email,
                name: req.user.name,
                profilePicture: req.user.profilePicture,
                role: req.user.role || 'user', // Include role field
            },
        })
    } else {
        console.log('❌ Not authenticated - returning 401')
        res.status(401).json({
            success: false,
            message: 'Not authenticated',
        })
    }
}

// Controller to check authentication status
export const checkAuth = (req, res) => {
    res.json({
        success: true,
        isAuthenticated: req.isAuthenticated(),
    })
}

// Controller to logout user
export const logout = (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error logging out',
            })
        }
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error destroying session',
                })
            }
            res.clearCookie('getplaced.sid')
            res.json({
                success: true,
                message: 'Logged out successfully',
            })
        })
    })
}
