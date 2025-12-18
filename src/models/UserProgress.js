import mongoose from 'mongoose'

const userProgressSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true, // One progress doc per user
        },

        // Mock Interview Progress
        interviewProgress: [
            {
                interviewId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'MockInterview',
                },
                interviewType: String, // "Technical DSA", "Behavioral", etc.
                currentStage: {
                    type: Number,
                    default: 1,
                },
                overallScore: {
                    type: Number,
                    min: 0,
                    max: 10,
                    default: 0,
                },
                areasToWorkOn: [String], // ["Array problems", "Communication clarity"]
                areasGoodIn: [String], // ["Problem solving", "Code structure"]
                specialThingsToWorkOn: [String], // ["Time complexity analysis", "Edge cases"]
                totalAttempts: {
                    type: Number,
                    default: 0,
                },
                lastAttemptDate: Date,
                stageScores: [
                    {
                        stage: Number,
                        score: Number,
                        attemptedAt: Date,
                    },
                ],
            },
        ],
    },
    {
        timestamps: true,
    }
)

// Indexes
userProgressSchema.index({ user: 1 })
userProgressSchema.index({ user: 1, 'interviewProgress.interviewId': 1 })

const UserProgress = mongoose.model('UserProgress', userProgressSchema)

export default UserProgress
