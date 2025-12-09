import mongoose from 'mongoose'

const companySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },
        logo: String,
        website: String,
        description: String,

        // Company Details
        industry: String,
        headquarters: String,
        locations: [String],
        employeeCount: String, // "1000-5000", "10000+"
        founded: Number,

        // Hiring Information
        hiringPipeline: [
            {
                roundNumber: Number,
                roundName: {
                    type: String,
                    required: true,
                },
                roundType: {
                    type: String,
                    enum: [
                        'aptitude',
                        'coding',
                        'technical-interview',
                        'behavioral-interview',
                        'hr-interview',
                        'system-design',
                        'assignment',
                        'group-discussion',
                    ],
                    required: true,
                },
                description: String,
                duration: String, // "60 min", "2 hours"

                // Questions for this round
                questions: [
                    {
                        questionType: {
                            type: String,
                            enum: ['dsa', 'development', 'mock-interview', 'aptitude'],
                        },
                        questionId: mongoose.Schema.Types.ObjectId,
                        // Reference can be to DSAProblem, DevelopmentProblem, or MockInterview
                    },
                ],

                // Passing criteria
                passingCriteria: {
                    minimumScore: Number,
                    description: String,
                },
            },
        ],

        // Linked Problems (for company-specific practice)
        linkedDSAProblems: [
            {
                problem: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'DSAProblem',
                },
                frequency: {
                    type: String,
                    enum: ['Very High', 'High', 'Medium', 'Low'],
                    default: 'Medium',
                },
                lastAsked: Date,
                round: String, // e.g., "Technical Round 1"
                notes: String, // Additional context
            },
        ],

        linkedDevProblems: [
            {
                problem: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'DevelopmentProblem',
                },
                frequency: {
                    type: String,
                    enum: ['Very High', 'High', 'Medium', 'Low'],
                    default: 'Medium',
                },
                lastAsked: Date,
                round: String,
                notes: String,
            },
        ],

        // Interview Questions (PYQs - Previously Asked Questions)
        interviewQuestions: [
            {
                question: {
                    type: String,
                    required: true,
                },
                type: {
                    type: String,
                    enum: ['Technical', 'Behavioral', 'HR', 'System Design', 'Aptitude'],
                    required: true,
                },
                difficulty: {
                    type: String,
                    enum: ['Easy', 'Medium', 'Hard'],
                },
                round: String, // Which round this question was asked
                answer: String, // Optional sample answer
                tips: [String], // Tips for answering
                askedDate: Date, // When it was asked
                upvotes: {
                    type: Number,
                    default: 0,
                },
            },
        ],

        // Available Roles
        roles: [
            {
                title: String,
                level: {
                    type: String,
                    enum: ['Intern', 'Entry', 'Mid', 'Senior', 'Lead', 'Principal'],
                },
                packageRange: {
                    min: Number,
                    max: Number,
                    currency: {
                        type: String,
                        default: 'INR',
                    },
                },
                requirements: {
                    experience: String,
                    skills: [String],
                    education: String,
                },
                isActive: {
                    type: Boolean,
                    default: true,
                },
            },
        ],

        // Interview Difficulty
        difficulty: {
            type: String,
            enum: ['Easy', 'Medium', 'Hard', 'Very Hard'],
            required: true,
        },

        // Package Information
        averagePackage: {
            min: Number,
            max: Number,
            currency: {
                type: String,
                default: 'INR',
            },
        },

        // Benefits & Perks
        benefits: [String],
        workCulture: {
            rating: Number,
            reviews: [
                {
                    userId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                    },
                    rating: Number,
                    comment: String,
                    createdAt: Date,
                },
            ],
        },

        // Stats
        stats: {
            totalApplicants: {
                type: Number,
                default: 0,
            },
            totalSelected: {
                type: Number,
                default: 0,
            },
            preparing: {
                type: Number,
                default: 0,
            },
            averageSelectionRate: Number, // percentage
        },

        // Interview Tips
        interviewTips: [String],
        commonQuestions: [String],

        // Status
        isActive: {
            type: Boolean,
            default: true,
        },
        isHiring: {
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
companySchema.index({ slug: 1 })
companySchema.index({ name: 1 })
companySchema.index({ difficulty: 1 })
companySchema.index({ 'averagePackage.min': 1, 'averagePackage.max': 1 })
companySchema.index({ isHiring: 1 })

const Company = mongoose.model('Company', companySchema)

export default Company
