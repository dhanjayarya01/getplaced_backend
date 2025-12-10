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
        logo: String, // Cloudinary URL
        website: String,
        description: String,

        // Company Details
        industry: String,
        headquarters: String,
        locations: [String],
        employeeCount: String,
        founded: Number,

       
        roles: [String], // e.g., ["Frontend Developer", "Backend Engineer", "Full Stack"]

       
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
                       
                    },
                ],

                // Passing criteria
                passingCriteria: {
                    minimumScore: Number,
                    description: String,
                },
            },
        ],

       
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
                role: String, // Which role this problem is for (e.g., "Frontend Developer")
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
                role: String, // Which role this problem is for
                notes: String,
            },
        ],

        // ============================================
        // INTERVIEW QUESTIONS (Company-Level, Role-Based)
        // ============================================
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
                role: String, // Which role this question is for
                
    
            },
        ],

        // ============================================
        // COMPANY-LEVEL METADATA
        // ============================================

        // Overall Interview Difficulty (across all roles)
        difficulty: {
            type: String,
            enum: ['Easy', 'Medium', 'Hard', 'Very Hard'],
        },

        // Overall Package Information (across all roles)
        averagePackage: {
            min: Number,
            max: Number,
            currency: {
                type: String,
                default: 'INR',
            },
        },

        // I WILL CONSIDER THIS LATER

        // // Benefits & Perks
        // benefits: [String],
        // workCulture: {
        //     rating: Number,
        //     reviews: [
        //         {
        //             userId: {
        //                 type: mongoose.Schema.Types.ObjectId,
        //                 ref: 'User',
        //             },
        //             rating: Number,
        //             comment: String,
        //             createdAt: Date,
        //         },
        //     ],
        // },

       

        
        interviewTips: [String],
        

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


companySchema.index({ slug: 1 })
companySchema.index({ name: 1 })
companySchema.index({ difficulty: 1 })
companySchema.index({ 'averagePackage.min': 1, 'averagePackage.max': 1 })
companySchema.index({ isHiring: 1 })

const Company = mongoose.model('Company', companySchema)

export default Company
