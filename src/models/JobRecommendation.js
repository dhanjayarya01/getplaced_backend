import mongoose from 'mongoose'

// Stores the ML model's evaluation of a specific user ↔ job pair.
// Only "recommended" pairs (match_score >= threshold) are stored here.
const jobRecommendationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Job',
            required: true,
        },

        // ── ML Score ───────────────────────────────────────────────────────
        matchScore:   { type: Number, required: true, min: 0, max: 1 },  // 0.0 – 1.0
        isRecommended: { type: Boolean, default: true },

        // ── Status ─────────────────────────────────────────────────────────
        isViewed:    { type: Boolean, default: false },
        isSaved:     { type: Boolean, default: false },
        isApplied:   { type: Boolean, default: false },
        appliedAt:   { type: Date },

        // ── Which job-sync batch this came from ────────────────────────────
        batchDate:   { type: Date, default: Date.now },
    },
    { timestamps: true }
)

// Prevent duplicate recommendations for the same user+job pair per batch
jobRecommendationSchema.index({ userId: 1, jobId: 1, batchDate: 1 }, { unique: true })
jobRecommendationSchema.index({ userId: 1, matchScore: -1 })   // sort by score

const JobRecommendation = mongoose.model('JobRecommendation', jobRecommendationSchema)
export default JobRecommendation
