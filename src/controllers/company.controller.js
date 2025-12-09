import { Company, CompanyApplication, User, DSAProblem, DevelopmentProblem } from '../models/index.js'

// Get all companies with filters
export const getAllCompanies = async (req, res) => {
    try {
        const {
            difficulty,
            minPackage,
            maxPackage,
            location,
            isHiring,
            page = 1,
            limit = 20,
            sort = '-stats.preparing',
        } = req.query

        const query = { isActive: true }

        if (difficulty) query.difficulty = difficulty
        if (isHiring !== undefined) query.isHiring = isHiring === 'true'
        if (location) query.locations = location

        if (minPackage || maxPackage) {
            query['averagePackage.min'] = {}
            if (minPackage) query['averagePackage.min'].$gte = parseInt(minPackage)
            if (maxPackage) query['averagePackage.max'].$lte = parseInt(maxPackage)
        }

        const skip = (page - 1) * limit

        const companies = await Company.find(query)
            .select('-hiringPipeline.questions') // Don't send all questions in list
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))

        const total = await Company.countDocuments(query)

        res.json({
            success: true,
            data: companies,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error('Error fetching companies:', error)
        res.status(500).json({
            success: false,
            message: 'Error fetching companies',
            error: error.message,
        })
    }
}

// Get single company details
export const getCompany = async (req, res) => {
    try {
        const { id } = req.params

        const company = await Company.findOne({
            $or: [{ _id: id }, { slug: id }],
            isActive: true,
        })

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        // Get user's application status if authenticated
        let userApplication = null
        if (req.user) {
            userApplication = await CompanyApplication.findOne({
                user: req.user._id,
                company: company._id,
            })
        }

        res.json({
            success: true,
            data: {
                company,
                userApplication,
            },
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

// Admin: Link DSA problem to company
export const linkDSAProblem = async (req, res) => {
    try {
        const { id } = req.params
        const { problemId, frequency, round, notes } = req.body

        if (!problemId) {
            return res.status(400).json({
                success: false,
                message: 'Problem ID is required',
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

        const company = await Company.findByIdAndUpdate(
            id,
            {
                $push: {
                    linkedDSAProblems: {
                        problem: problemId,
                        frequency: frequency || 'Medium',
                        round,
                        notes,
                        lastAsked: new Date(),
                    },
                },
            },
            { new: true }
        ).populate('linkedDSAProblems.problem')

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        res.json({
            success: true,
            message: 'DSA problem linked successfully',
            data: company,
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

        const company = await Company.findByIdAndUpdate(
            id,
            {
                $pull: {
                    linkedDSAProblems: { _id: linkId },
                },
            },
            { new: true }
        )

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        res.json({
            success: true,
            message: 'DSA problem unlinked successfully',
            data: company,
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

// Admin: Link Dev problem to company
export const linkDevProblem = async (req, res) => {
    try {
        const { id } = req.params
        const { problemId, frequency, round, notes } = req.body

        if (!problemId) {
            return res.status(400).json({
                success: false,
                message: 'Problem ID is required',
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

        const company = await Company.findByIdAndUpdate(
            id,
            {
                $push: {
                    linkedDevProblems: {
                        problem: problemId,
                        frequency: frequency || 'Medium',
                        round,
                        notes,
                        lastAsked: new Date(),
                    },
                },
            },
            { new: true }
        ).populate('linkedDevProblems.problem')

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        res.json({
            success: true,
            message: 'Development problem linked successfully',
            data: company,
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

        const company = await Company.findByIdAndUpdate(
            id,
            {
                $pull: {
                    linkedDevProblems: { _id: linkId },
                },
            },
            { new: true }
        )

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        res.json({
            success: true,
            message: 'Development problem unlinked successfully',
            data: company,
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

// Admin: Add interview question to company
export const addInterviewQuestion = async (req, res) => {
    try {
        const { id } = req.params
        const { question, type, difficulty, round, answer, tips } = req.body

        if (!question || !type) {
            return res.status(400).json({
                success: false,
                message: 'Question and type are required',
            })
        }

        const company = await Company.findByIdAndUpdate(
            id,
            {
                $push: {
                    interviewQuestions: {
                        question,
                        type,
                        difficulty,
                        round,
                        answer,
                        tips: tips || [],
                        askedDate: new Date(),
                        upvotes: 0,
                    },
                },
            },
            { new: true }
        )

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

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

        const company = await Company.findByIdAndUpdate(
            id,
            {
                $pull: {
                    interviewQuestions: { _id: questionId },
                },
            },
            { new: true }
        )

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        res.json({
            success: true,
            message: 'Interview question removed successfully',
            data: company,
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
            .populate('linkedDSAProblems.problem')
            .populate('linkedDevProblems.problem')

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

        const company = await Company.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        )

        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Company not found',
            })
        }

        res.json({
            success: true,
            message: 'Company deleted successfully',
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
