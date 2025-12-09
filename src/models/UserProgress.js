import mongoose from 'mongoose'

const userProgressSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // Problem Progress
        problemType: {
            type: String,
            enum: ['dsa', 'development'],
            required: true,
        },
        problemId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },

        // Status
        status: {
            type: String,
            enum: ['not-started', 'attempted', 'solved'],
            default: 'not-started',
        },

        // Attempts
        totalAttempts: {
            type: Number,
            default: 0,
        },
        firstAttemptDate: Date,
        solvedDate: Date,

        // Time tracking
        timeSpent: {
            type: Number,
            default: 0,
        }, // in seconds

        // Notes
        notes: String,
        bookmarked: {
            type: Boolean,
            default: false,
        },

        // Best submission
        bestSubmission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Submission',
        },
    },
    {
        timestamps: true,
    }
)

// Compound index to ensure one progress record per user per problem
userProgressSchema.index({ user: 1, problemId: 1, problemType: 1 }, { unique: true })
userProgressSchema.index({ user: 1, status: 1 })
userProgressSchema.index({ user: 1, bookmarked: 1 })

const UserProgress = mongoose.model('UserProgress', userProgressSchema)

export default UserProgress
