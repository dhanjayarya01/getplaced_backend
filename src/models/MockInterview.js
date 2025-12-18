import mongoose from 'mongoose'

const mockInterviewSchema = new mongoose.Schema(
    {
        // Basic Info
        title: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
        },
        icon: {
            type: String, // emoji or icon name
            default: '🎤',
        },
        description: {
            type: String,
            required: true,
        },

        // Interview Type
        codingType: {
            type: Boolean,
            required: true,
            default: false, // false = behavioral/HR, true = coding/technical
        },

        // Overall Duration
        duration: {
            type: Number, // in minutes
            required: true,
        },

        // Interview Stages Configuration
        interviewStages: [
            {
                stage: {
                    type: Number, // 1, 2, 3, etc.
                    required: true,
                },
                stageName: {
                    type: String, // "Introduction", "Technical Round", "HR Round"
                    required: true,
                },
                difficulty: {
                    type: String,
                    enum: ['Easy', 'Medium', 'Hard'],
                    required: true,
                },
                strictness: {
                    type: Number,
                    min: 0,
                    max: 10,
                    required: true,
                },
                duration: {
                    type: Number, // in minutes for this stage
                    required: true,
                },
                topics: [String], // Topics covered in this stage
            },
        ],

        // Metadata
        tags: [String],
        companies: [String], // Companies that use this interview pattern

        // Stats
        timesAttempted: {
            type: Number,
            default: 0,
        },
        averageScore: {
            type: Number,
            default: 0,
        },

        // Status
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
)

// Indexes
mockInterviewSchema.index({ title: 1 })
mockInterviewSchema.index({ codingType: 1 })
mockInterviewSchema.index({ isActive: 1 })

const MockInterview = mongoose.model('MockInterview', mockInterviewSchema)

export default MockInterview
