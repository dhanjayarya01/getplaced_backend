import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
    {
        // Authentication fields
        googleId: {
            type: String,
            sparse: true, // Allow null for non-Google users
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            // Required only for email/password auth
            required: function () {
                return !this.googleId
            },
        },
        name: {
            type: String,
            required: true,
        },
        profilePicture: {
            type: String,
        },

        // Resume & Profile
        resume: {
            url: String,
            uploadedAt: Date,
            analysisScore: Number,
            recommendations: [String],
        },
        bio: String,
        skills: [String],
        experience: String, // Fresher, 0-2 years, 2-5 years, etc.
        targetPackage: String,
        targetCompanies: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Company',
            },
        ],

        // Progress Tracking
        stats: {
            dsaSolved: { type: Number, default: 0 },
            devSolved: { type: Number, default: 0 },
            mockInterviewsCompleted: { type: Number, default: 0 },
            projectsChallengesCompleted: { type: Number, default: 0 },
            totalXP: { type: Number, default: 0 },
            currentStreak: { type: Number, default: 0 },
            longestStreak: { type: Number, default: 0 },
            lastActiveDate: Date,
        },

        // Preferences
        preferences: {
            emailNotifications: { type: Boolean, default: true },
            difficulty: {
                type: String,
                enum: ['beginner', 'intermediate', 'advanced', 'mixed'],
                default: 'mixed',
            },
            focusAreas: [String], // ['DSA', 'React', 'Node.js', etc.]
        },

        // Account status
        isActive: {
            type: Boolean,
            default: true,
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
    }
)

// Indexes for better query performance
userSchema.index({ email: 1 })
userSchema.index({ googleId: 1 })
userSchema.index({ 'stats.totalXP': -1 }) // For leaderboards

const User = mongoose.model('User', userSchema)

export default User
