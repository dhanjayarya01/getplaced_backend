import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import User from '../models/User.js'

export default function configurePassport() {
    
    passport.serializeUser((user, done) => {
        done(null, user.id)
    })

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id)
            done(null, user)
        } catch (error) {
            done(error, null)
        }
    })

    // Google OAuth Strategy
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL,
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    
                    let user = await User.findOne({ googleId: profile.id })

                    if (user) {
                       
                        return done(null, user)
                    }

                    user = await User.create({
                        googleId: profile.id,
                        email: profile.emails[0].value,
                        name: profile.displayName,
                        profilePicture: profile.photos[0]?.value || '',
                    })

                    done(null, user)
                } catch (error) {
                    console.error('Error in Google Strategy:', error)
                    done(error, null)
                }
            }
        )
    )
}
