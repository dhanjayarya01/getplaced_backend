import multer from 'multer'
import fs from 'fs'
import cloudinary from '../config/cloudinary.js'
import { Resume, User } from '../models/index.js'
import { extractTextFromPDF, structureResumeWithAI } from '../services/resume.service.js'

// Configure multer for temporary file storage
const upload = multer({
    dest: 'uploads/temp/',
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true)
        } else {
            cb(new Error('Only PDF files are allowed'))
        }
    },
})

// Export multer middleware
export const uploadMiddleware = upload.single('resume')

/**
 * Upload and parse resume
 * POST /api/resume/upload
 */
export const uploadResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
            })
        }

        const userId = req.user._id
        const filePath = req.file.path

        // Step 1: Extract text from PDF
        const fileBuffer = fs.readFileSync(filePath)
        const { rawText, cleanedText } = await extractTextFromPDF(fileBuffer)

        // Step 2: Upload PDF to Cloudinary
        const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
            resource_type: 'raw',
            folder: 'resumes',
            public_id: `resume_${userId}_${Date.now()}`,
        })

        // Step 3: Structure resume with AI
        const parsedData = await structureResumeWithAI(cleanedText)

        // Step 4: Save resume to database
        const resume = await Resume.create({
            userId,
            resumeUrl: cloudinaryResult.secure_url,
            publicId: cloudinaryResult.public_id,
            rawText,
            cleanedText,
            parsedData,
        })

        // Step 5: Update user's resume reference
        await User.findByIdAndUpdate(userId, {
            resume: resume._id,
        })

        // Step 6: Clean up temporary file
        fs.unlinkSync(filePath)

        res.json({
            success: true,
            message: 'Resume uploaded and parsed successfully',
            data: resume,
        })
    } catch (error) {
        // Clean up temp file on error
        if (req.file?.path) {
            try {
                fs.unlinkSync(req.file.path)
            } catch (unlinkError) {
                console.error('Failed to delete temp file:', unlinkError)
            }
        }

        console.error('Resume upload error:', error)
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upload resume',
        })
    }
}

/**
 * Get user's resume
 * GET /api/resume
 */
export const getUserResume = async (req, res) => {
    try {
        const userId = req.user._id

        const resume = await Resume.findOne({ userId }).sort({ createdAt: -1 })

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: 'No resume found',
            })
        }

        res.json({
            success: true,
            data: resume,
        })
    } catch (error) {
        console.error('Get resume error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch resume',
        })
    }
}

/**
 * Update resume parsed data
 * PUT /api/resume/:id
 */
export const updateResume = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user._id
        const { parsedData } = req.body

        const resume = await Resume.findOne({ _id: id, userId })

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: 'Resume not found',
            })
        }

        resume.parsedData = { ...resume.parsedData, ...parsedData }
        await resume.save()

        res.json({
            success: true,
            message: 'Resume updated successfully',
            data: resume,
        })
    } catch (error) {
        console.error('Update resume error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to update resume',
        })
    }
}

/**
 * Delete resume
 * DELETE /api/resume/:id
 */
export const deleteResume = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user._id

        const resume = await Resume.findOne({ _id: id, userId })

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: 'Resume not found',
            })
        }

        // Delete from Cloudinary
        try {
            await cloudinary.uploader.destroy(resume.publicId, { resource_type: 'raw' })
        } catch (cloudinaryError) {
            console.error('Cloudinary deletion error:', cloudinaryError)
        }

        // Delete from database
        await Resume.findByIdAndDelete(id)

        // Remove reference from user
        await User.findByIdAndUpdate(userId, { resume: null })

        res.json({
            success: true,
            message: 'Resume deleted successfully',
        })
    } catch (error) {
        console.error('Delete resume error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to delete resume',
        })
    }
}
