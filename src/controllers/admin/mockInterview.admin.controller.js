import { MockInterview } from '../../models/index.js'

/**
 * @route   GET /api/admin/mock-interviews
 * @desc    Get all mock interviews
 * @access  Admin
 */
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

/**
 * @route   GET /api/admin/mock-interviews/:id
 * @desc    Get single mock interview
 * @access  Admin
 */
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

/**
 * @route   POST /api/admin/mock-interviews
 * @desc    Create new mock interview
 * @access  Admin
 */
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

/**
 * @route   PUT /api/admin/mock-interviews/:id
 * @desc    Update mock interview
 * @access  Admin
 */
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

/**
 * @route   DELETE /api/admin/mock-interviews/:id
 * @desc    Delete mock interview
 * @access  Admin
 */
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

/**
 * @route   PATCH /api/admin/mock-interviews/:id/toggle-active
 * @desc    Toggle active status
 * @access  Admin
 */
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
