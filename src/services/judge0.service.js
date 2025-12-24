import axios from 'axios'

// Judge0 API Configuration
const JUDGE0_URL = process.env.JUDGE0_URL || 'http://143.244.130.62:2358'
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '' // Optional API key

// Language ID mappings for Judge0
const LANGUAGE_IDS = {
    javascript: 63, // JavaScript (Node.js)
    python: 71, // Python 3
    java: 62, // Java
    cpp: 54, // C++ (GCC)
    c: 50, // C (GCC)
    typescript: 74, // TypeScript
}

// Status ID mappings from Judge0
const STATUS_IDS = {
    1: 'In Queue',
    2: 'Processing',
    3: 'Accepted',
    4: 'Wrong Answer',
    5: 'Time Limit Exceeded',
    6: 'Compilation Error',
    7: 'Runtime Error (SIGSEGV)',
    8: 'Runtime Error (SIGXFSZ)',
    9: 'Runtime Error (SIGFPE)',
    10: 'Runtime Error (SIGABRT)',
    11: 'Runtime Error (NZEC)',
    12: 'Runtime Error (Other)',
    13: 'Internal Error',
    14: 'Exec Format Error',
}

/**
 * Create a submission on Judge0
 * @param {string} sourceCode - The source code to execute
 * @param {string} language - Programming language (javascript, python, java, cpp)
 * @param {string} stdin - Input data for the program
 * @param {string} expectedOutput - Expected output for comparison
 * @param {number} timeLimit - Time limit in seconds (default: 5)
 * @param {number} memoryLimit - Memory limit in KB (default: 256000 = 256MB)
 * @returns {Promise<string>} - Returns the submission token
 */
export const createSubmission = async (
    sourceCode,
    language,
    stdin = '',
    expectedOutput = '',
    timeLimit = 5,
    memoryLimit = 256000
) => {
    try {
        const languageId = LANGUAGE_IDS[language.toLowerCase()]

        if (!languageId) {
            throw new Error(`Unsupported language: ${language}`)
        }

        const submissionData = {
            source_code: Buffer.from(sourceCode).toString('base64'),
            language_id: languageId,
            expected_output: Buffer.from(expectedOutput).toString('base64'),
            cpu_time_limit: timeLimit,
            memory_limit: memoryLimit,
        }

        // JavaScript uses command-line arguments instead of stdin (Judge0 sandbox limitation)
        if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'js') {
            // Convert newline-separated input to space-separated arguments
            // Example: "[2,7,11,15]\n9" becomes "[2,7,11,15] 9"
            const argsString = stdin.split('\n').map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ');
            submissionData.command_line_arguments = argsString;
        } else {
            submissionData.stdin = Buffer.from(stdin).toString('base64'); // Other languages use stdin
        }

        // Add compiler options for C to link math library
        if (language.toLowerCase() === 'c') {
            submissionData.compiler_options = '-lm'
        }

        const headers = {
            'Content-Type': 'application/json',
        }

        if (JUDGE0_API_KEY) {
            headers['X-Auth-Token'] = JUDGE0_API_KEY
        }

        console.log(`Submitting to Judge0 (${language}):`, { ...submissionData, source_code: '...' })

        const response = await axios.post(`${JUDGE0_URL}/submissions?base64_encoded=true&wait=false`, submissionData, {
            headers,
        })

        console.log('Judge0 Submission Created:', response.data)

        return response.data.token
    } catch (error) {
        console.error('Error creating Judge0 submission:', error.response?.data || error.message)
        throw error
    }
}

/**
 * Get submission result from Judge0
 * @param {string} token - The submission token
 * @param {number} maxRetries - Maximum number of polling attempts (default: 10)
 * @param {number} retryDelay - Delay between retries in ms (default: 1000)
 * @returns {Promise<Object>} - Returns the submission result
 */
export const getSubmissionResult = async (token, maxRetries = 10, retryDelay = 1000) => {
    try {
        const headers = {}
        if (JUDGE0_API_KEY) {
            headers['X-Auth-Token'] = JUDGE0_API_KEY
        }

        let retries = 0

        while (retries < maxRetries) {
            const response = await axios.get(`${JUDGE0_URL}/submissions/${token}?base64_encoded=true`, {
                headers,
            })

            const result = response.data
            const statusId = result.status.id

            console.log('Judge0 Poll Result:', result) // Log the raw result from Judge0

            // Helper to decode base64
            const decode = (str) => {
                if (!str) return ''
                return Buffer.from(str, 'base64').toString('utf-8')
            }

            // Check if processing is complete (status ID > 2)
            if (statusId > 2) {
                return {
                    token,
                    status: STATUS_IDS[statusId] || 'Unknown',
                    statusId,
                    time: result.time, // Execution time in seconds
                    memory: result.memory, // Memory in KB
                    stdout: decode(result.stdout).trim(),
                    stderr: decode(result.stderr).trim(),
                    compileOutput: decode(result.compile_output).trim(),
                    message: decode(result.message),
                    exitCode: result.exit_code,
                    accepted: statusId === 3, // Accepted
                }
            }

            // Still processing, wait and retry
            await new Promise((resolve) => setTimeout(resolve, retryDelay))
            retries++
        }

        throw new Error('Submission timed out - maximum polling retries exceeded')
    } catch (error) {
        console.error('Error getting Judge0 submission result:', error.response?.data || error.message)
        throw new Error('Failed to get submission result from Judge0')
    }
}

/**
 * Run code against multiple test cases
 * @param {string} sourceCode - The source code to execute
 * @param {string} language - Programming language
 * @param {Array} testCases - Array of test cases with input and expectedOutput
 * @param {number} timeLimit - Time limit in seconds
 * @param {number} memoryLimit - Memory limit in KB
 * @returns {Promise<Object>} - Returns aggregated results
 */
export const runTestCases = async (sourceCode, language, testCases, timeLimit = 5, memoryLimit = 256000) => {
    try {
        // Create submissions for all test cases
        const submissionPromises = testCases.map((testCase) =>
            createSubmission(sourceCode, language, testCase.input, testCase.expectedOutput, timeLimit, memoryLimit)
        )

        const tokens = await Promise.all(submissionPromises)

        // Wait a bit for submissions to process
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Get results for all submissions
        const resultPromises = tokens.map((token) => getSubmissionResult(token))
        const results = await Promise.all(resultPromises)

        // Aggregate results
        const testResults = results.map((result, index) => ({
            testCaseId: testCases[index]._id || index,
            input: testCases[index].input,
            expectedOutput: testCases[index].expectedOutput,
            actualOutput: result.stdout,
            passed: result.accepted,
            executionTime: result.time,
            memory: result.memory,
            error: result.stderr || result.compileOutput || result.message || null,
            status: result.status,
        }))

        const passedCount = testResults.filter((r) => r.passed).length
        const allPassed = passedCount === testCases.length

        return {
            totalTestCases: testCases.length,
            passedTestCases: passedCount,
            testResults,
            accepted: allPassed,
            status: allPassed ? 'accepted' : 'wrong-answer',
            // Calculate average execution time and memory
            executionTime: results.reduce((sum, r) => sum + (parseFloat(r.time) || 0), 0) / results.length,
            memoryUsed: results.reduce((sum, r) => sum + (parseInt(r.memory) || 0), 0) / results.length,
        }
    } catch (error) {
        console.error('Error running test cases:', error)
        throw error
    }
}

/**
 * Get supported languages
 * @returns {Array} - Array of supported language objects
 */
export const getSupportedLanguages = () => {
    return Object.entries(LANGUAGE_IDS).map(([name, id]) => ({
        name,
        id,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
    }))
}

export default {
    createSubmission,
    getSubmissionResult,
    runTestCases,
    getSupportedLanguages,
    LANGUAGE_IDS,
    STATUS_IDS,
}
