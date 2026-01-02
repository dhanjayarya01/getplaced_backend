import Company from '../models/Company.js'
import UserProgress from '../models/UserProgress.js'
import Resume from '../models/Resume.js'
import User from '../models/User.js'

export const startCompanyInterview = async (req, res) => {
    try {
        const { companyId } = req.params // This is actually a slug
        const { roleIndex } = req.body
        const userId = req.user._id

        const company = await Company.findOne({ slug: companyId })
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' })
        }

        if (!company.rolesData || roleIndex >= company.rolesData.length) {
            return res.status(400).json({ success: false, message: 'Invalid role index' })
        }

        const role = company.rolesData[roleIndex]
        const totalRounds = role.hiringPipeline?.length || 0

        let userProgress = await UserProgress.findOne({ user: userId })
        if (!userProgress) {
            userProgress = new UserProgress({ user: userId, companyInterviewProgress: [] })
        }

        let companyProgress = userProgress.companyInterviewProgress.find(
            cp => cp.company.toString() === company._id.toString() && cp.roleIndex === roleIndex
        )

        if (!companyProgress) {

            companyProgress = {
                company: company._id, // Use ObjectId, not slug
                roleIndex,
                roleName: role.roleName,
                roundProgress: [],
                currentRound: 1,
                totalRounds,
                completedRounds: 0,
                startedAt: new Date(),
                isActive: true
            }
            userProgress.companyInterviewProgress.push(companyProgress)
        }

        await userProgress.save()

        res.json({
            success: true,
            message: 'Interview started',
            data: {
                progress: companyProgress,
                currentRound: role.hiringPipeline[companyProgress.currentRound - 1]
            }
        })
    } catch (error) {
        console.error('Error starting company interview:', error)
        res.status(500).json({ success: false, message: 'Server error', error: error.message })
    }
}

export const submitInterviewRound = async (req, res) => {
    try {
        const { companyId } = req.params // This is actually a slug
        const { roleIndex, roundNumber, score, feedback, areasGoodIn, areasToWorkOn, problemsAsked } = req.body
        const userId = req.user._id

        const company = await Company.findOne({ slug: companyId })
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' })
        }

        const role = company.rolesData[roleIndex]
        const round = role.hiringPipeline.find(r => r.roundNumber === roundNumber)

        if (!round) {
            return res.status(400).json({ success: false, message: 'Invalid round number' })
        }

        const userProgress = await UserProgress.findOne({ user: userId })
        if (!userProgress) {
            return res.status(404).json({ success: false, message: 'Progress not found' })
        }

        const companyProgress = userProgress.companyInterviewProgress.find(
            cp => cp.company.toString() === company._id.toString() && cp.roleIndex === roleIndex
        )

        if (!companyProgress) {
            return res.status(404).json({ success: false, message: 'Company progress not found' })
        }

        let roundProgress = companyProgress.roundProgress.find(rp => rp.roundNumber === roundNumber)

        if (!roundProgress) {
            roundProgress = {
                roundNumber,
                roundName: round.roundName,
                roundType: round.roundType,
                completed: false,
                attemptedAt: new Date()
            }
            companyProgress.roundProgress.push(roundProgress)
        }

        roundProgress.score = score
        roundProgress.feedback = feedback
        roundProgress.areasGoodIn = areasGoodIn || []
        roundProgress.areasToWorkOn = areasToWorkOn || []
        roundProgress.completed = true
        roundProgress.attemptedAt = new Date()
        if (problemsAsked) {
            roundProgress.problemsAsked = problemsAsked
        }

        const completedRounds = companyProgress.roundProgress.filter(rp => rp.completed).length
        companyProgress.completedRounds = completedRounds

        const totalScore = companyProgress.roundProgress
            .filter(rp => rp.completed && rp.score)
            .reduce((sum, rp) => sum + rp.score, 0)
        companyProgress.overallScore = completedRounds > 0 ? totalScore / completedRounds : 0

        const passed = score >= (round.passingCriteria?.minimumScore || 70)

        if (passed && roundNumber < role.hiringPipeline.length) {
            companyProgress.currentRound = roundNumber + 1
        }

        companyProgress.lastAttemptedAt = new Date()

        await userProgress.save()

        res.json({
            success: true,
            message: passed ? 'Round completed! Next round unlocked.' : 'Round completed.',
            data: {
                passed,
                progress: companyProgress,
                nextRound: passed && roundNumber < role.hiringPipeline.length
                    ? role.hiringPipeline[roundNumber]
                    : null
            }
        })
    } catch (error) {
        console.error('Error submitting interview round:', error)
        res.status(500).json({ success: false, message: 'Server error', error: error.message })
    }
}

export const getCompanyInterviewProgress = async (req, res) => {
    try {
        const { companyId } = req.params
        const { roleIndex } = req.query
        const userId = req.user._id

        const userProgress = await UserProgress.findOne({ user: userId })
            .populate('companyInterviewProgress.company', 'name logo slug')
            .populate('companyInterviewProgress.roundProgress.problemsAsked', 'title difficulty problemNumber')

        if (!userProgress) {
            return res.json({
                success: true,
                data: null,
                message: 'No progress found'
            })
        }

        const companyProgress = userProgress.companyInterviewProgress.find(
            cp => cp.company._id.toString() === companyId && cp.roleIndex === parseInt(roleIndex)
        )

        res.json({
            success: true,
            data: companyProgress || null
        })
    } catch (error) {
        console.error('Error fetching interview progress:', error)
        res.status(500).json({ success: false, message: 'Server error', error: error.message })
    }
}

export const getUserResumeForInterview = async (req, res) => {
    try {
        const userId = req.user._id

        console.log('🔍 Looking for resume with userId:', userId)

        const user = await User.findById(userId).populate('resume')

        console.log('👤 User found:', user ? 'YES' : 'NO')
        console.log('📄 User has resume reference:', user?.resume ? 'YES' : 'NO')

        if (!user || !user.resume) {
            console.log('❌ No resume found')
            return res.json({
                success: true,
                data: null,
                message: 'No resume found'
            })
        }

        console.log('✅ Resume loaded:', user.resume._id)

        res.json({
            success: true,
            data: user.resume
        })
    } catch (error) {
        console.error('Error fetching resume:', error)
        res.status(500).json({ success: false, message: 'Server error', error: error.message })
    }
}
