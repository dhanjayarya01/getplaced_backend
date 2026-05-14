import mongoose from 'mongoose'

const jobSchema = new mongoose.Schema(
    {
        // ── Identification ──────────────────────────────────────────────────
        externalId: { type: String },          // ID from source API/scraper
        source: {
            type: String,
            enum: ['linkedin', 'indeed', 'remoteok', 'greenhouse', 'lever', 'workable', 'scraped', 'manual'],
            required: true,
        },

        // ── Core Info ───────────────────────────────────────────────────────
        title:       { type: String, required: true, index: true },
        company:     { type: String, required: true, index: true },
        location:    { type: String, default: 'Remote' },
        isRemote:    { type: Boolean, default: false },
        url:         { type: String },
        description: { type: String, required: true },   // full text — used by ML

        // ── Structured fields ────────────────────────────────────────────────
        skills:      [String],
        experienceLevel: {
            type: String,
            enum: ['internship', 'entry', 'mid', 'senior', 'lead', 'any'],
            default: 'any',
        },
        jobType: {
            type: String,
            enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship'],
            default: 'full-time',
        },
        salary: {
            min:      { type: Number },
            max:      { type: Number },
            currency: { type: String, default: 'USD' },
            period:   { type: String, default: 'year' },
        },

        // ── Meta ────────────────────────────────────────────────────────────
        postedAt:   { type: Date },
        fetchedAt:  { type: Date, default: Date.now },
        isActive:   { type: Boolean, default: true },

        // dedup fingerprint: hash of title+company+url
        fingerprint: { type: String, unique: true, sparse: true },
    },
    { timestamps: true }
)

jobSchema.index({ source: 1, fetchedAt: -1 })
jobSchema.index({ title: 'text', description: 'text', skills: 'text' })  // full-text search

const Job = mongoose.model('Job', jobSchema)
export default Job
