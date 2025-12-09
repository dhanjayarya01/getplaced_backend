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
        primaryTechnology: {
            type: String,
            required: true,
            enum: [
                'React',
                'Node.js',
                'Next.js',
                'Express',
                'JavaScript',
                'TypeScript',
                'Java',
                'Python',
                'Spring Boot',
                'Django',
                'Flask',
                'MongoDB',
                'PostgreSQL',
                'MySQL',
                'Redis',
                'Docker',
                'Kubernetes',
                'AWS',
                'Azure',
                'GCP',
            ],
        },

        // Additional technologies used
        technologies: [String],

        // Topic/Concept
        topics: [
            {
                type: String,
                enum: [
                    'Hooks',
                    'State Management',
                    'Routing',
                    'Authentication',
                    'API Design',
                    'Database Design',
                    'Caching',
                    'Security',
                    'Testing',
                    'Performance',
                    'Deployment',
                    'Microservices',
                    'WebSockets',
                    'GraphQL',
                    'REST API',
                    'Server-Side Rendering',
                    'Client-Side Rendering',
                ],
            },
        ],

        // Problem Type
        type: {
            type: String,
            enum: ['coding', 'project', 'debugging', 'feature-implementation'],
            required: true,
        },

        // For coding problems
        codingProblem: {
            starterCode: String,
            solution: String,
            testCases: [
                {
                    input: String,
                    expectedOutput: String,
                    isHidden: { type: Boolean, default: false },
                },
            ],
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

            // Docker/K8s configuration for running the project
            dockerConfig: {
                dockerfile: String,
                dockerCompose: String,
                buildCommand: String,
                runCommand: String,
                port: Number,
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
developmentProblemSchema.index({ primaryTechnology: 1 })
developmentProblemSchema.index({ difficulty: 1 })
developmentProblemSchema.index({ type: 1 })
developmentProblemSchema.index({ topics: 1 })

const DevelopmentProblem = mongoose.model('DevelopmentProblem', developmentProblemSchema)

export default DevelopmentProblem
