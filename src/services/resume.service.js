import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini client with API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'AIzaSyAfWUg1o9Df6Y5-pbTP6yFaigg8PzeYKu8')

/**
 * Clean extracted text from PDF
 */
export function cleanResumeText(text) {
    return text
        .replace(/\r\n/g, '\n')          // Normalize line breaks
        .replace(/\n{2,}/g, '\n\n')      // Reduce extra newlines
        .replace(/[•●▪]/g, '-')          // Normalize bullets
        .replace(/\t/g, ' ')             // Remove tabs
        .replace(/ +/g, ' ')             // Reduce multiple spaces
        .trim()
}

/**
 * Extract text from PDF buffer using pdfjs-dist
 */
export async function extractTextFromPDF(fileBuffer) {
    try {
        // Convert Buffer to Uint8Array for pdfjs-dist
        const uint8Array = new Uint8Array(fileBuffer)

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array })
        const pdf = await loadingTask.promise

        let fullText = ''

        // Extract text from each page
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items.map(item => item.str).join(' ')
            fullText += pageText + '\n'
        }

        const rawText = fullText.trim()

        if (!rawText || rawText.length < 100) {
            throw new Error('PDF appears to be empty or unreadable')
        }

        const cleanedText = cleanResumeText(rawText)

        if (cleanedText.length < 300) {
            throw new Error('Resume text too short or unreadable. Please upload a more detailed resume.')
        }

        return {
            rawText,
            cleanedText,
        }
    } catch (error) {
        throw new Error(`Failed to extract text from PDF: ${error.message}`)
    }
}

/**
 * Structure resume text using Gemini AI
 */
export async function structureResumeWithAI(cleanedText) {
    const schema = {
        name: '',
        email: '',
        phone: '',
        totalExperienceYears: 0,
        skills: {
            languages: [],
            frameworks: [],
            databases: [],
            tools: [],
            other: [],
        },
        experience: [
            {
                company: '',
                role: '',
                duration: '',
                techStack: [],
                highlights: [],
            },
        ],
        projects: [
            {
                name: '',
                description: '',
                techStack: [],
                complexity: 'basic | medium | advanced',
            },
        ],
        education: [
            {
                degree: '',
                institution: '',
                year: '',
            },
        ],
        strengthAreas: [],
        potentialGaps: [],
    }

    const prompt = `You are a professional resume parser. Extract structured information from the resume text below.

RULES:
- Return STRICT JSON only, no markdown, no explanations
- Do not add extra keys beyond the schema
- If information is missing, use empty string "" or empty array []
- For totalExperienceYears, calculate from work history (whole number)
- For skills, categorize correctly into languages, frameworks, databases, tools, other
- For project complexity, choose one of: "basic", "medium", "advanced"
- Infer strengthAreas (e.g., "Full-Stack Development", "Cloud Architecture")
- Infer potentialGaps (e.g., "Limited DevOps experience", "No system design projects")

JSON FORMAT:
${JSON.stringify(schema, null, 2)}

Resume text:
"""
${cleanedText}
"""

Return ONLY the JSON object, nothing else.`

    try {
        // Use Gemini 2.5 Flash model
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

        const result = await model.generateContent(prompt)
        const response = await result.response
        const responseText = response.text()

        // Extract JSON from response (in case Gemini adds markdown)
        let jsonText = responseText.trim()
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\n?/g, '')
        }

        const structuredData = JSON.parse(jsonText)

        // Validate required structure
        if (!structuredData || typeof structuredData !== 'object') {
            throw new Error('Invalid resume structure from AI')
        }

        // Ensure all required fields exist
        const validatedData = {
            name: structuredData.name || '',
            email: structuredData.email || '',
            phone: structuredData.phone || '',
            totalExperienceYears: Number(structuredData.totalExperienceYears) || 0,
            skills: {
                languages: Array.isArray(structuredData.skills?.languages) ? structuredData.skills.languages : [],
                frameworks: Array.isArray(structuredData.skills?.frameworks) ? structuredData.skills.frameworks : [],
                databases: Array.isArray(structuredData.skills?.databases) ? structuredData.skills.databases : [],
                tools: Array.isArray(structuredData.skills?.tools) ? structuredData.skills.tools : [],
                other: Array.isArray(structuredData.skills?.other) ? structuredData.skills.other : [],
            },
            experience: Array.isArray(structuredData.experience) ? structuredData.experience : [],
            projects: Array.isArray(structuredData.projects) ? structuredData.projects : [],
            education: Array.isArray(structuredData.education) ? structuredData.education : [],
            strengthAreas: Array.isArray(structuredData.strengthAreas) ? structuredData.strengthAreas : [],
            potentialGaps: Array.isArray(structuredData.potentialGaps) ? structuredData.potentialGaps : [],
        }

        return validatedData
    } catch (error) {
        console.error('AI structuring error:', error)
        throw new Error(`Failed to structure resume with AI: ${error.message}`)
    }
}
