import mongoose from 'mongoose'

const mockInterviewSessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // Session configuration
        type: {
            type: String,
            enum: ['technical', 'behavioral', 'hr', 'system-design', 'mixed'],
            required: true,
        },
        difficulty: {
            type: String,
            enum: ['Easy', 'Medium', 'Hard'],
        },
        packageRange: {
            min: Number,
            max: Number,
        },
        duration: Number, // in minutes

        // Questions in this session
        questions: [
            {
                questionId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'MockInterview',
                },
                order: Number,

                // User's response
                answer: String,
                codeSubmitted: String, // If technical with code

                // Evaluation
                score: Number, // 0-10
                feedback: String,
                timeSpent: Number, // in seconds

                // AI Evaluation (if implemented)
                aiEvaluation: {
                    score: Number,
                    keyPointsCovered: [String],
                    missedPoints: [String],
                    suggestions: [String],
                },
            },
        ],

        // Session status
        status: {
            type: String,
            enum: ['scheduled', 'in-progress', 'completed', 'abandoned'],
            default: 'scheduled',
        },

        startedAt: Date,
        completedAt: Date,

        // Overall performance
        overallScore: Number,
        overallFeedback: String,

        // Strengths and improvements
        strengths: [String],
        areasToImprove: [String],

        // XP earned
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
mockInterviewSessionSchema.index({ user: 1, type: 1 })
mockInterviewSessionSchema.index({ createdAt: -1 })

const MockInterviewSession = mongoose.model('MockInterviewSession', mockInterviewSessionSchema)

export default MockInterviewSession
