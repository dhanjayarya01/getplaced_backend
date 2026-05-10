import mongoose from 'mongoose'

const developmentProblemSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },
        description: {
            type: String,
            required: true,
        },
        difficulty: {
            type: String,
            enum: ['Beginner', 'Intermediate', 'Advanced'],
            required: true,
        },

        // Technology Classification
        technologies: [
            {
                type: String,
                enum: [
                    'React',
                    'Next.js',
                    'Node.js',
                    'TypeScript',
                    'Python',
                    'Spring Boot',
                    'MongoDB',
                    'PostgreSQL',
                ],
            },
        ],

        // Categories
        categories: [
            {
                type: String,
                enum: [
                    'State Management',
                    'API Integration',
                    'Authentication',
                    'Database Design',
                    'Performance',
                    'Testing',
                    'DevOps',
                ],
            },
        ],

        // Problem Type
        type: {
            type: String,
            enum: ['coding', 'project', 'debugging', 'feature-implementation'],
            required: true,
        },


        // For project-based problems
        projectProblem: {
            // Initial project setup
            repositoryUrl: String, // GitHub repo or zip file
            setupInstructions: String,

            // What needs to be done
            tasks: [
                {
                    title: String,
                    description: String,
                    type: {
                        type: String,
                        enum: ['bug-fix', 'feature', 'refactor', 'optimization'],
                    },
                    hints: [String],
                },
            ],

            // Files structure
            files: [
                {
                    path: String,
                    content: String,
                    language: String,
                },
            ],

            // Verification criteria
            verificationCriteria: [
                {
                    description: String,
                    testCommand: String, // e.g., "npm test"
                },
            ],

            // Docker/Runtime configuration for the project
            runtimeEnvironment: {
                baseImage: {
                    type: String,
                    required: true,
                    default: 'node:18'
                },
                entrypoint: {
                    type: String,
                    required: true,
                    default: 'npm'
                },
                args: {
                    type: [String],
                    default: ['run', 'dev']
                },
                installCommand: {
                    type: String,
                    default: 'npm install'
                },
                port: {
                    type: Number,
                    default: 3000
                }
            },
        },

        // Expected output/behavior
        expectedBehavior: String,

        // Hints and resources
        hints: [String],
        resources: [
            {
                title: String,
                url: String,
            },
        ],

        // Metadata
        companies: [String],
        estimatedTime: String, // "30 min", "1 hour", etc.
        xpReward: {
            type: Number,
            default: 100,
        },

        // Stats
        totalAttempts: {
            type: Number,
            default: 0,
        },
        totalCompleted: {
            type: Number,
            default: 0,
        },
        rating: {
            type: Number,
            min: 0,
            max: 5,
            default: 0,
        },
        ratingCount: {
            type: Number,
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
developmentProblemSchema.index({ slug: 1 })
developmentProblemSchema.index({ technologies: 1 })
developmentProblemSchema.index({ difficulty: 1 })
developmentProblemSchema.index({ type: 1 })
developmentProblemSchema.index({ categories: 1 })

const DevelopmentProblem = mongoose.model('DevelopmentProblem', developmentProblemSchema)

export default DevelopmentProblem
