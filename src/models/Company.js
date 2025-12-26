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


        // ============================================
        // NEW ROLE-WISE DATA STRUCTURE
        // ============================================
        rolesData: [
            {
                roleName: {
                    type: String,
                    required: true,
                },
                description: String,

                // Role-specific hiring pipeline
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
                                'online-assessment',
                                'machine-coding',
                            ],
                            required: true,
                        },
                        description: String,
                        duration: String,
                        passingCriteria: {
                            minimumScore: Number,
                            description: String,
                        },
                    },
                ],

                // Role-specific DSA problems with round association
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
                        roundNumber: Number, // Which round this problem appears in
                        notes: String,
                    },
                ],

                // Role-specific Dev problems with round association
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
                        roundNumber: Number, // Which round this problem appears in
                        notes: String,
                    },
                ],

                // Role-specific interview questions with round association
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
                        roundNumber: Number, // Which round this question appears in
                        answer: String,
                        tips: [String],
                    },
                ],
            },
        ],

        // ============================================
        // INTERVIEW PATTERNS (Company-wide)
        // ============================================
        patterns: [{
            name: {
                type: String,
                required: true,
            },
            category: {
                type: String,
                enum: ['DSA', 'System Design', 'Behavioral', 'Other'],
                default: 'DSA',
            },
            description: String,
            frequency: {
                type: String,
                enum: ['Very High', 'High', 'Medium', 'Low'],
                default: 'Medium',
            },
            examples: [String], // Example problems or scenarios
            tips: [String], // Tips for this pattern
        }],

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




        // ============================================
        // JOB REQUIREMENTS & ELIGIBILITY
        // ============================================

        requirements: [String], // e.g., ["3+ years of React experience", "Strong problem-solving skills"]

        eligibilityCriteria: {
            minCGPA: Number,
            minPercentage: Number,
            educationLevel: {
                type: String,
                enum: ['B.Tech', 'M.Tech', 'BCA', 'MCA', 'B.Sc', 'M.Sc', 'Any Graduate', 'Any Post Graduate'],
            },
            allowedBranches: [String], // e.g., ["CSE", "IT", "ECE"]
            maxBacklogs: Number,
            yearOfPassing: [Number], // e.g., [2024, 2025]
            ageLimit: Number,
        },

        techStack: [String], // e.g., ["React", "Node.js", "MongoDB", "AWS"]

        benefits: [String], // e.g., ["Health Insurance", "Remote Work", "Learning Budget"]


        interviewTips: [String],


        // Hiring Details
        hiringFreshers: {
            type: Boolean,
            default: false,
        },
        experienceRequired: {
            min: { type: Number, default: 0 },
            max: { type: Number, default: 30 },
        },

        // Remote Work Details
        workModes: [{
            type: String,
            enum: ['Remote', 'Hybrid', 'On-site'],
        }],
        remoteMinExperience: {
            type: Number,
            default: 0, // 0 implies no extra experience required for remote specific roles
            min: 0
        },

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
