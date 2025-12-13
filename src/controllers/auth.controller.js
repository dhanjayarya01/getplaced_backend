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
            console.log('✅ User logged in successfully:', user.email)
            console.log('✅ Session ID:', req.sessionID)
            console.log('✅ Is authenticated:', req.isAuthenticated())
            console.log('✅ Cookie config:', {
                httpOnly: req.session.cookie.httpOnly,
                secure: req.session.cookie.secure,
                sameSite: req.session.cookie.sameSite,
                domain: req.session.cookie.domain
            })
            
            // Save session before redirect to ensure cookie is persisted
            req.session.save((err) => {
                if (err) {
                    console.error('❌ Session save error:', err)
                    return res.redirect(`${process.env.FRONTEND_URL}/login?error=session_failed`)
                }
                
                console.log('✅ Session saved successfully')
                
                // 🔥 CRITICAL: For cross-domain cookies to work, we must ensure:
                // 1. Cookie is set on backend domain (whale-app-4hikp.ondigitalocean.app)
                // 2. Frontend makes requests with credentials: true (✅ already done)
                // 3. Cookie has SameSite=None and Secure=true (✅ already done)
                // 4. Cookie domain is NOT set (✅ already done - domain: undefined)
                
                // The issue: Cookie is set during redirect, but browser might not store it
                // Solution: Ensure the redirect response includes the Set-Cookie header
                
                // Log response headers before redirect
                const headers = res.getHeaders()
                console.log('✅ Response headers:', Object.keys(headers))
                
                // Check if Set-Cookie will be in the response
                // Note: express-session sets this automatically, but we can't see it here
                // because it's set during the redirect response
                
                console.log('✅ Redirecting to:', `${process.env.FRONTEND_URL}/auth/callback`)
                console.log('⚠️  IMPORTANT: Browser should store cookie from redirect and send it on subsequent requests')
                
                // Redirect to callback page so frontend can verify session
                // express-session will automatically set the Set-Cookie header in the redirect response
                res.redirect(`${process.env.FRONTEND_URL}/auth/callback`)
            })
        })
    })(req, res, next)
}

export const getCurrentUser = (req, res) => {
    console.log('🔍 getCurrentUser called')
    console.log('🔍 Session ID:', req.sessionID)
    console.log('🔍 Is authenticated:', req.isAuthenticated?.())
    console.log('🔍 User:', req.user ? 'exists' : 'null')
    console.log('🔍 Cookies:', req.headers.cookie)
    
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
