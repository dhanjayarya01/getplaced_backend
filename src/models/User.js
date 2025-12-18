import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
    {
        // Google OAuth Authentication (ONLY)
        googleId: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
        },
        profilePicture: {
            type: String,
        },

        // Resume Reference
        resume: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Resume',
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

        // Detailed Problem Solving Records
        solvedDSAProblems: [
            {
                problem: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'DSAProblem',
                },
                solvedAt: {
                    type: Date,
                    default: Date.now,
                },
                timeTaken: Number, // in seconds
                attempts: { type: Number, default: 1 },
                language: String, // javascript, python, java, cpp
            },
        ],

        solvedDevProblems: [
            {
                problem: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'DevelopmentProblem',
                },
                solvedAt: {
                    type: Date,
                    default: Date.now,
                },
                timeTaken: Number, // in seconds
                attempts: { type: Number, default: 1 },
            },
        ],

        practicedInterviews: [
            {
                company: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Company',
                },
                questionId: String, // Reference to interview question within company
                question: String, // The actual question text
                questionType: {
                    type: String,
                    enum: ['Technical', 'Behavioral', 'HR', 'System Design', 'Aptitude'],
                },
                practicedAt: {
                    type: Date,
                    default: Date.now,
                },
                notes: String, // User's notes or answer
            },
        ],

        companyProgress: [
            {
                company: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Company',
                },
                targetRole: String,
                dsaProblemsCompleted: { type: Number, default: 0 },
                devProblemsCompleted: { type: Number, default: 0 },
                interviewQuestionsCompleted: { type: Number, default: 0 },
                completedRounds: [String], // Array of round names completed
                lastPracticedAt: Date,
                startedAt: {
                    type: Date,
                    default: Date.now,
                },
                isActive: { type: Boolean, default: true },
            },
        ],

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
