import { codeExecutionQueue } from './setup.js'
import { Job } from 'bullmq'

/**
 * Queue a code execution job
 * @param {string} problemId - Problem ID or slug
 * @param {string} code - User's code
 * @param {string} language - Programming language
 * @param {Array} testCases - Test cases to run
 * @param {string} userId - User ID
 * @param {Object} problem - Problem object with metadata
 * @returns {Promise<Object>} Job object with id
 */
export async function queueCodeExecution(problemId, code, language, testCases, userId, problem) {
    const job = await codeExecutionQueue.add(
        'execute-code',
        {
            problemId,
            code,
            language,
            testCases,
            userId,
            problem: {
                _id: problem._id,
                slug: problem.slug, // CRITICAL: Needed for type inference!
                title: problem.title,
                difficulty: problem.difficulty,
                timeLimit: problem.timeLimit,
                memoryLimit: problem.memoryLimit,
                functionName: problem.functionName,
                parameters: problem.parameters,
                returnType: problem.returnType,
                testCases: problem.testCases, // Needed for code wrapping
            },
        },
        {
            jobId: `${userId}-${problemId}-${Date.now()}`, // Unique job ID
            priority: 1, // Normal priority
        }
    )

    console.log(`📤 Queued code execution job: ${job.id}`)

    return {
        jobId: job.id,
        status: 'queued',
    }
}

/**
 * Get job status by ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Job status and result
 */
export async function getJobStatus(jobId) {
    let job = await Job.fromId(codeExecutionQueue, jobId)

    if (!job) {
        console.log(`❌ Job ${jobId} not found in queue`)
        return {
            found: false,
            error: 'Job not found',
        }
    }

    const state = await job.getState()

    // For completed/failed jobs, fetch fresh data from Redis
    if (state === 'completed' || state === 'failed') {
        job = await Job.fromId(codeExecutionQueue, jobId) // Re-fetch for fresh data
    }

    const progress = job.progress || 0

    console.log(`🔍 Job ${jobId} state: ${state}, progress: ${progress}`)
    if (state === 'completed') {
        console.log(`✅ Job ${jobId} returnvalue:`, job.returnvalue ? 'exists' : 'null')
    }

    const response = {
        found: true,
        jobId: job.id,
        status: state, // 'waiting', 'active', 'completed', 'failed'
        progress,
        data: job.data,
    }

    // Add result if completed
    if (state === 'completed') {
        response.result = job.returnvalue
    }

    // Add error if failed
    if (state === 'failed') {
        response.error = job.failedReason
        response.stacktrace = job.stacktrace
    }

    return response
}

export { codeExecutionQueue }
