import { DSAProblem, User, Submission } from '../models/index.js'
import judge0Service from '../services/judge0.service.js'
import codeWrapperService from '../services/codeWrapper.service.js'
import redis from '../config/redis.js'
import { generateCacheKey, invalidateDSACache, invalidateUserCache } from '../utils/cache.utils.js'

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

        })

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

        if (isActive !== undefined) {
            query.isActive = isActive === 'true'
        }

        if (search && search.trim()) {
            const searchRegex = { $regex: search.trim(), $options: 'i' }
            // For slug search: remove spaces and hyphens, convert to lowercase
            const searchSlug = search.trim().toLowerCase().replace(/[-\s]/g, '')

            const searchConditions = [
                { slug: { $regex: searchSlug, $options: 'i' } }, // Search by slug (no hyphens)
                { dataStructures: searchRegex },
                { patterns: searchRegex },
            ]

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

        let solvedProblemIds = []
        if (req.user) {
            const user = await User.findById(req.user._id).select('solvedDSAProblems')
            solvedProblemIds = user?.solvedDSAProblems?.map(s => s.problem.toString()) || []

            if (status === 'solved') {
                query._id = { $in: user?.solvedDSAProblems?.map(s => s.problem) || [] }
            }
        }

        const skip = (page - 1) * limit

        const problems = await DSAProblem.find(query)
            .select('-testCases.input -testCases.output -solution -starterCode -metadata') // Don't send solution and hidden test cases
            .populate('companies', 'name logo slug')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))

        const total = await DSAProblem.countDocuments(query)

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

        try {
            await redis.setex(cacheKey, 600, JSON.stringify(response))
            console.log(`💾 [CACHED] DSA Problems List - Stored ${problemsWithProgress.length} problems (Page ${page}, TTL: 10min)`)
        } catch (cacheError) {
            console.error('❌ [CACHE ERROR] DSA problems write:', cacheError.message)
        }

        // Add Cache-Control header for HTTP caching
        res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
        res.json(response)
    } catch (error) {
        console.error('Error fetching DSA problems:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching problems',
            error: error.message,
        })
    }
}

export const getDSAProblem = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user?._id

        const problemCacheKey = `dsa:problem:${id}`

        let problem
        let query = { isActive: true }

        try {
            const cachedProblem = await redis.get(problemCacheKey)
            if (cachedProblem) {
                problem = JSON.parse(cachedProblem)
                console.log(`✅ [CACHE HIT] DSA Problem Detail - ${problem.title || id}`)
            }
        } catch (cacheError) {
            console.error('❌ [CACHE ERROR] DSA problem detail read:', cacheError.message)
        }

        if (!problem) {
            console.log(`⚠️  [CACHE MISS] DSA Problem Detail - Fetching from database`)

            const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id)

            if (isValidObjectId) {
                query.$or = [{ _id: id }, { slug: id }]
            } else {

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

            try {
                await redis.setex(problemCacheKey, 3600, JSON.stringify(problem))
                console.log(`💾 [CACHED] DSA Problem Detail - ${problem.title} (TTL: 1hr)`)
            } catch (cacheError) {
                console.error('❌ [CACHE ERROR] DSA problem detail write:', cacheError.message)
            }
        }

        let isSolved = false
        let submissions = []
        if (userId) {
            const submissionCacheKey = `dsa:problem:${id}:submissions:${userId}`

            try {
                const cachedSubmissions = await redis.get(submissionCacheKey)
                if (cachedSubmissions) {
                    const submissionData = JSON.parse(cachedSubmissions)
                    isSolved = submissionData.isSolved
                    submissions = submissionData.submissions
                    console.log(`✅ [CACHE HIT] User Submissions - ${submissions.length} submissions for user`)
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

                    try {
                        await redis.setex(
                            submissionCacheKey,
                            300,
                            JSON.stringify({ isSolved, submissions })
                        )
                        console.log(`💾 [CACHED] User Submissions - ${submissions.length} submissions (TTL: 5min)`)
                    } catch (cacheError) {
                        console.error('❌ [CACHE ERROR] User submissions write:', cacheError.message)
                    }
                }
            } catch (cacheError) {
                console.error('Cache read error:', cacheError)

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

        // Add Cache-Control header for HTTP caching
        res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')

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

export const searchDSAProblemsForInterview = async (req, res) => {
    try {
        const { query, tags, difficulty, limit = 10 } = req.query

        const searchQuery = { isActive: true }

        if (query && query.trim()) {
            const searchRegex = { $regex: query.trim(), $options: 'i' }
            // For slug search: remove spaces and hyphens, convert to lowercase
            const searchSlug = query.trim().toLowerCase().replace(/[-\s]/g, '')

            const searchConditions = [
                { slug: { $regex: searchSlug, $options: 'i' } }, // Search by slug (no hyphens)
                { dataStructures: searchRegex },
                { patterns: searchRegex },
            ]

            const searchNum = parseInt(query.trim())
            if (!isNaN(searchNum)) {
                searchConditions.push({ problemNumber: searchNum })
            }

            searchQuery.$or = searchConditions
        }

        if (tags) {
            const tagArray = tags.split(',')
            searchQuery.$or = searchQuery.$or || []
            searchQuery.$or.push(
                { dataStructures: { $in: tagArray } },
                { patterns: { $in: tagArray } }
            )
        }

        if (difficulty) {
            searchQuery.difficulty = difficulty
        }

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

export const getDSAProblemForInterview = async (req, res) => {
    try {
        const { id } = req.params

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

const wrapCode = (code, language, problem) => {

    return codeWrapperService.wrapCode(problem, code, language);
}

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

        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id)
        const query = isValidObjectId ? { _id: id } : { slug: id }

        const problem = await DSAProblem.findOne(query)
        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found',
            })
        }

        const formatInput = (input) => {
            if (!input) return '';

            return input.split(/,(?![^\[]*\])/).map(s => s.trim()).join('\n');
        };

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

        const wrappedCode = wrapCode(code, language, problem)

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

export const submitDSASolution = async (req, res) => {
    try {
        const { id } = req.params
        const { code, language } = req.body

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

        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id)
        const query = isValidObjectId ? { _id: id } : { slug: id }

        const problem = await DSAProblem.findOne(query)
        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found',
            })
        }

        const wrappedCode = wrapCode(code, language, problem)

        const formatInput = (input) => {
            if (!input) return '';
            return input.split(/,(?![^\[]*\])/).map(s => s.trim()).join('\n');
        };

        const formattedTestCases = problem.testCases.map(tc => ({
            ...tc.toObject(),
            input: formatInput(tc.input)
        }));

        const user = await User.findById(req.user._id).select('solvedDSAProblems stats')
        const alreadySolved = user.solvedDSAProblems?.some(s => s.problem.toString() === problem._id.toString())
        const attemptNumber = (user.solvedDSAProblems?.find(s => s.problem.toString() === problem._id.toString())?.attempts || 0) + 1

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

        let xpEarned = 0
        if (executionResult.accepted) {

            const xpMap = { Easy: 10, Medium: 20, Hard: 30 }
            xpEarned = xpMap[problem.difficulty] || 10

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

                await User.updateOne(
                    { _id: req.user._id, 'solvedDSAProblems.problem': problem._id },
                    { $inc: { 'solvedDSAProblems.$.attempts': 1 } }
                )
            }

            if (!alreadySolved) {
                problem.totalAccepted += 1
            }
        }

        problem.totalSubmissions += 1
        problem.acceptance = (problem.totalAccepted / problem.totalSubmissions) * 100

        await DSAProblem.updateOne(
            { _id: problem._id },
            {
                totalSubmissions: problem.totalSubmissions,
                totalAccepted: problem.totalAccepted,
                acceptance: problem.acceptance
            }
        )

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

        await invalidateUserCache(req.user._id)
        await redis.del(`dsa:problem:${id}:submissions:${req.user._id}`)
        console.log(`🔄 [CACHE INVALIDATED] User stats and submissions cleared`)

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

export const getDSAStats = async (req, res) => {
    try {
        const userId = req.user._id
        const cacheKey = `dsa:stats:${userId}`

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

        try {
            await redis.setex(cacheKey, 300, JSON.stringify(response))
            console.log(`💾 [CACHED] DSA Stats - ${user.solvedDSAProblems?.length || 0} solved problems (TTL: 5min)`)
        } catch (cacheError) {
            console.error('❌ [CACHE ERROR] DSA stats write:', cacheError.message)
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

export const createDSAProblem = async (req, res) => {
    try {
        const problem = new DSAProblem(req.body)
        await problem.save()

        await invalidateDSACache()
        console.log(`🔄 [CACHE INVALIDATED] All DSA caches cleared after problem creation`)

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

        await invalidateDSACache(id)
        console.log(`🔄 [CACHE INVALIDATED] DSA problem '${problem.title}' caches cleared`)

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

export const deleteDSAProblem = async (req, res) => {
    try {
        const { id } = req.params

        const problem = await DSAProblem.findByIdAndDelete(id)

        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found',
            })
        }

        await invalidateDSACache(id)
        console.log(`🔄 [CACHE INVALIDATED] DSA problem deleted from cache`)

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
