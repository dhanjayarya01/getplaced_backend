import mongoose from 'mongoose'

const mockInterviewSessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // Reference to interview template
        interviewTemplate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MockInterview',
            required: true,
        },

        // Session Status
        status: {
            type: String,
            enum: ['scheduled', 'in-progress', 'completed', 'abandoned'],
            default: 'scheduled',
        },

        // Current stage
        currentStage: {
            type: Number,
            default: 1,
        },

        // Questions and Answers
        responses: [
            {
                stage: Number,
                question: String,
                answer: String,
                score: Number,
                feedback: String,
                timeSpent: Number, // in seconds
            },
        ],

        // Overall Results
        overallScore: {
            type: Number,
            min: 0,
            max: 10,
        },
        feedback: String,
        strengths: [String],
        areasToImprove: [String],

        // Interview Preferences
        language: {
            type: String,
            default: 'English',
        },
        voiceId: {
            type: String,
            default: '21m00Tcm4TlvDq8ikWAM', // Rachel - default
        },

        // Timing
        startedAt: Date,
        completedAt: Date,
        totalDuration: Number, // in seconds

        // XP & Rewards
        xpEarned: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
)

// Indexes
mockInterviewSessionSchema.index({ user: 1, status: 1 })
mockInterviewSessionSchema.index({ user: 1, interviewTemplate: 1 })
mockInterviewSessionSchema.index({ createdAt: -1 })

const MockInterviewSession = mongoose.model('MockInterviewSession', mockInterviewSessionSchema)

export default MockInterviewSession
