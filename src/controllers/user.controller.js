import { User } from '../models/index.js'

// Get user profile
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('targetCompanies', 'name logo averagePackage')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            })
        }

        res.json({
            success: true,
            data: user,
        })
    } catch (error) {
        console.error('Error fetching profile:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching profile',
            error: error.message,
        })
    }
}

// Update user profile
export const updateUserProfile = async (req, res) => {
    try {
        const allowedUpdates = [
            'name',
            'bio',
            'skills',
            'experience',
            'targetPackage',
            'targetCompanies',
            'preferences',
        ]

        const updates = {}
        Object.keys(req.body).forEach((key) => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key]
            }
        })

        const user = await User.findByIdAndUpdate(req.user._id, updates, {
            new: true,
            runValidators: true,
        }).select('-password')

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user,
        })
    } catch (error) {
        console.error('Error updating profile:', error)
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message,
        })
    }
}

// Upload resume
export const uploadResume = async (req, res) => {
    try {
        const { resumeUrl } = req.body

        if (!resumeUrl) {
            return res.status(400).json({
                success: false,
                message: 'Resume URL is required',
            })
        }

        const user = await User.findById(req.user._id)

        user.resume = {
            url: resumeUrl,
            uploadedAt: new Date(),
        }

        // TODO: Analyze resume
        // const analysis = await analyzeResume(resumeUrl)
        // user.resume.analysisScore = analysis.score
        // user.resume.recommendations = analysis.recommendations

        await user.save()

        res.json({
            success: true,
            message: 'Resume uploaded successfully',
            data: user.resume,
        })
    } catch (error) {
        console.error('Error uploading resume:', error)
        res.status(500).json({
            success: false,
            message: 'Error uploading resume',
            error: error.message,
        })
    }
}

// Get user statistics
export const getUserStats = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('stats')

        res.json({
            success: true,
            data: user.stats,
        })
    } catch (error) {
        console.error('Error fetching stats:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message,
        })
    }
}

// Update user streak
export const updateStreak = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const lastActive = user.stats.lastActiveDate
            ? new Date(user.stats.lastActiveDate)
            : null

        if (lastActive) {
            lastActive.setHours(0, 0, 0, 0)
            const daysDiff = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24))

            if (daysDiff === 0) {
                // Already active today
                return res.json({
                    success: true,
                    data: user.stats,
                })
            } else if (daysDiff === 1) {
                // Consecutive day
                user.stats.currentStreak += 1
            } else {
                // Streak broken
                user.stats.currentStreak = 1
            }
        } else {
            user.stats.currentStreak = 1
        }

        // Update longest streak
        if (user.stats.currentStreak > user.stats.longestStreak) {
            user.stats.longestStreak = user.stats.currentStreak
        }

        user.stats.lastActiveDate = new Date()
        await user.save()

        res.json({
            success: true,
            data: user.stats,
        })
    } catch (error) {
        console.error('Error updating streak:', error)
        res.status(500).json({
            success: false,
            message: 'Error updating streak',
            error: error.message,
        })
    }
}

// Get leaderboard
export const getLeaderboard = async (req, res) => {
    try {
        const { type = 'xp', limit = 100 } = req.query

        let sortField = 'stats.totalXP'
        if (type === 'streak') sortField = 'stats.currentStreak'
        else if (type === 'dsa') sortField = 'stats.dsaSolved'
        else if (type === 'dev') sortField = 'stats.devSolved'

        const users = await User.find({ isActive: true })
            .select('name profilePicture stats')
            .sort({ [sortField]: -1 })
            .limit(parseInt(limit))

        res.json({
            success: true,
            data: users,
        })
    } catch (error) {
        console.error('Error fetching leaderboard:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching leaderboard',
            error: error.message,
        })
    }
}
