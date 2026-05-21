import mongoose from 'mongoose'

const testCaseSchema = {
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: false },
}

const languageRunnerSchema = {
    /** Full Judge0 program with ___USER_CODE___ where the user's Solution lives */
    template: { type: String, required: true },
}

const dsaProblemSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, unique: true },
        problemNumber: { type: Number, required: true, unique: true },
        slug: { type: String, required: true, unique: true, lowercase: true },
        description: { type: String, required: true },
        difficulty: {
            type: String,
            enum: ['Easy', 'Medium', 'Hard'],
            required: true,
        },

        dataStructures: [{ type: String }],
        patterns: [{ type: String }],

        constraints: [String],
        examples: [
            {
                input: String,
                output: String,
                explanation: String,
            },
        ],

        /** Editor template — user edits ONLY this (Solution class / function) */
        starterCode: {
            javascript: String,
            python: String,
            java: String,
            cpp: String,
            c: String,
        },

        /**
         * Per-language full runnable harness (stored in DB, injected at runtime).
         * Not sent to the client API.
         */
        runners: {
            javascript: languageRunnerSchema,
            python: languageRunnerSchema,
            java: languageRunnerSchema,
            cpp: languageRunnerSchema,
            c: languageRunnerSchema,
        },

        testCases: [testCaseSchema],

        timeLimit: { type: Number, default: 5 },
        memoryLimit: { type: Number, default: 256000 },

        acceptance: { type: Number, min: 0, max: 100 },
        totalSubmissions: { type: Number, default: 0 },
        totalAccepted: { type: Number, default: 0 },

        relatedProblems: [
            { type: mongoose.Schema.Types.ObjectId, ref: 'DSAProblem' },
        ],
        companies: [
            { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
        ],

        isActive: { type: Boolean, default: true },
        isPremium: { type: Boolean, default: false },
    },
    { timestamps: true }
)

dsaProblemSchema.pre('save', function (next) {
    if (this.isModified('slug') && this.slug) {
        this.slug = this.slug.replace(/-/g, '').trim().toLowerCase()
    }
    next()
})

dsaProblemSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate()
    if (update?.slug) {
        update.slug = update.slug.replace(/-/g, '').trim().toLowerCase()
    }
    next()
})

// Note: slug and problemNumber indexes are auto-created by unique:true on the fields above
dsaProblemSchema.index({ difficulty: 1 })
dsaProblemSchema.index({ isActive: 1 })


const DSAProblem = mongoose.model('DSAProblem', dsaProblemSchema)

export default DSAProblem
