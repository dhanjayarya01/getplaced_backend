import mongoose from 'mongoose'

const dsaProblemSchema = new mongoose.Schema(
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
            enum: ['Easy', 'Medium', 'Hard'],
            required: true,
        },

        // Data Structure Classification
        dataStructures: [
            {
                type: String,
                enum: [
                    'Array',
                    'String',
                    'Linked List',
                    'Stack',
                    'Queue',
                    'Tree',
                    'Binary Tree',
                    'BST',
                    'Graph',
                    'Hash Table',
                    'Heap',
                    'Trie',
                    'Matrix',
                ],
            },
        ],

        // Pattern Classification
        patterns: [
            {
                type: String,
                enum: [
                    'Two Pointers',
                    'Sliding Window',
                    'Binary Search',
                    'DFS',
                    'BFS',
                    'Dynamic Programming',
                    'Greedy',
                    'Backtracking',
                    'Divide and Conquer',
                    'Recursion',
                    'Sorting',
                    'Bit Manipulation',
                    'Math',
                ],
            },
        ],

        // Problem Details
        constraints: [String],
        examples: [
            {
                input: String,
                output: String,
                explanation: String,
            },
        ],

        // Code Templates
        starterCode: {
            javascript: String,
            python: String,
            java: String,
            cpp: String,
        },

        // Solution & Testing
        solution: {
            code: String,
            language: String,
            timeComplexity: String,
            spaceComplexity: String,
            explanation: String,
        },

        testCases: [
            {
                input: String,
                expectedOutput: String,
                isHidden: { type: Boolean, default: false }, // Hidden test cases
            },
        ],

        // Metadata
        companies: [String], // Companies that asked this question
        acceptance: {
            type: Number,
            min: 0,
            max: 100,
        },
        totalSubmissions: {
            type: Number,
            default: 0,
        },
        totalAccepted: {
            type: Number,
            default: 0,
        },

        // Related Problems
        relatedProblems: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'DSAProblem',
            },
        ],

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
dsaProblemSchema.index({ slug: 1 })
dsaProblemSchema.index({ difficulty: 1 })
dsaProblemSchema.index({ dataStructures: 1 })
dsaProblemSchema.index({ patterns: 1 })
dsaProblemSchema.index({ companies: 1 })

const DSAProblem = mongoose.model('DSAProblem', dsaProblemSchema)

export default DSAProblem
