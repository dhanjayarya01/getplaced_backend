import mongoose from 'mongoose'

const mockInterviewSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['technical', 'behavioral', 'hr', 'system-design', 'aptitude'],
            required: true,
        },
        subType: {
            type: String,
            // For technical: 'dsa', 'frontend', 'backend', 'fullstack', 'devops'
            // For behavioral: 'leadership', 'teamwork', 'conflict', 'achievement'
        },

        // Question details
        question: {
            type: String,
            required: true,
        },
        followUpQuestions: [String],

        // For technical questions
        technicalDetails: {
            difficulty: {
                type: String,
                enum: ['Easy', 'Medium', 'Hard'],
            },
            topics: [String],
            expectedApproach: String,
            codeRequired: {
                type: Boolean,
                default: false,
            },
            starterCode: {
                javascript: String,
                python: String,
                java: String,
            },
            solution: String,
            timeComplexity: String,
            spaceComplexity: String,
        },

        // For behavioral questions
        behavioralDetails: {
            framework: String, // STAR, CAR, etc.
            keyPoints: [String],
            sampleAnswer: String,
        },

        // Answer guidelines
        answerGuidelines: {
            keyPoints: [String],
            commonMistakes: [String],
            idealAnswerLength: String, // "2-3 minutes"
        },

        // Difficulty & Package
        difficulty: {
            type: String,
            enum: ['Easy', 'Medium', 'Hard'],
            required: true,
        },
        packageRange: {
            min: Number, // in LPA
            max: Number,
        },

        // Companies that asked this
        companies: [
            {
                name: String,
                round: String, // "Phone Screen", "Onsite Round 2", etc.
                year: Number,
            },
        ],

        // Metadata
        estimatedTime: String, // "5 min", "10 min"
        tags: [String],

        // Stats
        timesAsked: {
            type: Number,
            default: 0,
        },
        timesAnswered: {
            type: Number,
            default: 0,
        },
        averageRating: {
            type: Number,
            min: 0,
            max: 5,
            default: 0,
        },

        // Status
        isActive: {
            type: Boolean,
            default: true,
        },
        isPremium: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
)

// Indexes
mockInterviewSchema.index({ type: 1 })
mockInterviewSchema.index({ subType: 1 })
mockInterviewSchema.index({ difficulty: 1 })
mockInterviewSchema.index({ 'packageRange.min': 1, 'packageRange.max': 1 })
mockInterviewSchema.index({ 'companies.name': 1 })

const MockInterview = mongoose.model('MockInterview', mockInterviewSchema)

export default MockInterview
