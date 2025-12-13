import { DSAProblem, UserProgress, Submission } from '../models/index.js'
import judge0Service from '../services/judge0.service.js'
import codeWrapperService from '../services/codeWrapper.service.js'

// Get all DSA problems with filters
export const getAllDSAProblems = async (req, res) => {
    try {
        const {
            difficulty,
            dataStructure,
            pattern,
            company,
            status,
            page = 1,
            limit = 20,
            sort = '-createdAt',
        } = req.query

        const query = {}

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


        let query = { isActive: true }

        // Check if id is a valid MongoDB ObjectId (24 hex characters)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id)

        if (isValidObjectId) {
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
                .select('code') // Don't send full code in list
        }

        res.json({
            success: true,
            data: {
                problem,
                userProgress,
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

// Helper to wrap user code with driver code
const wrapCode = (code, language, problem) => {
    // Use dedicated wrapper service for C and C++ with problem metadata
    if (language === 'c' || language === 'cpp') {
        return codeWrapperService.wrapCode(problem, code, language);
    }

    // Basic wrapper for JavaScript
    if (language === 'javascript') {
        // Try to find function name
        const functionMatch = code.match(/function\s+(\w+)|const\s+(\w+)\s*=\s*\(|var\s+(\w+)\s*=\s*\(|let\s+(\w+)\s*=\s*\(/)
        const functionName = functionMatch ? (functionMatch[1] || functionMatch[2] || functionMatch[3] || functionMatch[4]) : null

        if (!functionName) return code // Cannot wrap if function name not found

        return `
${code}

// Driver Code
const fs = require('fs');
try {
    const input = fs.readFileSync(0, 'utf-8').trim();
    let args;
    try {
        args = JSON.parse(input);
    } catch (e) {
        args = input; // Fallback to raw string
    }

    // Call the user's function
    const result = ${functionName}(args);

    // Output the result
    if (result !== undefined) {
        console.log(JSON.stringify(result));
    }
} catch (error) {
    console.error(error.message);
}
`
    }

    return code
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

        // Get only visible test cases (max 3 for "Run")
        const visibleTestCases = problem.testCases
            .filter((tc) => !tc.isHidden)
            .slice(0, 3)

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

        // Run code against ALL test cases using Judge0
        let executionResult
        try {
            executionResult = await judge0Service.runTestCases(
                wrappedCode,
                language,
                problem.testCases, // All test cases including hidden
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
                    attemptNumber: userProgress.totalAttempts,
                    // Clear previous results
                    testResults: [],
                    isAccepted: false,
                },
                { upsert: true, new: true }
            )

            await userProgress.save()

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

            // Update user progress to solved
            userProgress.status = 'solved'
            if (!userProgress.solvedDate) {
                userProgress.solvedDate = new Date()
            }

            // Only increment problem stats if this specific user hadn't solved it before
            // (Or we can just increment global stats blindly, but let's stick to simple logic for now)
            // Ideally we'd check if userProgress.status WAS NOT 'solved' before.
            // But since we are simplifing:
            problem.totalAccepted += 1
        }

        // Update problem stats regardless
        problem.totalSubmissions += 1
        problem.acceptance = (problem.totalAccepted / problem.totalSubmissions) * 100
        await problem.save()

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
                attemptNumber: userProgress.totalAttempts,
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

        await userProgress.save()

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
