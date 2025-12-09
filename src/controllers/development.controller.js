import { DevelopmentProblem, UserProgress, Submission } from '../models/index.js'

// Get all development problems with filters
export const getAllDevelopmentProblems = async (req, res) => {
    try {
        const {
            difficulty,
            technology, // Can be single or comma-separated
            topic, // Can be single or comma-separated
            type, // Can be single or comma-separated: 'coding', 'project', 'debugging', 'feature-implementation'
            company,
            status,
            page = 1,
            limit = 20,
            sort = '-createdAt',
        } = req.query

        const query = { isActive: true }

        if (difficulty) {
            const difficulties = difficulty.split(',')
            query.difficulty = difficulties.length > 1 ? { $in: difficulties } : difficulty
        }

        if (technology) {
            // Support multiple technologies: ?technology=React,Node.js
            const technologies = technology.split(',')
            query.primaryTechnology = technologies.length > 1 ? { $in: technologies } : technology
        }

        if (topic) {
            // Support multiple topics: ?topic=Hooks,State Management
            const topics = topic.split(',')
            query.topics = topics.length > 1 ? { $in: topics } : topic
        }

        if (type) {
            // Support multiple types: ?type=coding,project
            const types = type.split(',')
            query.type = types.length > 1 ? { $in: types } : type
        }

        if (company) query.companies = company

        let userProgress = []
        if (req.user) {
            userProgress = await UserProgress.find({
                user: req.user._id,
                problemType: 'development',
            }).select('problemId status')

            if (status) {
                const problemIds = userProgress
                    .filter((p) => p.status === status)
                    .map((p) => p.problemId)
                query._id = { $in: problemIds }
            }
        }

        const skip = (page - 1) * limit

        const problems = await DevelopmentProblem.find(query)
            .select('-codingProblem.solution -projectProblem.files') // Don't send solutions
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))

        const total = await DevelopmentProblem.countDocuments(query)

        const problemsWithProgress = problems.map((problem) => {
            const progress = userProgress.find(
                (p) => p.problemId.toString() === problem._id.toString()
            )
            return {
                ...problem.toObject(),
                userStatus: progress ? progress.status : 'not-started',
            }
        })

        res.json({
            success: true,
            data: problemsWithProgress,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error('Error fetching development problems:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching problems',
            error: error.message,
        })
    }
}

// Get single development problem
export const getDevelopmentProblem = async (req, res) => {
    try {
        const { id } = req.params

        const problem = await DevelopmentProblem.findOne({
            $or: [{ _id: id }, { slug: id }],
            isActive: true,
        }).select('-codingProblem.solution')

        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found',
            })
        }

        let userProgress = null
        let submissions = []
        if (req.user) {
            userProgress = await UserProgress.findOne({
                user: req.user._id,
                problemId: problem._id,
                problemType: 'development',
            })

            submissions = await Submission.find({
                user: req.user._id,
                problemId: problem._id,
                problemType: 'development',
            })
                .sort('-createdAt')
                .limit(10)
        }

        res.json({
            success: true,
            data: {
                problem,
                userProgress,
                recentSubmissions: submissions,
            },
        })
    } catch (error) {
        console.error('Error fetching development problem:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching problem',
            error: error.message,
        })
    }
}

// Submit solution for development problem
export const submitDevelopmentSolution = async (req, res) => {
    try {
        const { id } = req.params
        const { code, language } = req.body

        if (!code || !language) {
            return res.status(400).json({
                success: false,
                message: 'Code and language are required',
            })
        }

        const problem = await DevelopmentProblem.findById(id)
        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found',
            })
        }

        let userProgress = await UserProgress.findOne({
            user: req.user._id,
            problemId: problem._id,
            problemType: 'development',
        })

        if (!userProgress) {
            userProgress = new UserProgress({
                user: req.user._id,
                problemId: problem._id,
                problemType: 'development',
                status: 'attempted',
                firstAttemptDate: new Date(),
                totalAttempts: 0,
            })
        }

        userProgress.totalAttempts += 1

        const submission = new Submission({
            user: req.user._id,
            problemType: 'development',
            problemId: problem._id,
            code,
            language,
            attemptNumber: userProgress.totalAttempts,
            status: 'pending',
        })

        await submission.save()

        res.json({
            success: true,
            message: 'Solution submitted successfully',
            data: {
                submissionId: submission._id,
                status: submission.status,
            },
        })

        userProgress.save()
    } catch (error) {
        console.error('Error submitting solution:', error)
        res.status(500).json({
            success: false,
            message: 'Error submitting solution',
            error: error.message,
        })
    }
}

// Start project challenge (for project-based problems)
export const startProjectChallenge = async (req, res) => {
    try {
        const { id } = req.params

        const problem = await DevelopmentProblem.findById(id)
        if (!problem || problem.type !== 'project') {
            return res.status(404).json({
                success: false,
                message: 'Project challenge not found',
            })
        }

        // TODO: Initialize Docker container for this project
        // Return container ID and access URL

        res.json({
            success: true,
            message: 'Project environment initialized',
            data: {
                problemId: problem._id,
                files: problem.projectProblem.files,
                setupInstructions: problem.projectProblem.setupInstructions,
                tasks: problem.projectProblem.tasks,
                // containerUrl: 'http://localhost:3001', // Would be dynamic
            },
        })
    } catch (error) {
        console.error('Error starting project challenge:', error)
        res.status(500).json({
            success: false,
            message: 'Error starting project',
            error: error.message,
        })
    }
}

// Get development statistics
export const getDevelopmentStats = async (req, res) => {
    try {
        const userId = req.user._id

        const totalSolved = await UserProgress.countDocuments({
            user: userId,
            problemType: 'development',
            status: 'solved',
        })

        const totalAttempted = await UserProgress.countDocuments({
            user: userId,
            problemType: 'development',
            status: { $in: ['attempted', 'solved'] },
        })

        const solvedProblems = await UserProgress.find({
            user: userId,
            problemType: 'development',
            status: 'solved',
        }).populate('problemId', 'difficulty primaryTechnology topics type')

        const difficultyBreakdown = {
            Beginner: 0,
            Intermediate: 0,
            Advanced: 0,
        }

        const technologyBreakdown = {}
        const topicBreakdown = {}
        const typeBreakdown = {}

        solvedProblems.forEach((progress) => {
            if (progress.problemId) {
                difficultyBreakdown[progress.problemId.difficulty]++

                const tech = progress.problemId.primaryTechnology
                technologyBreakdown[tech] = (technologyBreakdown[tech] || 0) + 1

                progress.problemId.topics?.forEach((topic) => {
                    topicBreakdown[topic] = (topicBreakdown[topic] || 0) + 1
                })

                const type = progress.problemId.type
                typeBreakdown[type] = (typeBreakdown[type] || 0) + 1
            }
        })

        res.json({
            success: true,
            data: {
                totalSolved,
                totalAttempted,
                difficultyBreakdown,
                technologyBreakdown,
                topicBreakdown,
                typeBreakdown,
            },
        })
    } catch (error) {
        console.error('Error fetching development stats:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message,
        })
    }
}

// Admin: Create development problem
export const createDevelopmentProblem = async (req, res) => {
    try {
        const problem = new DevelopmentProblem(req.body)
        await problem.save()

        res.status(201).json({
            success: true,
            message: 'Problem created successfully',
            data: problem,
        })
    } catch (error) {
        console.error('Error creating development problem:', error)
        res.status(500).json({
            success: false,
            message: 'Error creating problem',
            error: error.message,
        })
    }
}

// Admin: Update development problem
export const updateDevelopmentProblem = async (req, res) => {
    try {
        const { id } = req.params

        const problem = await DevelopmentProblem.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        })

        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found',
            })
        }

        res.json({
            success: true,
            message: 'Problem updated successfully',
            data: problem,
        })
    } catch (error) {
        console.error('Error updating development problem:', error)
        res.status(500).json({
            success: false,
            message: 'Error updating problem',
            error: error.message,
        })
    }
}

// Admin: Delete development problem
export const deleteDevelopmentProblem = async (req, res) => {
    try {
        const { id } = req.params

        const problem = await DevelopmentProblem.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        )

        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found',
            })
        }

        res.json({
            success: true,
            message: 'Problem deleted successfully',
        })
    } catch (error) {
        console.error('Error deleting development problem:', error)
        res.status(500).json({
            success: false,
            message: 'Error deleting problem',
            error: error.message,
        })
    }
}
