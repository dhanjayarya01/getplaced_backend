import {
    DSAProblem,
    DevelopmentProblem,
    MockInterview,
    Company,
    User,
    Submission,
    UserProgress,
    CompanyApplication,
    MockInterviewSession,
} from '../models/index.js'

export const getAdminDashboard = async (req, res) => {
    try {
        const stats = {
            users: {
                total: await User.countDocuments(),
                active: await User.countDocuments({ isActive: true }),
                admins: await User.countDocuments({ role: 'admin' }),
            },
            problems: {
                dsa: await DSAProblem.countDocuments({ isActive: true }),
                development: await DevelopmentProblem.countDocuments({ isActive: true }),
                mockInterviews: await MockInterview.countDocuments({ isActive: true }),
            },
            companies: {
                total: await Company.countDocuments({ isActive: true }),
                hiring: await Company.countDocuments({ isHiring: true }),
            },
            activity: {
                totalSubmissions: await Submission.countDocuments(),
                totalApplications: await CompanyApplication.countDocuments(),
                activeSessions: await MockInterviewSession.countDocuments({ status: 'in-progress' }),
            },
        }

        res.json({
            success: true,
            data: stats,
        })
    } catch (error) {
        console.error('Error fetching admin dashboard:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard',
            error: error.message,
        })
    }
}

export const getDSAFilters = async (req, res) => {
    try {
        const filters = await DSAProblem.aggregate([
            { $match: { isActive: true } },
            {
                $facet: {
                    difficulties: [
                        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
                        { $sort: { _id: 1 } },
                    ],
                    dataStructures: [
                        { $unwind: '$dataStructures' },
                        { $group: { _id: '$dataStructures', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                    ],
                    patterns: [
                        { $unwind: '$patterns' },
                        { $group: { _id: '$patterns', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                    ],
                    companies: [
                        { $unwind: '$companies' },
                        { $group: { _id: '$companies', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 20 }, // Top 20 companies
                    ],
                },
            },
        ])

        res.json({
            success: true,
            data: filters[0],
        })
    } catch (error) {
        console.error('Error fetching DSA filters:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching filters',
            error: error.message,
        })
    }
}

export const getDevelopmentFilters = async (req, res) => {
    try {
        const filters = await DevelopmentProblem.aggregate([
            { $match: { isActive: true } },
            {
                $facet: {
                    difficulties: [
                        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
                        { $sort: { _id: 1 } },
                    ],
                    technologies: [
                        { $group: { _id: '$primaryTechnology', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                    ],
                    topics: [
                        { $unwind: '$topics' },
                        { $group: { _id: '$topics', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                    ],
                    types: [
                        { $group: { _id: '$type', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                    ],
                    companies: [
                        { $unwind: '$companies' },
                        { $group: { _id: '$companies', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 20 },
                    ],
                },
            },
        ])

        res.json({
            success: true,
            data: filters[0],
        })
    } catch (error) {
        console.error('Error fetching development filters:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching filters',
            error: error.message,
        })
    }
}

export const getMockInterviewFilters = async (req, res) => {
    try {
        const filters = await MockInterview.aggregate([
            { $match: { isActive: true } },
            {
                $facet: {
                    types: [
                        { $group: { _id: '$type', count: { $sum: 1 } } },
                        { $sort: { _id: 1 } },
                    ],
                    subTypes: [
                        { $group: { _id: '$subType', count: { $sum: 1 } } },
                        { $match: { _id: { $ne: null } } },
                        { $sort: { count: -1 } },
                    ],
                    difficulties: [
                        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
                        { $sort: { _id: 1 } },
                    ],
                    packageRanges: [
                        {
                            $group: {
                                _id: null,
                                minPackage: { $min: '$packageRange.min' },
                                maxPackage: { $max: '$packageRange.max' },
                            },
                        },
                    ],
                },
            },
        ])

        res.json({
            success: true,
            data: filters[0],
        })
    } catch (error) {
        console.error('Error fetching mock interview filters:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching filters',
            error: error.message,
        })
    }
}

export const getCompanyFilters = async (req, res) => {
    try {
        const filters = await Company.aggregate([
            { $match: { isActive: true } },
            {
                $facet: {
                    difficulties: [
                        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
                        { $sort: { _id: 1 } },
                    ],
                    locations: [
                        { $unwind: '$locations' },
                        { $group: { _id: '$locations', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                    ],
                    industries: [
                        { $group: { _id: '$industry', count: { $sum: 1 } } },
                        { $match: { _id: { $ne: null } } },
                        { $sort: { count: -1 } },
                    ],
                    packageRanges: [
                        {
                            $group: {
                                _id: null,
                                minPackage: { $min: '$averagePackage.min' },
                                maxPackage: { $max: '$averagePackage.max' },
                            },
                        },
                    ],
                },
            },
        ])

        res.json({
            success: true,
            data: filters[0],
        })
    } catch (error) {
        console.error('Error fetching company filters:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching filters',
            error: error.message,
        })
    }
}

export const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, role, isActive } = req.query

        const query = {}
        if (role) query.role = role
        if (isActive !== undefined) query.isActive = isActive === 'true'

        const skip = (page - 1) * limit

        const users = await User.find(query)
            .select('-password')
            .sort('-createdAt')
            .skip(skip)
            .limit(parseInt(limit))

        const total = await User.countDocuments(query)

        res.json({
            success: true,
            data: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error('Error fetching users:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message,
        })
    }
}

export const updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params
        const { role } = req.body

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be "user" or "admin"',
            })
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true }
        ).select('-password')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        res.json({
            success: true,
            message: 'User role updated successfully',
            data: user,
        })
    } catch (error) {
        console.error('Error updating user role:', error)
        res.status(500).json({
            success: false,
            message: 'Error updating user role',
            error: error.message,
        })
    }
}

export const deactivateUser = async (req, res) => {
    try {
        const { userId } = req.params

        const user = await User.findByIdAndUpdate(
            userId,
            { isActive: false },
            { new: true }
        ).select('-password')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        res.json({
            success: true,
            message: 'User deactivated successfully',
            data: user,
        })
    } catch (error) {
        console.error('Error deactivating user:', error)
        res.status(500).json({
            success: false,
            message: 'Error deactivating user',
            error: error.message,
        })
    }
}

export const getPlatformStats = async (req, res) => {
    try {

        const totalUsers = await User.countDocuments()
        const activeUsers = await User.countDocuments({ isActive: true })

        const dsaProblems = await DSAProblem.countDocuments({ isActive: true })
        const devProblems = await DevelopmentProblem.countDocuments({ isActive: true })
        const mockQuestions = await MockInterview.countDocuments({ isActive: true })

        const totalSubmissions = await Submission.countDocuments()
        const acceptedSubmissions = await Submission.countDocuments({ isAccepted: true })
        const totalApplications = await CompanyApplication.countDocuments()
        const completedSessions = await MockInterviewSession.countDocuments({ status: 'completed' })

        const topUsers = await User.find({ isActive: true })
            .select('name profilePicture stats.totalXP')
            .sort('-stats.totalXP')
            .limit(10)

        res.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                },
                problems: {
                    dsa: dsaProblems,
                    development: devProblems,
                    mockInterviews: mockQuestions,
                    total: dsaProblems + devProblems + mockQuestions,
                },
                activity: {
                    submissions: {
                        total: totalSubmissions,
                        accepted: acceptedSubmissions,
                        acceptanceRate: totalSubmissions > 0
                            ? ((acceptedSubmissions / totalSubmissions) * 100).toFixed(2)
                            : 0,
                    },
                    applications: totalApplications,
                    completedSessions,
                },
                topUsers,
            },
        })
    } catch (error) {
        console.error('Error fetching platform stats:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message,
        })
    }
}
