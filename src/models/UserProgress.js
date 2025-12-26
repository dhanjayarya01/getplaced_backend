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

        // Company-Specific Interview Progress
        companyInterviewProgress: [
            {
                company: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Company',
                    required: true,
                },
                roleIndex: Number, // Index in company.rolesData array
                roleName: String, // e.g., "L3 - Software Engineer II"

                // Round-wise detailed progress
                roundProgress: [{
                    roundNumber: Number,
                    roundName: String, // e.g., "Phone Screen"
                    roundType: String, // coding, behavioral-interview, system-design, etc.
                    completed: { type: Boolean, default: false },
                    score: Number, // 1-10 score from AI
                    feedback: String, // Detailed feedback from AI
                    areasGoodIn: [String], // What candidate did well
                    areasToWorkOn: [String], // Areas for improvement
                    attemptedAt: Date,
                    problemsAsked: [{ // DSA problems asked in this round
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'DSAProblem'
                    }]
                }],

                currentRound: { type: Number, default: 1 }, // Which round user is on
                overallScore: Number, // Average across completed rounds
                totalRounds: Number, // Total rounds in this role's pipeline
                completedRounds: { type: Number, default: 0 },

                startedAt: {
                    type: Date,
                    default: Date.now,
                },
                lastAttemptedAt: Date,
                isActive: { type: Boolean, default: true },
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
userProgressSchema.index({ user: 1, 'companyInterviewProgress.company': 1 })

const UserProgress = mongoose.model('UserProgress', userProgressSchema)

export default UserProgress
