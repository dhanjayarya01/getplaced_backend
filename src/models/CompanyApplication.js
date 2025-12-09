import mongoose from 'mongoose'

const companyApplicationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
        },
        role: {
            type: String,
            required: true,
        },

        // Application details
        appliedAt: {
            type: Date,
            default: Date.now,
        },
        resumeUrl: String,
        coverLetter: String,

        // Resume Analysis
        resumeAnalysis: {
            score: Number, // 0-100
            strengths: [String],
            weaknesses: [String],
            recommendations: [String],
            skillsMatched: [String],
            skillsMissing: [String],
            analyzedAt: Date,
        },

        // Application Status
        status: {
            type: String,
            enum: ['applied', 'screening', 'in-progress', 'selected', 'rejected', 'withdrawn'],
            default: 'applied',
        },

        // Interview Pipeline Progress
        currentRound: {
            type: Number,
            default: 0, // 0 means not started, 1 means first round, etc.
        },

        rounds: [
            {
                roundNumber: Number,
                roundName: String,
                roundType: String,

                status: {
                    type: String,
                    enum: ['pending', 'in-progress', 'completed', 'passed', 'failed'],
                    default: 'pending',
                },

                startedAt: Date,
                completedAt: Date,

                // Results for this round
                score: Number,
                feedback: String,

                // Questions attempted in this round
                questionsAttempted: [
                    {
                        questionType: String, // 'dsa', 'development', 'mock-interview'
                        questionId: mongoose.Schema.Types.ObjectId,
                        submissionId: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: 'Submission',
                        },
                        score: Number,
                        timeTaken: Number, // in seconds
                    },
                ],

                passed: Boolean,
            },
        ],

        // Overall Performance
        overallScore: Number,

        // Final Result
        finalResult: {
            selected: Boolean,
            packageOffered: Number,
            joiningDate: Date,
            feedback: String,
        },

        // Metadata
        notes: String,
    },
    {
        timestamps: true,
    }
)

// Indexes
companyApplicationSchema.index({ user: 1, company: 1 })
companyApplicationSchema.index({ user: 1, status: 1 })
companyApplicationSchema.index({ company: 1, status: 1 })
companyApplicationSchema.index({ appliedAt: -1 })

const CompanyApplication = mongoose.model('CompanyApplication', companyApplicationSchema)

export default CompanyApplication
