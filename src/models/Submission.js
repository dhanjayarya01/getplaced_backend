import mongoose from 'mongoose'

const submissionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // Problem reference
        problemType: {
            type: String,
            enum: ['dsa', 'development'],
            required: true,
        },
        problemId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            // Can reference either DSAProblem or DevelopmentProblem
        },

        // Submission details
        code: {
            type: String,
            required: true,
        },
        language: {
            type: String,
            required: true,
            enum: ['javascript', 'python', 'java', 'cpp', 'c', 'typescript'],
        },

        // Execution results
        status: {
            type: String,
            enum: [
                'pending',
                'running',
                'accepted',
                'wrong-answer',
                'runtime-error',
                'time-limit-exceeded',
                'compilation-error',
                'memory-limit-exceeded',
            ],
            default: 'pending',
        },

        // Judge0 specific
        judge0Token: String, // Track Judge0 submission token for debugging
        compilationError: String, // Store compilation error messages

        testResults: [
            {
                testCaseId: String,
                input: String,
                expectedOutput: String,
                actualOutput: String,
                passed: Boolean,
                executionTime: Number, // in seconds
                memory: Number, // in KB
                error: String,
                status: String, // Judge0 status for this test case
            },
        ],

        totalTestCases: Number,
        passedTestCases: Number,

        // Performance metrics
        executionTime: Number, // Average execution time in ms
        memoryUsed: Number, // Average memory in KB

        // Metadata
        isAccepted: {
            type: Boolean,
            default: false,
        },
        attemptNumber: Number, // Which attempt is this for the user
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
submissionSchema.index({ user: 1, problemId: 1 })
submissionSchema.index({ user: 1, status: 1 })
submissionSchema.index({ problemId: 1, status: 1 })
submissionSchema.index({ createdAt: -1 })

const Submission = mongoose.model('Submission', submissionSchema)

export default Submission
