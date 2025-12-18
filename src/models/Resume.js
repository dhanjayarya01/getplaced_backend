import mongoose from 'mongoose'

const resumeSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // File Storage
        resumeUrl: {
            type: String,
            required: true,
        },
        publicId: {
            type: String,
            required: true,
        },

        // Extracted Text
        rawText: {
            type: String,
            required: true,
        },
        cleanedText: {
            type: String,
            required: true,
        },

        // Structured Data
        parsedData: {
            name: String,
            email: String,
            phone: String,
            totalExperienceYears: {
                type: Number,
                default: 0,
            },

            skills: {
                languages: [String],
                frameworks: [String],
                databases: [String],
                tools: [String],
                other: [String],
            },

            experience: [
                {
                    company: String,
                    role: String,
                    duration: String,
                    techStack: [String],
                    highlights: [String],
                },
            ],

            projects: [
                {
                    name: String,
                    description: String,
                    techStack: [String],
                    complexity: {
                        type: String,
                        enum: ['basic', 'medium', 'advanced'],
                    },
                },
            ],

            education: [
                {
                    degree: String,
                    institution: String,
                    year: String,
                },
            ],

            strengthAreas: [String],
            potentialGaps: [String],
        },
    },
    {
        timestamps: true,
    }
)

// Index for faster queries
resumeSchema.index({ userId: 1, createdAt: -1 })

const Resume = mongoose.model('Resume', resumeSchema)

export default Resume
