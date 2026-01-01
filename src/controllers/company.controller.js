import { Company, CompanyApplication, User, DSAProblem, DevelopmentProblem } from '../models/index.js'
import redis from '../config/redis.js'
import { generateCacheKey, invalidateCompanyCache } from '../utils/cache.utils.js'

// Get all companies with filters
export const getAllCompanies = async (req, res) => {
    try {
        const {
            difficulty,
            minPackage,
            maxPackage,
            location,
            isHiring,
            hiringFreshers,
            workMode, // 'Remote', 'Hybrid', 'On-site'
            experience,
            page = 1,
            limit = 20,
            sort = '-stats.preparing',
        } = req.query

        // Generate cache key
        const cacheKey = generateCacheKey('companies:all', {
            difficulty,
            minPackage,
            maxPackage,
            location,
            isHiring,
            hiringFreshers,
            workMode,
            experience,
            page,
            limit,
            sort,
            search: req.query.search,
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

        if (difficulty) query.difficulty = difficulty
        if (isHiring !== undefined) query.isHiring = isHiring === 'true'
        if (hiringFreshers !== undefined) query.hiringFreshers = hiringFreshers === 'true'
        if (workMode) query.workModes = workMode // Matches if workMode is in the array
        if (location) {
            // Case insensitive search for location
            query.locations = { $regex: new RegExp(location, 'i') }
        }

        // Filter by user's experience (e.g. if user has 2 years, find companies where min <= 2 <= max)
        if (experience) {
            const expYear = parseFloat(experience)
            if (!isNaN(expYear)) {
                query['experienceRequired.min'] = { $lte: expYear }
                query['experienceRequired.max'] = { $gte: expYear }
            }
        }

        if (minPackage || maxPackage) {
            query['averagePackage.min'] = {}
            if (minPackage) query['averagePackage.min'].$gte = parseInt(minPackage)
            if (maxPackage) query['averagePackage.max'].$lte = parseInt(maxPackage)
        }

        // Name Search (Optimized with Regex)
        if (req.query.search) {
            query.name = { $regex: new RegExp(req.query.search, 'i') }
        }

        const skip = (page - 1) * limit

        const companies = await Company.find(query)
            .select('-hiringPipeline.questions') // Don't send all questions in list
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))

        const total = await Company.countDocuments(query)

        const response = {
            success: true,
            data: companies,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
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
        console.error('Error fetching companies:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching companies',
            error: error.message,
        })
    }
}

// Get suggested companies for user
export const getSuggestedCompanies = async (req, res) => {
    try {
        const userId = req.user._id
        const cacheKey = `companies:suggested:${userId}`

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

        // Assume user is authenticated (middleware ensures req.user)
        const user = await User.findById(userId)
        const query = { isActive: true }

        // 1. Match Experience
        if (user.experience) {
            const expLower = user.experience.toLowerCase()
            if (expLower.includes('fresher')) {
                query.hiringFreshers = true
            } else {
                const match = user.experience.match(/\d+/)
                if (match) {
                    const exp = parseInt(match[0])
                    // Find companies where their requirement covers user's experience
                    query['experienceRequired.min'] = { $lte: exp }
                    query['experienceRequired.max'] = { $gte: exp }
                }
            }
        }

        // 2. Fallback: If no strict criteria or user has undefined profile, show High Hiring companies
        if (Object.keys(query).length === 1) { // Only isActive is set
            query.isHiring = true
        }

        let companies = await Company.find(query)
            .select('name logo slug industry difficulty averagePackage hiringFreshers experienceRequired')
            .limit(10)
            .sort('-isHiring -stats.totalApplicants') // Prioritize hiring & popular

        const response = {
            success: true,
            data: companies,
        }

        // Cache for 15 minutes
        try {
            await redis.setex(cacheKey, 900, JSON.stringify(response))
            console.log(`💾 Cached: ${cacheKey} (TTL: 900s)`)
        } catch (cacheError) {
            console.error('Cache write error:', cacheError)
        }

        res.json(response)
    } catch (error) {
        console.error('Error fetching suggested companies:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching suggestions',
            error: error.message,
        })
    }
}

// Get single company details
export const getCompany = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user?._id

        // Cache key for company data (shared across all users)
        const companyCacheKey = `company:detail:${id}`

        let company

        // Try to get company from cache
        try {
            const cachedCompany = await redis.get(companyCacheKey)
            if (cachedCompany) {
                console.log(`✅ Cache HIT: ${companyCacheKey}`)
                company = JSON.parse(cachedCompany)
            }
        } catch (cacheError) {
            console.error('Cache read error:', cacheError)
        }

        if (!company) {
            console.log(`⚠️  Cache MISS: ${companyCacheKey}`)

            // Build query - if id is a valid ObjectId, search both _id and slug
            // Otherwise, only search by slug
            let query
            if (id.match(/^[0-9a-fA-F]{24}$/)) {
                // Valid ObjectId format
                query = { $or: [{ _id: id }, { slug: id }] }
            } else {
                // Not a valid ObjectId, search only by slug
                query = { slug: id }
            }

            company = await Company.findOne(query)
                .populate('rolesData.linkedDSAProblems.problem')
                .populate('rolesData.linkedDevProblems.problem')

            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: 'Company not found',
                })
            }

            // Cache company for 30 minutes (very stable data)
            try {
                await redis.setex(companyCacheKey, 1800, JSON.stringify(company))
                console.log(`💾 Cached: ${companyCacheKey} (TTL: 1800s)`)
            } catch (cacheError) {
                console.error('Cache write error:', cacheError)
            }
        }

        // Get user's application status if authenticated (not cached)
        let userApplication = null
        if (userId) {
            userApplication = await CompanyApplication.findOne({
                user: userId,
                company: company._id,
            })
        }

        res.json({
            success: true,
            data: company, // Return company directly, not nested
            userApplication, // Keep userApplication separate if needed
        })
    } catch (error) {
        console.error('Error fetching company:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching company',
            error: error.message,
        })
    }
}

// Apply to a company
export const applyToCompany = async (req, res) => {
    try {
        const { id } = req.params
        const { role, resumeUrl, coverLetter } = req.body

        const company = await Company.findById(id)
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        // Check if user already applied
        const existingApplication = await CompanyApplication.findOne({
            user: req.user._id,
            company: company._id,
        })

        if (existingApplication) {
            return res.status(400).json({
                success: false,
                message: 'You have already applied to this company',
            })
        }

        // Get user's resume if not provided
        const user = await User.findById(req.user._id)
        const finalResumeUrl = resumeUrl || user.resume?.url

        if (!finalResumeUrl) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a resume before applying',
            })
        }

        // Create application
        const application = new CompanyApplication({
            user: req.user._id,
            company: company._id,
            role,
            resumeUrl: finalResumeUrl,
            coverLetter,
            status: 'applied',
            currentRound: 0,
            rounds: company.hiringPipeline.map((round) => ({
                roundNumber: round.roundNumber,
                roundName: round.roundName,
                roundType: round.roundType,
                status: 'pending',
            })),
        })

        // TODO: Analyze resume
        // application.resumeAnalysis = await analyzeResume(finalResumeUrl, role)

        await application.save()

        // Update company stats
        company.stats.totalApplicants += 1
        await company.save()

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: application,
        })
    } catch (error) {
        console.error('Error applying to company:', error)
        res.status(500).json({
            success: false,
            message: 'Error submitting application',
            error: error.message,
        })
    }
}

// Get user's applications
export const getUserApplications = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query

        const query = { user: req.user._id }
        if (status) query.status = status

        const skip = (page - 1) * limit

        const applications = await CompanyApplication.find(query)
            .populate('company', 'name logo averagePackage difficulty')
            .sort('-appliedAt')
            .skip(skip)
            .limit(parseInt(limit))

        const total = await CompanyApplication.countDocuments(query)

        res.json({
            success: true,
            data: applications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error('Error fetching applications:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching applications',
            error: error.message,
        })
    }
}

// Get specific application details
export const getApplicationDetails = async (req, res) => {
    try {
        const { applicationId } = req.params

        const application = await CompanyApplication.findOne({
            _id: applicationId,
            user: req.user._id,
        }).populate('company')

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found',
            })
        }

        res.json({
            success: true,
            data: application,
        })
    } catch (error) {
        console.error('Error fetching application:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching application',
            error: error.message,
        })
    }
}

// Start interview round
export const startInterviewRound = async (req, res) => {
    try {
        const { applicationId } = req.params

        const application = await CompanyApplication.findOne({
            _id: applicationId,
            user: req.user._id,
        }).populate('company')

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found',
            })
        }

        const nextRoundIndex = application.currentRound
        if (nextRoundIndex >= application.rounds.length) {
            return res.status(400).json({
                success: false,
                message: 'All rounds completed',
            })
        }

        const round = application.rounds[nextRoundIndex]
        if (round.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Round already started or completed',
            })
        }

        // Update round status
        round.status = 'in-progress'
        round.startedAt = new Date()
        application.status = 'in-progress'

        await application.save()

        // Get questions for this round from company pipeline
        const companyRound = application.company.hiringPipeline[nextRoundIndex]

        res.json({
            success: true,
            message: 'Round started successfully',
            data: {
                round,
                questions: companyRound.questions,
                duration: companyRound.duration,
            },
        })
    } catch (error) {
        console.error('Error starting round:', error)
        res.status(500).json({
            success: false,
            message: 'Error starting round',
            error: error.message,
        })
    }
}

// Submit round completion
export const submitRound = async (req, res) => {
    try {
        const { applicationId } = req.params
        const { roundNumber, questionsAttempted, score } = req.body

        const application = await CompanyApplication.findOne({
            _id: applicationId,
            user: req.user._id,
        })

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found',
            })
        }

        const round = application.rounds[roundNumber - 1]
        if (!round || round.status !== 'in-progress') {
            return res.status(400).json({
                success: false,
                message: 'Invalid round or round not in progress',
            })
        }

        // Update round
        round.status = 'completed'
        round.completedAt = new Date()
        round.score = score
        round.questionsAttempted = questionsAttempted

        // Check if passed (simplified logic)
        const passingScore = application.company.hiringPipeline[roundNumber - 1].passingCriteria?.minimumScore || 50
        round.passed = score >= passingScore

        if (round.passed) {
            // Move to next round
            application.currentRound += 1

            // Check if all rounds completed
            if (application.currentRound >= application.rounds.length) {
                application.status = 'selected'
                application.finalResult = {
                    selected: true,
                    feedback: 'Congratulations! You have cleared all rounds.',
                }
            }
        } else {
            application.status = 'rejected'
            application.finalResult = {
                selected: false,
                feedback: `Unfortunately, you did not clear ${round.roundName}.`,
            }
        }

        await application.save()

        res.json({
            success: true,
            message: 'Round submitted successfully',
            data: {
                round,
                passed: round.passed,
                nextRound: round.passed && application.currentRound < application.rounds.length
                    ? application.rounds[application.currentRound]
                    : null,
            },
        })
    } catch (error) {
        console.error('Error submitting round:', error)
        res.status(500).json({
            success: false,
            message: 'Error submitting round',
            error: error.message,
        })
    }
}

// Admin: Create company
export const createCompany = async (req, res) => {
    try {
        const company = new Company(req.body)
        await company.save()

        // Invalidate company caches
        await invalidateCompanyCache()

        res.status(201).json({
            success: true,
            message: 'Company created successfully',
            data: company,
        })
    } catch (error) {
        console.error('Error creating company:', error)
        res.status(500).json({
            success: false,
            message: 'Error creating company',
            error: error.message,
        })
    }
}

// Admin: Update company
export const updateCompany = async (req, res) => {
    try {
        const { id } = req.params

        const company = await Company.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        })

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        // Invalidate caches for this specific company
        await invalidateCompanyCache(id)

        res.json({
            success: true,
            message: 'Company updated successfully',
            data: company,
        })
    } catch (error) {
        console.error('Error updating company:', error)
        res.status(500).json({
            success: false,
            message: 'Error updating company',
            error: error.message,
        })
    }
}

// Admin: Link DSA problem to company (role-specific)
export const linkDSAProblem = async (req, res) => {
    try {
        const { id } = req.params
        const { problemId, frequency, role, roundNumber, notes } = req.body

        if (!problemId) {
            return res.status(400).json({
                success: false,
                message: 'Problem ID is required',
            })
        }

        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'Role is required',
            })
        }

        // Verify problem exists
        const problem = await DSAProblem.findById(problemId)
        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'DSA problem not found',
            })
        }

        const company = await Company.findById(id)
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        const roleIndex = company.rolesData.findIndex(r => r.roleName === role)
        if (roleIndex === -1) {
            return res.status(404).json({
                success: false,
                message: `Role '${role}' not found in company`,
            })
        }

        // Validate roundNumber if provided
        if (roundNumber !== undefined && roundNumber !== null) {
            const roundExists = company.rolesData[roleIndex].hiringPipeline.some(
                r => r.roundNumber === roundNumber
            )
            if (!roundExists) {
                return res.status(400).json({
                    success: false,
                    message: `Round number ${roundNumber} does not exist for role '${role}'`,
                })
            }
        }

        // Add to role-specific linkedDSAProblems
        company.rolesData[roleIndex].linkedDSAProblems.push({
            problem: problemId,
            frequency: frequency || 'Medium',
            roundNumber,
            notes,
            lastAsked: new Date(),
        })

        await company.save()

        // Sync: Add company to DSA problem's companies list
        await DSAProblem.findByIdAndUpdate(problemId, {
            $addToSet: { companies: company._id }
        })

        // Populate and return
        const updatedCompany = await Company.findById(id)
            .populate('rolesData.linkedDSAProblems.problem')

        res.json({
            success: true,
            message: 'DSA problem linked successfully',
            data: updatedCompany,
        })
    } catch (error) {
        console.error('Error linking DSA problem:', error)
        res.status(500).json({
            success: false,
            message: 'Error linking DSA problem',
            error: error.message,
        })
    }
}

// Admin: Unlink DSA problem from company
export const unlinkDSAProblem = async (req, res) => {
    try {
        const { id, linkId } = req.params
        const { role } = req.query

        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'Role parameter is required',
            })
        }

        const company = await Company.findById(id)
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        const roleIndex = company.rolesData.findIndex(r => r.roleName === role)
        if (roleIndex === -1) {
            return res.status(404).json({
                success: false,
                message: `Role '${role}' not found`,
            })
        }

        const problemIndex = company.rolesData[roleIndex].linkedDSAProblems.findIndex(
            p => p._id.toString() === linkId
        )
        if (problemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Problem link not found in this role',
            })
        }

        const problemId = company.rolesData[roleIndex].linkedDSAProblems[problemIndex].problem
        company.rolesData[roleIndex].linkedDSAProblems.splice(problemIndex, 1)
        await company.save()

        // Remove from DSA Problem's companies list
        if (problemId) {
            await DSAProblem.findByIdAndUpdate(problemId, {
                $pull: { companies: id }
            })
        }

        res.json({
            success: true,
            message: 'DSA problem unlinked successfully',
        })
    } catch (error) {
        console.error('Error unlinking DSA problem:', error)
        res.status(500).json({
            success: false,
            message: 'Error unlinking DSA problem',
            error: error.message,
        })
    }
}

// Admin: Link Dev problem to company (role-specific)
export const linkDevProblem = async (req, res) => {
    try {
        const { id } = req.params
        const { problemId, frequency, role, roundNumber, notes } = req.body

        if (!problemId) {
            return res.status(400).json({
                success: false,
                message: 'Problem ID is required',
            })
        }

        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'Role is required',
            })
        }

        // Verify problem exists
        const problem = await DevelopmentProblem.findById(problemId)
        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Development problem not found',
            })
        }

        const company = await Company.findById(id)
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        const roleIndex = company.rolesData.findIndex(r => r.roleName === role)
        if (roleIndex === -1) {
            return res.status(404).json({
                success: false,
                message: `Role '${role}' not found in company`,
            })
        }

        // Validate roundNumber if provided
        if (roundNumber !== undefined && roundNumber !== null) {
            const roundExists = company.rolesData[roleIndex].hiringPipeline.some(
                r => r.roundNumber === roundNumber
            )
            if (!roundExists) {
                return res.status(400).json({
                    success: false,
                    message: `Round number ${roundNumber} does not exist for role '${role}'`,
                })
            }
        }

        // Add to role-specific linkedDevProblems
        company.rolesData[roleIndex].linkedDevProblems.push({
            problem: problemId,
            frequency: frequency || 'Medium',
            roundNumber,
            notes,
            lastAsked: new Date(),
        })

        await company.save()

        // Populate and return
        const updatedCompany = await Company.findById(id)
            .populate('rolesData.linkedDevProblems.problem')

        res.json({
            success: true,
            message: 'Development problem linked successfully',
            data: updatedCompany,
        })
    } catch (error) {
        console.error('Error linking development problem:', error)
        res.status(500).json({
            success: false,
            message: 'Error linking development problem',
            error: error.message,
        })
    }
}

// Admin: Unlink Dev problem from company
export const unlinkDevProblem = async (req, res) => {
    try {
        const { id, linkId } = req.params
        const { role } = req.query

        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'Role parameter is required',
            })
        }

        const company = await Company.findById(id)
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        const roleIndex = company.rolesData.findIndex(r => r.roleName === role)
        if (roleIndex === -1) {
            return res.status(404).json({
                success: false,
                message: `Role '${role}' not found`,
            })
        }

        const problemIndex = company.rolesData[roleIndex].linkedDevProblems.findIndex(
            p => p._id.toString() === linkId
        )
        if (problemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Problem link not found in this role',
            })
        }

        company.rolesData[roleIndex].linkedDevProblems.splice(problemIndex, 1)
        await company.save()

        res.json({
            success: true,
            message: 'Development problem unlinked successfully',
        })
    } catch (error) {
        console.error('Error unlinking development problem:', error)
        res.status(500).json({
            success: false,
            message: 'Error unlinking development problem',
            error: error.message,
        })
    }
}

// Admin: Add interview question to company (role-specific)
export const addInterviewQuestion = async (req, res) => {
    try {
        const { id } = req.params
        const { question, type, difficulty, role, roundNumber, answer, tips } = req.body

        if (!question || !type) {
            return res.status(400).json({
                success: false,
                message: 'Question and type are required',
            })
        }

        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'Role is required',
            })
        }

        const company = await Company.findById(id)
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        const roleIndex = company.rolesData.findIndex(r => r.roleName === role)
        if (roleIndex === -1) {
            return res.status(404).json({
                success: false,
                message: `Role '${role}' not found in company`,
            })
        }

        // Validate roundNumber if provided
        if (roundNumber !== undefined && roundNumber !== null) {
            const roundExists = company.rolesData[roleIndex].hiringPipeline.some(
                r => r.roundNumber === roundNumber
            )
            if (!roundExists) {
                return res.status(400).json({
                    success: false,
                    message: `Round number ${roundNumber} does not exist for role '${role}'`,
                })
            }
        }

        // Add to role-specific interviewQuestions
        company.rolesData[roleIndex].interviewQuestions.push({
            question,
            type,
            difficulty,
            roundNumber,
            answer,
            tips: tips || [],
        })

        await company.save()

        res.json({
            success: true,
            message: 'Interview question added successfully',
            data: company,
        })
    } catch (error) {
        console.error('Error adding interview question:', error)
        res.status(500).json({
            success: false,
            message: 'Error adding interview question',
            error: error.message,
        })
    }
}

// Admin: Remove interview question from company
export const removeInterviewQuestion = async (req, res) => {
    try {
        const { id, questionId } = req.params
        const { role } = req.query

        if (!role) {
            return res.status(400).json({
                success: false,
                message: 'Role parameter is required',
            })
        }

        const company = await Company.findById(id)
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        const roleIndex = company.rolesData.findIndex(r => r.roleName === role)
        if (roleIndex === -1) {
            return res.status(404).json({
                success: false,
                message: `Role '${role}' not found`,
            })
        }

        const questionIndex = company.rolesData[roleIndex].interviewQuestions.findIndex(
            q => q._id.toString() === questionId
        )
        if (questionIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Question not found in this role',
            })
        }

        company.rolesData[roleIndex].interviewQuestions.splice(questionIndex, 1)
        await company.save()

        res.json({
            success: true,
            message: 'Interview question removed successfully',
        })
    } catch (error) {
        console.error('Error removing interview question:', error)
        res.status(500).json({
            success: false,
            message: 'Error removing interview question',
            error: error.message,
        })
    }
}

// Admin: Get company with all linked problems populated
export const getCompanyWithProblems = async (req, res) => {
    try {
        const { id } = req.params

        const company = await Company.findById(id)
            .populate('rolesData.linkedDSAProblems.problem')
            .populate('rolesData.linkedDevProblems.problem')

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        res.json({
            success: true,
            data: company,
        })
    } catch (error) {
        console.error('Error fetching company with problems:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching company',
            error: error.message,
        })
    }
}

// Admin: Delete company (soft delete)
export const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params

        // Hard delete - permanently remove from database
        const company = await Company.findByIdAndDelete(id)

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        res.json({
            success: true,
            message: 'Company permanently deleted',
        })
    } catch (error) {
        console.error('Error deleting company:', error)
        res.status(500).json({
            success: false,
            message: 'Error deleting company',
            error: error.message,
        })
    }
}

// ============================================
// PATTERN MANAGEMENT
// ============================================

// Admin: Add pattern to company
export const addPattern = async (req, res) => {
    try {
        const { id } = req.params
        const { name, category, description, frequency, examples, tips } = req.body

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Pattern name is required',
            })
        }

        const company = await Company.findById(id)
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        company.patterns.push({
            name,
            category: category || 'DSA',
            description,
            frequency: frequency || 'Medium',
            examples: examples || [],
            tips: tips || [],
        })

        await company.save()

        res.json({
            success: true,
            message: 'Pattern added successfully',
            data: company,
        })
    } catch (error) {
        console.error('Error adding pattern:', error)
        res.status(500).json({
            success: false,
            message: 'Error adding pattern',
            error: error.message,
        })
    }
}

// Admin: Update pattern
export const updatePattern = async (req, res) => {
    try {
        const { id, patternId } = req.params
        const { name, category, description, frequency, examples, tips } = req.body

        const company = await Company.findById(id)
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        const patternIndex = company.patterns.findIndex(
            p => p._id.toString() === patternId
        )

        if (patternIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Pattern not found',
            })
        }

        const pattern = company.patterns[patternIndex]
        if (name) pattern.name = name
        if (category) pattern.category = category
        if (description !== undefined) pattern.description = description
        if (frequency) pattern.frequency = frequency
        if (examples) pattern.examples = examples
        if (tips) pattern.tips = tips

        await company.save()

        res.json({
            success: true,
            message: 'Pattern updated successfully',
            data: company,
        })
    } catch (error) {
        console.error('Error updating pattern:', error)
        res.status(500).json({
            success: false,
            message: 'Error updating pattern',
            error: error.message,
        })
    }
}

// Admin: Remove pattern from company
export const removePattern = async (req, res) => {
    try {
        const { id, patternId } = req.params

        const company = await Company.findById(id)
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        const patternIndex = company.patterns.findIndex(
            p => p._id.toString() === patternId
        )

        if (patternIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Pattern not found',
            })
        }

        company.patterns.splice(patternIndex, 1)
        await company.save()

        res.json({
            success: true,
            message: 'Pattern removed successfully',
        })
    } catch (error) {
        console.error('Error removing pattern:', error)
        res.status(500).json({
            success: false,
            message: 'Error removing pattern',
            error: error.message,
        })
    }
}
