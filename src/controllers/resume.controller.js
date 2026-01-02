import multer from 'multer'
import fs from 'fs'
import cloudinary from '../config/cloudinary.js'
import { Resume, User } from '../models/index.js'
import { extractTextFromPDF, structureResumeWithAI } from '../services/resume.service.js'

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

export const uploadMiddleware = upload.single('resume')

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

        const fileBuffer = fs.readFileSync(filePath)
        const { rawText, cleanedText } = await extractTextFromPDF(fileBuffer)

        const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
            resource_type: 'raw',
            folder: 'resumes',
            public_id: `resume_${userId}_${Date.now()}`,
        })

        const parsedData = await structureResumeWithAI(cleanedText)

        const resume = await Resume.create({
            userId,
            resumeUrl: cloudinaryResult.secure_url,
            publicId: cloudinaryResult.public_id,
            rawText,
            cleanedText,
            parsedData,
        })

        await User.findByIdAndUpdate(userId, {
            resume: resume._id,
        })

        fs.unlinkSync(filePath)

        res.json({
            success: true,
            message: 'Resume uploaded and parsed successfully',
            data: resume,
        })
    } catch (error) {

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

        try {
            await cloudinary.uploader.destroy(resume.publicId, { resource_type: 'raw' })
        } catch (cloudinaryError) {
            console.error('Cloudinary deletion error:', cloudinaryError)
        }

        await Resume.findByIdAndDelete(id)

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
