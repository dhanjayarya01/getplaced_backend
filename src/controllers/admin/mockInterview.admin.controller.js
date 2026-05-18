import { MockInterview } from '../../models/index.js'
import cloudinary from '../../config/cloudinary.js'
import fs from 'fs'
import multer from 'multer'

const upload = multer({
    dest: 'uploads/temp/',
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true)
        } else {
            cb(new Error('Only image files are allowed'))
        }
    },
})

export const uploadImageMiddleware = upload.single('image')

export const uploadMockInterviewImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image uploaded',
            })
        }

        const filePath = req.file.path

        const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
            folder: 'mock_interviews',
        })

        // Clean up temp file
        fs.unlinkSync(filePath)

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            imageUrl: cloudinaryResult.secure_url,
        })
    } catch (error) {
        if (req.file?.path) {
            try {
                fs.unlinkSync(req.file.path)
            } catch (unlinkError) {
                console.error('Failed to delete temp file:', unlinkError)
            }
        }
        console.error('Upload mock interview image error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: error.message,
        })
    }
}

export const getAllMockInterviews = async (req, res) => {
    try {
        const { codingType, isActive, page = 1, limit = 20 } = req.query

        const query = {}
        if (codingType !== undefined) query.codingType = codingType === 'true'
        if (isActive !== undefined) query.isActive = isActive === 'true'

        const mockInterviews = await MockInterview.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))

        const total = await MockInterview.countDocuments(query)

        res.json({
            success: true,
            data: mockInterviews,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error('Get mock interviews error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch mock interviews',
            error: error.message,
        })
    }
}

export const getMockInterviewById = async (req, res) => {
    try {
        const mockInterview = await MockInterview.findById(req.params.id)

        if (!mockInterview) {
            return res.status(404).json({
                success: false,
                message: 'Mock interview not found',
            })
        }

        res.json({
            success: true,
            data: mockInterview,
        })
    } catch (error) {
        console.error('Get mock interview error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch mock interview',
            error: error.message,
        })
    }
}

export const createMockInterview = async (req, res) => {
    try {
        const mockInterview = new MockInterview(req.body)
        await mockInterview.save()

        res.status(201).json({
            success: true,
            message: 'Mock interview created successfully',
            data: mockInterview,
        })
    } catch (error) {
        console.error('Create mock interview error:', error)
        res.status(400).json({
            success: false,
            message: 'Failed to create mock interview',
            error: error.message,
        })
    }
}

export const updateMockInterview = async (req, res) => {
    try {
        const mockInterview = await MockInterview.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        })

        if (!mockInterview) {
            return res.status(404).json({
                success: false,
                message: 'Mock interview not found',
            })
        }

        res.json({
            success: true,
            message: 'Mock interview updated successfully',
            data: mockInterview,
        })
    } catch (error) {
        console.error('Update mock interview error:', error)
        res.status(400).json({
            success: false,
            message: 'Failed to update mock interview',
            error: error.message,
        })
    }
}

export const deleteMockInterview = async (req, res) => {
    try {
        const mockInterview = await MockInterview.findByIdAndDelete(req.params.id)

        if (!mockInterview) {
            return res.status(404).json({
                success: false,
                message: 'Mock interview not found',
            })
        }

        res.json({
            success: true,
            message: 'Mock interview deleted successfully',
        })
    } catch (error) {
        console.error('Delete mock interview error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to delete mock interview',
            error: error.message,
        })
    }
}

export const toggleActiveStatus = async (req, res) => {
    try {
        const mockInterview = await MockInterview.findById(req.params.id)

        if (!mockInterview) {
            return res.status(404).json({
                success: false,
                message: 'Mock interview not found',
            })
        }

        mockInterview.isActive = !mockInterview.isActive
        await mockInterview.save()

        res.json({
            success: true,
            message: `Mock interview ${mockInterview.isActive ? 'activated' : 'deactivated'}`,
            data: mockInterview,
        })
    } catch (error) {
        console.error('Toggle active status error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to toggle active status',
            error: error.message,
        })
    }
}
