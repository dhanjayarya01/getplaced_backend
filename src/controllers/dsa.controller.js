import { DSAProblem, UserProgress, Submission } from '../models/index.js'

// Get all DSA problems with filters
export const getAllDSAProblems = async (req, res) => {
    try {
        const {
            difficulty,
            dataStructure, // Can be single or comma-separated
            pattern, // Can be single or comma-separated
            company,
            status, // 'solved', 'attempted', 'not-started'
            page = 1,
            limit = 20,
            sort = '-createdAt',
        } = req.query

        const query = { isActive: true }

        // Apply filters
        if (difficulty) {
            // Support multiple difficulties: ?difficulty=Easy,Medium
            const difficulties = difficulty.split(',')
            query.difficulty = difficulties.length > 1 ? { $in: difficulties } : difficulty
        }

        if (dataStructure) {
            // Support multiple data structures: ?dataStructure=Array,String
            const dataStructures = dataStructure.split(',')
            query.dataStructures = dataStructures.length > 1 ? { $in: dataStructures } : dataStructure
        }

        if (pattern) {
            // Support multiple patterns: ?pattern=Two Pointers,Sliding Window
            const patterns = pattern.split(',')
            query.patterns = patterns.length > 1 ? { $in: patterns } : pattern
        }

        if (company) {
            query.companies = company
        }

        // If user is authenticated, get their progress
        let userProgress = []
        if (req.user) {
            userProgress = await UserProgress.find({
                user: req.user._id,
                problemType: 'dsa',
            }).select('problemId status')

            // Filter by status if requested
            if (status) {
                const problemIds = userProgress
                    .filter((p) => p.status === status)
                    .map((p) => p.problemId)
                query._id = { $in: problemIds }
            }
        }

        const skip = (page - 1) * limit

        const problems = await DSAProblem.find(query)
            .select('-solution -testCases') // Don't send solution and hidden test cases
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))

        const total = await DSAProblem.countDocuments(query)

        // Attach user progress to each problem
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
        console.error('Error fetching DSA problems:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching problems',
            error: error.message,
        })
    }
}

// Get single DSA problem by ID or slug
export const getDSAProblem = async (req, res) => {
    try {
        const { id } = req.params

        // Build query - check if id is a valid ObjectId
        let query = { isActive: true }

        // Check if id is a valid MongoDB ObjectId (24 hex characters)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id)

        if (isValidObjectId) {
            // If valid ObjectId, search by both _id and slug
            query.$or = [{ _id: id }, { slug: id }]
        } else {
            // If not valid ObjectId, only search by slug
            query.slug = id
        }

        const problem = await DSAProblem.findOne(query).select('-solution') // Don't send solution initially

        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found',
            })
        }

        // Get user progress if authenticated
        let userProgress = null
        let submissions = []
        if (req.user) {
            userProgress = await UserProgress.findOne({
                user: req.user._id,
                problemId: problem._id,
                problemType: 'dsa',
            })

            submissions = await Submission.find({
                user: req.user._id,
                problemId: problem._id,
                problemType: 'dsa',
            })
                .sort('-createdAt')
                .limit(10)
                .select('-code') // Don't send full code in list
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
        console.error('Error fetching DSA problem:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching problem',
            error: error.message,
        })
    }
}

// Submit solution for DSA problem
export const submitDSASolution = async (req, res) => {
    try {
        const { id } = req.params
        const { code, language } = req.body

        if (!code || !language) {
            return res.status(400).json({
                success: false,
                message: 'Code and language are required',
            })
        }

        const problem = await DSAProblem.findById(id)
        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found',
            })
        }

        // Get or create user progress
        let userProgress = await UserProgress.findOne({
            user: req.user._id,
            problemId: problem._id,
            problemType: 'dsa',
        })

        if (!userProgress) {
            userProgress = new UserProgress({
                user: req.user._id,
                problemId: problem._id,
                problemType: 'dsa',
                status: 'attempted',
                firstAttemptDate: new Date(),
                totalAttempts: 0,
            })
        }

        userProgress.totalAttempts += 1

        // Create submission
        const submission = new Submission({
            user: req.user._id,
            problemType: 'dsa',
            problemId: problem._id,
            code,
            language,
            attemptNumber: userProgress.totalAttempts,
            status: 'pending',
        })

        await submission.save()

        // TODO: Integrate with code execution engine (Judge0 or custom)
        // For now, we'll simulate execution
        // In production, this would be handled by a queue/worker

        res.json({
            success: true,
            message: 'Solution submitted successfully',
            data: {
                submissionId: submission._id,
                status: submission.status,
            },
        })

        // Save progress asynchronously
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

// Get submission result
export const getSubmissionResult = async (req, res) => {
    try {
        const { submissionId } = req.params

        const submission = await Submission.findOne({
            _id: submissionId,
            user: req.user._id,
        })

        if (!submission) {
            return res.status(404).json({
                success: false,
                message: 'Submission not found',
            })
        }

        res.json({
            success: true,
            data: submission,
        })
    } catch (error) {
        console.error('Error fetching submission:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching submission',
            error: error.message,
        })
    }
}

// Get user's DSA statistics
export const getDSAStats = async (req, res) => {
    try {
        const userId = req.user._id

        const totalSolved = await UserProgress.countDocuments({
            user: userId,
            problemType: 'dsa',
            status: 'solved',
        })

        const totalAttempted = await UserProgress.countDocuments({
            user: userId,
            problemType: 'dsa',
            status: { $in: ['attempted', 'solved'] },
        })

        // Get difficulty breakdown
        const solvedProblems = await UserProgress.find({
            user: userId,
            problemType: 'dsa',
            status: 'solved',
        }).populate('problemId', 'difficulty dataStructures patterns')

        const difficultyBreakdown = {
            Easy: 0,
            Medium: 0,
            Hard: 0,
        }

        const dataStructureBreakdown = {}
        const patternBreakdown = {}

        solvedProblems.forEach((progress) => {
            if (progress.problemId) {
                difficultyBreakdown[progress.problemId.difficulty]++

                progress.problemId.dataStructures?.forEach((ds) => {
                    dataStructureBreakdown[ds] = (dataStructureBreakdown[ds] || 0) + 1
                })

                progress.problemId.patterns?.forEach((pattern) => {
                    patternBreakdown[pattern] = (patternBreakdown[pattern] || 0) + 1
                })
            }
        })

        res.json({
            success: true,
            data: {
                totalSolved,
                totalAttempted,
                difficultyBreakdown,
                dataStructureBreakdown,
                patternBreakdown,
            },
        })
    } catch (error) {
        console.error('Error fetching DSA stats:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message,
        })
    }
}

// Admin: Create DSA problem
export const createDSAProblem = async (req, res) => {
    try {
        const problem = new DSAProblem(req.body)
        await problem.save()

        res.status(201).json({
            success: true,
            message: 'Problem created successfully',
            data: problem,
        })
    } catch (error) {
        console.error('Error creating DSA problem:', error)
        res.status(500).json({
            success: false,
            message: 'Error creating problem',
            error: error.message,
        })
    }
}

// Admin: Update DSA problem
export const updateDSAProblem = async (req, res) => {
    try {
        const { id } = req.params

        const problem = await DSAProblem.findByIdAndUpdate(id, req.body, {
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
        console.error('Error updating DSA problem:', error)
        res.status(500).json({
            success: false,
            message: 'Error updating problem',
            error: error.message,
        })
    }
}

// Admin: Delete DSA problem
export const deleteDSAProblem = async (req, res) => {
    try {
        const { id } = req.params

        const problem = await DSAProblem.findByIdAndUpdate(
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
        console.error('Error deleting DSA problem:', error)
        res.status(500).json({
            success: false,
            message: 'Error deleting problem',
            error: error.message,
        })
    }
}
