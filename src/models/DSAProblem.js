import mongoose from 'mongoose'

const dsaProblemSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        problemNumber: {
            type: Number,
            required: true,
            unique: true,
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
                    'Doubly Linked List',
                    'Stack',
                    'Queue',
                    'Monotonic Stack',
                    'Monotonic Queue',
                    'Tree',
                    'Binary Tree',
                    'BST',
                    'Trie',
                    'Graph',
                    'Union Find',
                    'Hash Table',
                    'Heap',
                    'Matrix',
                    'Segment Tree',
                    'Fenwick Tree',
                    'Suffix Array',
                    'Ordered Set'
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
                    'Topological Sort',
                    'Shortest Path',
                    'Dynamic Programming',
                    'Greedy',
                    'Backtracking',
                    'Divide and Conquer',
                    'Recursion',
                    'Sorting',
                    'Bucket Sort',
                    'Radix Sort',
                    'Merge Sort',
                    'Quick Sort',
                    'Bit Manipulation',
                    'Math',
                    'Geometry',
                    'Game Theory',
                    'Stack',
                    'Queue',
                    'Heap',
                    'Graph',
                    'Design',
                    'Prefix Sum',
                    'Union Find',
                    'Simulation',
                    'Counting',
                    'Combinatorics',
                    'Number Theory',
                    'Rolling Hash',
                    'Memoization',
                    'Interactive',
                    'Data Stream',
                    'Brainteaser',
                    'Randomized',
                    'Reservoir Sampling',
                    'Probability',
                    'Line Sweep'
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
            c: String,
        },

        // Solution & Testing
        solution: {
            code: String,
            language: String,
            timeComplexity: String,
            spaceComplexity: String,
            explanation: String,
        },

        // Code Execution Metadata (Default / C / C++)
        functionName: {
            type: String,
            required: false
        },
        parameters: [
            {
                name: { type: String, required: true },
                cType: { type: String, required: true },
                sizeParam: { type: String, required: false }
            }
        ],
        returnType: {
            cType: { type: String, required: false },
            sizeParam: { type: String, required: false }
        },

        // Java Execution Metadata
        javaMetadata: {
            functionName: { type: String, required: false },
            parameters: [
                {
                    name: { type: String, required: true },
                    type: { type: String, required: true } // e.g., "int[]", "String", "List<Integer>"
                }
            ],
            returnType: {
                type: { type: String, required: false } // e.g., "int[]", "void"
            }
        },

        // Python Execution Metadata
        pythonMetadata: {
            functionName: { type: String, required: false },
            parameters: [
                {
                    name: { type: String, required: true },
                    type: { type: String, required: true } // e.g., "List[int]", "str"
                }
            ],
            returnType: {
                type: { type: String, required: false } // e.g., "List[int]", "None"
            }
        },

        testCases: [
            {
                input: String,
                expectedOutput: String,
                isHidden: { type: Boolean, default: false }, // Hidden test cases
            },
        ],

        // Execution Constraints
        timeLimit: {
            type: Number,
            default: 5, // Time limit in seconds
        },
        memoryLimit: {
            type: Number,
            default: 256000, // Memory limit in KB (256 MB)
        },

        // Metadata
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

const DSAProblem = mongoose.model('DSAProblem', dsaProblemSchema)

export default DSAProblem
