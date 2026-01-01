import { DSAProblem, User, Submission } from '../models/index.js'
import judge0Service from '../services/judge0.service.js'
import codeWrapperService from '../services/codeWrapper.service.js'
import redis from '../config/redis.js'
import { generateCacheKey, invalidateDSACache, invalidateUserCache } from '../utils/cache.utils.js'

// Get all DSA problems with filters
export const getAllDSAProblems = async (req, res) => {
    try {
        const {
            difficulty,
            dataStructure,
            pattern,
            status,
            page = 1,
            limit = 20,
            sort = 'createdAt',
            search,
            isActive
        } = req.query

        const userId = req.user?._id

        // Generate cache key
        const cacheKey = generateCacheKey('dsa:all', {
            difficulty,
            dataStructure,
            pattern,
            status,
            page,
            limit,
            sort,
            search,
            isActive,
            userId: userId?.toString(), // Include user ID for personalized cache
        })

        // Try to get from cache
        try {
            const cachedData = await redis.get(cacheKey)
            if (cachedData) {
                console.log(`✅ Cache HIT: ${cacheKey}`)
                return res.json(JSON.parse(cachedData))
            }
        } catch (cacheError) {
            console.error('Cache read error:', cacheError)
        }

        console.log(`⚠️  Cache MISS: ${cacheKey}`)

        const query = {}

        // Filter by active status (for public view)
        if (isActive !== undefined) {
            query.isActive = isActive === 'true'
        }

        // Search by title, problem number, data structures, or patterns
        if (search && search.trim()) {
            const searchRegex = { $regex: search.trim(), $options: 'i' }
            const searchConditions = [
                { title: searchRegex },
                { dataStructures: searchRegex },
                { patterns: searchRegex },
            ]

            // If search is a number, include problemNumber search
            const searchNum = parseInt(search.trim())
            if (!isNaN(searchNum)) {
                searchConditions.push({ problemNumber: searchNum })
            }

            query.$or = searchConditions
        }

        if (difficulty) {
            const difficulties = difficulty.split(',')
            query.difficulty = difficulties.length > 1 ? { $in: difficulties } : difficulty
        }

        if (dataStructure) {
            const dataStructures = dataStructure.split(',')
            query.dataStructures = dataStructures.length > 1 ? { $in: dataStructures } : dataStructure
        }

        if (pattern) {
            const patterns = pattern.split(',')
            query.patterns = patterns.length > 1 ? { $in: patterns } : pattern
        }

        // If user is authenticated, get their solved problems
        let solvedProblemIds = []
        if (req.user) {
            const user = await User.findById(req.user._id).select('solvedDSAProblems')
            solvedProblemIds = user?.solvedDSAProblems?.map(s => s.problem.toString()) || []

            // Filter by status if requested
            if (status === 'solved') {
                query._id = { $in: user?.solvedDSAProblems?.map(s => s.problem) || [] }
            }
        }

        const skip = (page - 1) * limit

        const problems = await DSAProblem.find(query)
            .select('-solution -testCases') // Don't send solution and hidden test cases
            .populate('companies', 'name slug')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))

        const total = await DSAProblem.countDocuments(query)

        // Attach user progress to each problem
        const problemsWithProgress = problems.map((problem) => {
            const isSolved = solvedProblemIds.includes(problem._id.toString())
            return {
                ...problem.toObject(),
                userStatus: isSolved ? 'solved' : 'not-started',
            }
        })

        const response = {
            success: true,
            data: problemsWithProgress,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        }

        // Cache for 10 minutes
        try {
            await redis.setex(cacheKey, 600, JSON.stringify(response))
            console.log(`💾 Cached: ${cacheKey} (TTL: 600s)`)
        } catch (cacheError) {
            console.error('Cache write error:', cacheError)
        }

        res.json(response)
        console.log("problemsWithProgress________", problemsWithProgress)
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
        const userId = req.user?._id

        // Cache key for problem data (shared across all users)
        const problemCacheKey = `dsa:problem:${id}`

        let problem
        let query = { isActive: true }

        // Try to get problem from cache
        try {
            const cachedProblem = await redis.get(problemCacheKey)
            if (cachedProblem) {
                console.log(`✅ Cache HIT: ${problemCacheKey}`)
                problem = JSON.parse(cachedProblem)
            }
        } catch (cacheError) {
            console.error('Cache read error:', cacheError)
        }

        if (!problem) {
            console.log(`⚠️  Cache MISS: ${problemCacheKey}`)

            // Check if id is a valid MongoDB ObjectId (24 hex characters)
            const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id)

            if (isValidObjectId) {
                query.$or = [{ _id: id }, { slug: id }]
            } else {
                // If not valid ObjectId, only search by slug
                query.slug = id
            }

            problem = await DSAProblem.findOne(query)
                .select('-solution') // Don't send solution initially
                .populate('companies', 'name slug')

            if (!problem) {
                return res.status(404).json({
                    success: false,
                    message: 'Problem not found',
                })
            }

            // Cache problem for 1 hour (very stable data)
            try {
                await redis.setex(problemCacheKey, 3600, JSON.stringify(problem))
                console.log(`💾 Cached: ${problemCacheKey} (TTL: 3600s)`)
            } catch (cacheError) {
                console.error('Cache write error:', cacheError)
            }
        }

        // Get user-specific data (submissions) - cached separately
        let isSolved = false
        let submissions = []
        if (userId) {
            const submissionCacheKey = `dsa:problem:${id}:submissions:${userId}`

            // Try to get submissions from cache
            try {
                const cachedSubmissions = await redis.get(submissionCacheKey)
                if (cachedSubmissions) {
                    console.log(`✅ Cache HIT: ${submissionCacheKey}`)
                    const submissionData = JSON.parse(cachedSubmissions)
                    isSolved = submissionData.isSolved
                    submissions = submissionData.submissions
                } else {
                    console.log(`⚠️  Cache MISS: ${submissionCacheKey}`)

                    const user = await User.findById(userId).select('solvedDSAProblems')
                    isSolved = user?.solvedDSAProblems?.some(s => s.problem.toString() === problem._id.toString()) || false

                    submissions = await Submission.find({
                        user: userId,
                        problemId: problem._id,
                        problemType: 'dsa',
                    })
                        .sort('-createdAt')
                        .limit(10)
                        .select('code language status')

                    // Cache user submissions for 5 minutes
                    try {
                        await redis.setex(
                            submissionCacheKey,
                            300,
                            JSON.stringify({ isSolved, submissions })
                        )
                        console.log(`💾 Cached: ${submissionCacheKey} (TTL: 300s)`)
                    } catch (cacheError) {
                        console.error('Cache write error:', cacheError)
                    }
                }
            } catch (cacheError) {
                console.error('Cache read error:', cacheError)
                // Fallback to DB query
                const user = await User.findById(userId).select('solvedDSAProblems')
                isSolved = user?.solvedDSAProblems?.some(s => s.problem.toString() === problem._id.toString()) || false

                submissions = await Submission.find({
                    user: userId,
                    problemId: problem._id,
                    problemType: 'dsa',
                })
                    .sort('-createdAt')
                    .limit(10)
                    .select('code language status')
            }
        }

        res.json({
            success: true,
            data: {
                problem,
                isSolved,
                recentSubmissions: submissions,
                lastSubmissionCode: submissions.length > 0 ? submissions[0].code : null,
                lastSubmissionLanguage: submissions.length > 0 ? submissions[0].language : null,
            },
        })
        console.log("submissions________", submissions)
    } catch (error) {
        console.error('Error fetching DSA problem:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching problem',
            error: error.message,
        })
    }
}

// Interview-specific: Search DSA problems for AI (lightweight)
export const searchDSAProblemsForInterview = async (req, res) => {
    try {
        const { query, tags, difficulty, limit = 10 } = req.query

        const searchQuery = { isActive: true }

        // Search by title or problem number
        if (query && query.trim()) {
            const searchRegex = { $regex: query.trim(), $options: 'i' }
            const searchConditions = [
                { title: searchRegex },
                { dataStructures: searchRegex },
                { patterns: searchRegex },
            ]

            // If query is a number, include problemNumber search
            const searchNum = parseInt(query.trim())
            if (!isNaN(searchNum)) {
                searchConditions.push({ problemNumber: searchNum })
            }

            searchQuery.$or = searchConditions
        }

        // Filter by tags (data structures or patterns)
        if (tags) {
            const tagArray = tags.split(',')
            searchQuery.$or = searchQuery.$or || []
            searchQuery.$or.push(
                { dataStructures: { $in: tagArray } },
                { patterns: { $in: tagArray } }
            )
        }

        // Filter by difficulty
        if (difficulty) {
            searchQuery.difficulty = difficulty
        }

        // Return minimal data for search results
        const problems = await DSAProblem.find(searchQuery)
            .select('_id title difficulty dataStructures patterns slug problemNumber')
            .limit(parseInt(limit))
            .sort('problemNumber')

        res.json({
            success: true,
            data: problems,
            count: problems.length
        })
    } catch (error) {
        console.error('Error searching DSA problems for interview:', error)
        res.status(500).json({
            success: false,
            message: 'Error searching problems',
            error: error.message,
        })
    }
}

// Interview-specific: Get problem with test cases for interview
export const getDSAProblemForInterview = async (req, res) => {
    try {
        const { id } = req.params

        // Check if id is a valid MongoDB ObjectId
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id)
        const query = isValidObjectId ? { _id: id, isActive: true } : { slug: id, isActive: true }

        const problem = await DSAProblem.findOne(query)
            .select('-solution') // Don't send solution
            .populate('companies', 'name slug')

        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found',
            })
        }

        // Get visible test cases for the interview (up to 3)
        const visibleTestCases = problem.testCases
            .filter(tc => !tc.isHidden)
            .slice(0, 3)
            .map(tc => ({
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                explanation: tc.explanation
            }))

        res.json({
            success: true,
            data: {
                problem: {
                    _id: problem._id,
                    title: problem.title,
                    difficulty: problem.difficulty,
                    description: problem.description,
                    examples: problem.examples,
                    constraints: problem.constraints,
                    dataStructures: problem.dataStructures,
                    patterns: problem.patterns,
                    slug: problem.slug,
                    problemNumber: problem.problemNumber,
                    companies: problem.companies,
                    starterCode: problem.starterCode,
                    sampleTestCases: visibleTestCases
                }
            },
        })
    } catch (error) {
        console.error('Error fetching DSA problem for interview:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching problem',
            error: error.message,
        })
    }
}

// Helper to wrap user code with driver code
const wrapCode = (code, language, problem) => {
    // Delegate everything to codeWrapperService
    return codeWrapperService.wrapCode(problem, code, language);
}

// Run code against visible test cases only (for "Run" button)
export const runDSACode = async (req, res) => {
    try {
        const { id } = req.params
        const { code, language } = req.body

        if (!code || !language) {
            return res.status(400).json({
                success: false,
                message: 'Code and language are required',
            })
        }

        // Check if id is a valid MongoDB ObjectId
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id)
        const query = isValidObjectId ? { _id: id } : { slug: id }

        const problem = await DSAProblem.findOne(query)
        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found',
            })
        }


        // Helper to format input: split by comma ignoring commas in brackets, join with newline
        const formatInput = (input) => {
            if (!input) return '';
            // Split by comma, but only if not enclosed in brackets
            // This regex matches a comma if it's NOT followed by a closing bracket without an opening bracket in between??
            // Actually, simpler regex: split by comma that is NOT inside brackets.
            // Using a simple stack-based parser or complex regex.
            // Regex: /,(?![^\[]*\])/ works for non-nested brackets.
            return input.split(/,(?![^\[]*\])/).map(s => s.trim()).join('\n');
        };

        // Get only visible test cases (max 3 for "Run")
        const visibleTestCases = problem.testCases
            .filter((tc) => !tc.isHidden)
            .slice(0, 3)
            .map(tc => ({
                ...tc.toObject(),
                input: formatInput(tc.input) // Format input for Judge0
            }))

        if (visibleTestCases.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No visible test cases available for this problem',
            })
        }

        // Wrap the user's code
        const wrappedCode = wrapCode(code, language, problem)


        // Run code against visible test cases using Judge0
        const result = await judge0Service.runTestCases(
            wrappedCode,
            language,
            visibleTestCases,
            problem.timeLimit,
            problem.memoryLimit
        )

        res.json({
            success: true,
            message: 'Code executed successfully',
            data: result,
        })
    } catch (error) {
        console.error('Error running code:', error)
        res.status(500).json({
            success: false,
            message: 'Error running code',
            error: error.message,
        })
    }
}

// Submit solution for DSA problem (runs ALL test cases including hidden)
export const submitDSASolution = async (req, res) => {
    try {
        const { id } = req.params
        const { code, language } = req.body

        // Check authentication first
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required to submit solutions',
            })
        }

        if (!code || !language) {
            return res.status(400).json({
                success: false,
                message: 'Code and language are required',
            })
        }

        // Check if id is a valid MongoDB ObjectId
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id)
        const query = isValidObjectId ? { _id: id } : { slug: id }

        const problem = await DSAProblem.findOne(query)
        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found',
            })
        }


        // Wrap the user's code
        const wrappedCode = wrapCode(code, language, problem)

        // Helper to format input
        const formatInput = (input) => {
            if (!input) return '';
            return input.split(/,(?![^\[]*\])/).map(s => s.trim()).join('\n');
        };

        const formattedTestCases = problem.testCases.map(tc => ({
            ...tc.toObject(),
            input: formatInput(tc.input)
        }));

        // Get current solved status for attempt tracking
        const user = await User.findById(req.user._id).select('solvedDSAProblems stats')
        const alreadySolved = user.solvedDSAProblems?.some(s => s.problem.toString() === problem._id.toString())
        const attemptNumber = (user.solvedDSAProblems?.find(s => s.problem.toString() === problem._id.toString())?.attempts || 0) + 1

        // Run code against ALL test cases using Judge0
        let executionResult
        try {
            executionResult = await judge0Service.runTestCases(
                wrappedCode,
                language,
                formattedTestCases, // All test cases including hidden, formatted
                problem.timeLimit,
                problem.memoryLimit
            )
        } catch (execError) {
            console.error('Judge0 execution error:', execError)

            // Update submission with runtime error (overwrite existing if any)
            await Submission.findOneAndUpdate(
                {
                    user: req.user._id,
                    problemId: problem._id,
                    problemType: 'dsa',
                },
                {
                    code,
                    language,
                    status: 'runtime-error',
                    compilationError: execError.message,
                    attemptNumber,
                    // Clear previous results
                    testResults: [],
                    isAccepted: false,
                },
                { upsert: true, new: true }
            )

            return res.status(500).json({
                success: false,
                message: 'Code execution failed',
                error: execError.message,
            })
        }

        // Determine submission status based on execution result
        let submissionStatus = 'wrong-answer'
        if (executionResult.accepted) {
            submissionStatus = 'accepted'
        } else if (executionResult.testResults.some((r) => r.status === 'Time Limit Exceeded')) {
            submissionStatus = 'time-limit-exceeded'
        } else if (executionResult.testResults.some((r) => r.status === 'Compilation Error')) {
            submissionStatus = 'compilation-error'
        } else if (executionResult.testResults.some((r) => r.status?.includes('Runtime Error'))) {
            submissionStatus = 'runtime-error'
        }

        // Calculate XP earned for accepted solutions
        let xpEarned = 0
        if (executionResult.accepted) {
            // Award XP based on difficulty
            const xpMap = { Easy: 10, Medium: 20, Hard: 30 }
            xpEarned = xpMap[problem.difficulty] || 10

            // Update User's solvedDSAProblems if not already solved
            if (!alreadySolved) {
                await User.findByIdAndUpdate(req.user._id, {
                    $push: {
                        solvedDSAProblems: {
                            problem: problem._id,
                            solvedAt: new Date(),
                            language,
                            attempts: 1,
                        },
                    },
                    $inc: {
                        'stats.dsaSolved': 1,
                        'stats.totalXP': xpEarned,
                    },
                })
            } else {
                // Update attempts if already solved
                await User.updateOne(
                    { _id: req.user._id, 'solvedDSAProblems.problem': problem._id },
                    { $inc: { 'solvedDSAProblems.$.attempts': 1 } }
                )
            }

            // Update problem stats
            if (!alreadySolved) {
                problem.totalAccepted += 1
            }
        }

        // Update problem stats regardless
        problem.totalSubmissions += 1
        problem.acceptance = (problem.totalAccepted / problem.totalSubmissions) * 100

        // Use updateOne to avoid validation errors on imported problems
        await DSAProblem.updateOne(
            { _id: problem._id },
            {
                totalSubmissions: problem.totalSubmissions,
                totalAccepted: problem.totalAccepted,
                acceptance: problem.acceptance
            }
        )

        // Create or Update submission record (Single submission per problem per user)
        const submission = await Submission.findOneAndUpdate(
            {
                user: req.user._id,
                problemId: problem._id,
                problemType: 'dsa',
            },
            {
                code,
                language,
                attemptNumber,
                status: submissionStatus,
                testResults: executionResult.testResults,
                totalTestCases: executionResult.totalTestCases,
                passedTestCases: executionResult.passedTestCases,
                executionTime: executionResult.executionTime,
                memoryUsed: executionResult.memoryUsed,
                isAccepted: executionResult.accepted,
                xpEarned,
            },
            { upsert: true, new: true }
        )

        // Invalidate user cache (stats and submissions)
        await invalidateUserCache(req.user._id)
        await redis.del(`dsa:problem:${id}:submissions:${req.user._id}`)

        res.json({
            success: true,
            message: executionResult.accepted ? 'All test cases passed!' : 'Some test cases failed',
            data: {
                submissionId: submission._id,
                status: submissionStatus,
                accepted: executionResult.accepted,
                totalTestCases: executionResult.totalTestCases,
                passedTestCases: executionResult.passedTestCases,
                testResults: executionResult.testResults.map((r) => ({
                    ...r,
                    // Hide input/output for hidden test cases in response
                    input: problem.testCases.find((tc) => tc._id?.toString() === r.testCaseId?.toString())?.isHidden
                        ? '[Hidden]'
                        : r.input,
                    expectedOutput: problem.testCases.find((tc) => tc._id?.toString() === r.testCaseId?.toString())
                        ?.isHidden
                        ? '[Hidden]'
                        : r.expectedOutput,
                    actualOutput: problem.testCases.find((tc) => tc._id?.toString() === r.testCaseId?.toString())
                        ?.isHidden
                        ? '[Hidden]'
                        : r.actualOutput,
                })),
                executionTime: executionResult.executionTime,
                memoryUsed: executionResult.memoryUsed,
                xpEarned,
            },
        })
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
        const cacheKey = `dsa:stats:${userId}`

        // Try to get from cache
        try {
            const cachedData = await redis.get(cacheKey)
            if (cachedData) {
                console.log(`✅ Cache HIT: ${cacheKey}`)
                return res.json(JSON.parse(cachedData))
            }
        } catch (cacheError) {
            console.error('Cache read error:', cacheError)
        }

        console.log(`⚠️  Cache MISS: ${cacheKey}`)

        const user = await User.findById(userId)
            .select('solvedDSAProblems stats')
            .populate('solvedDSAProblems.problem', 'difficulty dataStructures patterns')

        const totalSolved = user.solvedDSAProblems?.length || 0
        const totalSubmissions = await Submission.countDocuments({
            user: userId,
            problemType: 'dsa',
        })

        const difficultyBreakdown = {
            Easy: 0,
            Medium: 0,
            Hard: 0,
        }

        const dataStructureBreakdown = {}
        const patternBreakdown = {}

        user.solvedDSAProblems?.forEach((solved) => {
            if (solved.problem) {
                difficultyBreakdown[solved.problem.difficulty]++

                solved.problem.dataStructures?.forEach((ds) => {
                    dataStructureBreakdown[ds] = (dataStructureBreakdown[ds] || 0) + 1
                })

                solved.problem.patterns?.forEach((pattern) => {
                    patternBreakdown[pattern] = (patternBreakdown[pattern] || 0) + 1
                })
            }
        })

        const response = {
            success: true,
            data: {
                totalSolved,
                totalSubmissions,
                totalXP: user.stats?.totalXP || 0,
                difficultyBreakdown,
                dataStructureBreakdown,
                patternBreakdown,
            },
        }

        // Cache for 5 minutes
        try {
            await redis.setex(cacheKey, 300, JSON.stringify(response))
            console.log(`💾 Cached: ${cacheKey} (TTL: 300s)`)
        } catch (cacheError) {
            console.error('Cache write error:', cacheError)
        }

        res.json(response)
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

        // Invalidate DSA caches
        await invalidateDSACache()

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

        // Invalidate caches for this specific problem
        await invalidateDSACache(id)

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

// Admin: Delete DSA problem (HARD DELETE)
export const deleteDSAProblem = async (req, res) => {
    try {
        const { id } = req.params

        // Hard delete - permanently remove from database
        const problem = await DSAProblem.findByIdAndDelete(id)

        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found',
            })
        }

        // Invalidate DSA caches
        await invalidateDSACache(id)

        res.json({
            success: true,
            message: 'Problem permanently deleted',
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
