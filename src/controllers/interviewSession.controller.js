import { MockInterviewSession, MockInterview, Resume, UserProgress } from '../models/index.js'

export const startSession = async (req, res) => {
    try {
        const { interviewId, difficulty, strictness, language, voiceId } = req.body
        const userId = req.user._id

        console.log('🔍 START SESSION DEBUG:', {
            interviewId,
            difficulty,
            strictness,
            language,
            voiceId,
            userId
        })

        const interview = await MockInterview.findById(interviewId)
        if (!interview) {
            return res.status(404).json({ success: false, message: 'Interview not found' })
        }

        const resume = await Resume.findOne({ userId: userId }).sort({ createdAt: -1 })

        console.log('Resume found:', resume ? 'Yes' : 'No')
        if (resume) {
            console.log('Resume parsedData:', JSON.stringify(resume.parsedData, null, 2))
        }

        let userProgress = await UserProgress.findOne({ user: userId })
        if (!userProgress) {
            userProgress = await UserProgress.create({ user: userId })
        }

        console.log('\n=== STARTING INTERVIEW ===')
        console.log('Interview ID from request:', interviewId)
        console.log('User has', userProgress.interviewProgress.length, 'interview progress entries')
        userProgress.interviewProgress.forEach((p, idx) => {
            console.log(`Progress ${idx}:`, {
                interviewId: p.interviewId.toString(),
                currentStage: p.currentStage,
                match: p.interviewId.toString() === interviewId.toString()
            })
        })

        const existingProgress = userProgress.interviewProgress.find(
            p => p.interviewId.toString() === interviewId.toString()
        )
        const currentStage = existingProgress?.currentStage || 1

        console.log('Existing progress found:', existingProgress ? 'Yes' : 'No')
        if (existingProgress) {
            console.log('Progress details:', {
                currentStage: existingProgress.currentStage,
                overallScore: existingProgress.overallScore,
                totalAttempts: existingProgress.totalAttempts,
                areasGoodInLength: existingProgress.areasGoodIn?.length || 0,
                areasToWorkOnLength: existingProgress.areasToWorkOn?.length || 0,
                areasGoodIn: existingProgress.areasGoodIn,
                areasToWorkOn: existingProgress.areasToWorkOn
            })
        }
        console.log('Starting at stage:', currentStage)
        console.log('=========================\n')

        const session = await MockInterviewSession.create({
            user: userId,
            interviewTemplate: interviewId,
            status: 'in-progress',
            currentStage,
            responses: [],
            startedAt: new Date(),
            language: language || 'English',
            voiceId: voiceId || '21m00Tcm4TlvDq8ikWAM' // Rachel - default
        })

        console.log('🔍 GENERATING PROMPT WITH:', {
            language: language || 'English',
            voiceId: voiceId || '21m00Tcm4TlvDq8ikWAM',
            currentStage,
            hasProgress: !!existingProgress
        })

        const systemPrompt = interview.codingType
            ? generateCodingInterviewPrompt({
                interview,
                stage: interview.interviewStages.find(s => s.stage === currentStage),
                resume: resume?.parsedData,
                difficulty: difficulty || interview.interviewStages[currentStage - 1]?.difficulty,
                strictness: strictness || interview.interviewStages[currentStage - 1]?.strictness,
                progress: existingProgress,
                language: language || 'English'
            })
            : generateSystemPrompt({
                interview,
                stage: interview.interviewStages.find(s => s.stage === currentStage),
                resume: resume?.parsedData,
                difficulty: difficulty || interview.interviewStages[currentStage - 1]?.difficulty,
                strictness: strictness || interview.interviewStages[currentStage - 1]?.strictness,
                progress: existingProgress,
                language: language || 'English'
            })

        console.log('✅ SYSTEM PROMPT FIRST 500 CHARS:', systemPrompt.substring(0, 500))

        res.json({
            success: true,
            data: {
                sessionId: session._id,
                systemPrompt,
                currentStage,
                voiceId: session.voiceId,
                language: session.language,
                interview: {
                    title: interview.title,
                    icon: interview.icon,
                    codingType: interview.codingType,
                    stage: interview.interviewStages.find(s => s.stage === currentStage)
                }
            }
        })
    } catch (error) {
        console.error('Start session error:', error)
        res.status(500).json({ success: false, message: error.message })
    }
}

export const updateScore = async (req, res) => {
    try {
        const { id } = req.params
        const { stage, score, feedback, transcript } = req.body

        const session = await MockInterviewSession.findById(id).populate('interviewTemplate')
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' })
        }

        session.responses.push({
            stage,
            question: transcript?.aiQuestion || '',
            answer: transcript?.userAnswer || '',
            score,
            feedback,
            timeSpent: 0
        })

        let canProgress = false
        let nextStage = stage

        if (score >= 8) {
            canProgress = true
            nextStage = stage + 1
            session.currentStage = nextStage
        } else if (score >= 5) {
            canProgress = false // Retry same stage
        } else {
            canProgress = false // Practice mode
        }

        const totalStages = session.interviewTemplate.interviewStages.length
        if (nextStage > totalStages) {
            session.status = 'completed'
            session.completedAt = new Date()

            const avgScore = session.responses.reduce((sum, r) => sum + r.score, 0) / session.responses.length
            session.overallScore = avgScore
        }

        await session.save()

        await updateUserProgress(
            session.user,
            session.interviewTemplate._id,
            score,
            session.responses,
            session.currentStage,
            session.status === 'completed'
        )

        res.json({
            success: true,
            data: {
                canProgress,
                nextStage: nextStage <= totalStages ? nextStage : null,
                completed: session.status === 'completed',
                overallScore: session.overallScore,
                currentScore: score
            }
        })
    } catch (error) {
        console.error('Update score error:', error)
        res.status(500).json({ success: false, message: error.message })
    }
}

export const getSession = async (req, res) => {
    try {
        const { id } = req.params
        const session = await MockInterviewSession.findById(id)
            .populate('interviewTemplate')
            .populate('user', 'name email')

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' })
        }

        const resume = await Resume.findOne({ userId: session.user._id }).sort({ createdAt: -1 })

        console.log('Resume found for session:', resume ? 'Yes' : 'No')
        if (resume) {
            console.log('Resume name:', resume.parsedData?.name)
        }

        const userProgress = await UserProgress.findOne({ user: session.user._id })
        const existingProgress = userProgress?.interviewProgress.find(
            p => p.interviewId.toString() === session.interviewTemplate._id.toString()
        )

        const interview = session.interviewTemplate
        const currentStage = interview.interviewStages.find(s => s.stage === session.currentStage)

        const systemPrompt = interview.codingType
            ? generateCodingInterviewPrompt({
                interview,
                stage: currentStage,
                resume: resume?.parsedData,
                difficulty: currentStage?.difficulty,
                strictness: currentStage?.strictness,
                progress: existingProgress,
                language: session.language || 'English'
            })
            : generateSystemPrompt({
                interview,
                stage: currentStage,
                resume: resume?.parsedData,
                difficulty: currentStage?.difficulty,
                strictness: currentStage?.strictness,
                progress: existingProgress,
                language: session.language || 'English'
            })

        res.json({
            success: true,
            data: {
                ...session.toObject(),
                systemPrompt  // Include the generated prompt
            }
        })
    } catch (error) {
        console.error('Get session error:', error)
        res.status(500).json({ success: false, message: error.message })
    }
}

function generateSystemPrompt({ interview, stage, resume, difficulty, strictness, progress, language }) {
    const userName = resume?.name || 'Candidate'
    const firstName = userName.split(' ')[0] || 'there'
    const interviewType = interview.codingType ? 'Technical Coding' : 'Behavioral'

    console.log('🔍 LANGUAGE CHECK:', { language, isNotEnglish: language !== 'English' })

    const languageInstruction = language && language !== 'English'
        ? `🌍 CRITICAL LANGUAGE REQUIREMENT - NATURAL HINGLISH STYLE:

YOU MUST speak in NATURAL HINGLISH (Hindi + English mix) - exactly how Indians speak in real life.

HINGLISH RULES:
✅ Mix Hindi and English naturally - just like normal conversation
✅ Use casual, friendly phrases
✅ Keep technical terms in English (interview, project, experience, etc.)
✅ Use Hindi for connecting words and casual talk

NATURAL PHRASES TO USE:
- "Kya aap sun rahe ho?" (Can you hear me?)
- "Samjhe?" or "Clear hai?" (Understand? / Is it clear?)
- "Thik hai, chalo shuru karte hain" (Okay, let's start)
- "Bahut accha!" (Very good!)
- "Aap batao..." (Tell me...)
- "Mujhe lagta hai..." (I think...)
- "Dekhiye..." (Look...)
- "Basically..." (Basically...)
- "Matlab..." (I mean...)

EXAMPLES:
✅ GOOD: "Hey! Aap kaise ho? Main Tanya hun aur aaj main aapka interview lungi. Ready ho?"
✅ GOOD: "Bahut accha! Toh basically, hum 10 minutes ka session karne wale hain. Clear hai?"
✅ GOOD: "Aapne Salesforce mein internship ki thi, right? Batao kya kiya tha?"

❌ AVOID: Pure formal Hindi like "साक्षात्कार" - instead say "interview"
❌ AVOID: Stiff translations - keep it natural and conversational

Speak like a friendly Indian colleague - mix languages naturally!
==========================================
`
        : language === 'English'
            ? `💬 CONVERSATIONAL ENGLISH STYLE:

Speak in a NATURAL, CASUAL, FRIENDLY way - like chatting with a friend.

USE THESE NATURAL PHRASES:
- "How's it going?" instead of "How are you?"
- "Got it?" or "Make sense?" instead of "Do you understand?"
- "Awesome!" or "Great stuff!" instead of "Very good"
- "So basically..." to explain things
- "You know what I mean?" for emphasis
- "Let's dive in" instead of "Let's begin"
- "Cool!" or "Nice!" for encouragement
- "Alright" or "Okay" as transitions

EXAMPLES:
✅ "Hey! Great to meet you! I'm Tanya and I'll be interviewing you today. Ready to get started?"
✅ "Awesome! So basically, we'll chat for about 10 minutes. Sound good?"
✅ "Nice! I saw you did an internship at Salesforce - tell me about that experience!"

Keep it warm, friendly, and conversational - not robotic!
==========================================
`
            : ''

    console.log('🔍 LANGUAGE INSTRUCTION LENGTH:', languageInstruction.length)
    console.log('🔍 LANGUAGE INSTRUCTION PREVIEW:', languageInstruction.substring(0, 200))

    console.log('🔍 PROGRESS CONTEXT:', {
        hasProgress: !!progress,
        totalAttempts: progress?.totalAttempts,
        areasGoodIn: progress?.areasGoodIn?.length,
        areasToWorkOn: progress?.areasToWorkOn?.length
    })

    const resumeCallout = resume ? getResumeCallout(resume) : ''
    const resumeText = resume ? ` - ${resumeCallout}. That's really cool!` : ' and I\'m excited to learn more about you!'

    const resumeRefText = resume ? getResumeReferenceText(resume) : ''

    const topicsText = formatTopicsNaturally(stage.topics)

    const strictnessText = getStrictnessExplanation(strictness)

    let progressContext = ''
    if (progress && progress.stageScores && progress.stageScores.length > 0) {
        const previousStages = progress.stageScores
            .filter(s => s.stage < stage.stage)
            .sort((a, b) => a.stage - b.stage)

        if (previousStages.length > 0) {
            progressContext = '\n\n📊 **PREVIOUS PERFORMANCE:**\n'
            previousStages.forEach(s => {
                progressContext += `- Stage ${s.stage}: Score ${s.score}/10\n`
            })

            if (progress.areasToWorkOn && progress.areasToWorkOn.length > 0) {
                progressContext += `\n🎯 **Areas to Improve:** ${progress.areasToWorkOn.join(', ')}`
            }

            if (progress.areasGoodIn && progress.areasGoodIn.length > 0) {
                progressContext += `\n💪 **Strengths:** ${progress.areasGoodIn.join(', ')}`
            }

            progressContext += '\n\nUse this context to provide continuity and reference their progress when appropriate.'
        }
    }

    const roleDesc = interview.codingType ?
        `Think of me as a friendly technical interviewer who's genuinely interested in understanding how you solve problems. I'll ask you coding questions, and I'll want to understand your thought process, edge cases, and optimization approach.` :
        `Think of me as a friendly interviewer who wants to understand your experiences using the STAR method (Situation, Task, Action, Result). I'll probe deeper to really understand how you think and handle situations!`

    const interviewGuidance = getInterviewQuestionGuidance(interview.codingType, stage, resume, strictness)

    const resumeHighlights = resume ? extractResumeHighlights(resume) : ''

    const personalityGuidance = strictness >= 7 ? 'Maintain high standards and probe deeply' : strictness >= 4 ? 'Balance encouragement with thorough assessment' : 'Be very supportive and guide the candidate'

    let previousProgressGreeting = ''
    if (progress && progress.totalAttempts && progress.totalAttempts >= 1) {
        console.log('✅ BUILDING PROGRESS GREETING - User has previous attempts:', progress.totalAttempts)

        const goodPoints = progress.areasGoodIn && progress.areasGoodIn.length > 0
            ? progress.areasGoodIn.map((area, i) => `${i + 1}. ${area}`).join('\n')
            : '- You showed great effort and willingness to learn'

        const improvementAreas = progress.areasToWorkOn && progress.areasToWorkOn.length > 0
            ? progress.areasToWorkOn.map((area, i) => `${i + 1}. ${area}`).join('\n')
            : '- We\'ll continue building on your foundation'

        previousProgressGreeting = `

By the way, I noticed you've done this interview before! Last time we met, here's what stood out:

💪 **What You Did Well:**
${goodPoints}

🎯 **Areas We'll Focus On Today:**
${improvementAreas}

So today, let's really nail those improvement areas! I'm excited to see your progress.`
    } else {
        console.log('❌ NO PROGRESS GREETING - First attempt or no data')
    }

    const prompt = `You are Tanya, an expert AI interviewer with warmth and professionalism.${languageInstruction}

YOUR CONVERSATIONAL FLOW (CRITICAL - FOLLOW THIS EXACTLY):

==========================================
STAGE 1: GREETING & INTRODUCTION
==========================================
Start with a warm, friendly greeting:

"Hey ${firstName}! Great to see you here. I'm Tanya${resumeText}${previousProgressGreeting}

We'll be spending about ${stage.duration} minutes together focusing on ${stage.stageName}. No pressure though - take your time to get comfortable.

Are you ready to begin, or would you like me to explain how this will work first?"

THEN WAIT for user response.

==========================================
STAGE 2: INTERVIEW BRIEFING  
==========================================
If user asks for explanation OR says "explain" OR "how does it work":

Say:
"Awesome! Let me walk you through it.

📌 **What We'll Cover:**
We're doing a ${interviewType} interview, specifically focusing on **${stage.stageName}** (this is Level ${stage.stage}). The main topics we'll dive into are: ${topicsText}.

⏱️ **Time:**
We've got about ${stage.duration} minutes. Don't worry, I'll keep track of time so you can focus on showcasing your skills.

🎯 **My Role:**
${roleDesc}

📊 **Difficulty Level:**
This stage is set to **${difficulty}**, with evaluation strictness of ${strictness}/10. ${strictnessText}

${resumeRefText}

📝 **At the End:**
I'll provide:
- A score out of 10
- Detailed feedback on what you did well
- Top 2 specific areas for improvement

Sound good? Ready to get started? 🚀"

WAIT for confirmation.

If user says "ready", "yes", "let's go", "start", etc. - proceed to Stage 3.

==========================================
STAGE 3: BEGIN INTERVIEW
==========================================
When user confirms they're ready:

Say:
"Perfect! Alright ${firstName}, let's do this!

Remember, just be yourself and take your time to think through your answers. There's no rush.

Let's start with..."

THEN ask your first question.

==========================================
DURING INTERVIEW
==========================================

CANDIDATE INFO:
- Name: ${userName}
${resumeHighlights}
${progressContext}

INTERVIEW DETAILS:
- Type: ${interviewType}
- Stage: ${stage.stageName} (Level ${stage.stage})
- Duration: ${stage.duration} mins
- Topics: ${stage.topics.join(', ')}
- Difficulty: ${difficulty}
- Strictness: ${strictness}/10

⚠️ **CRITICAL - TOPIC FOCUS:**
- ONLY ask questions related to: ${stage.topics.join(', ')}
- DO NOT ask about topics from other stages
- If candidate tries to discuss other topics, politely redirect: "That's interesting, but let's focus on ${stage.topics[0]} for this stage. We'll cover other areas in later stages."
- Stay strictly within the scope of this stage's topics

YOUR INTERVIEWING APPROACH:
${interviewGuidance}

PERSONALITY:
- Be warm, encouraging, and professional
- Use natural language like a human would
- ${personalityGuidance}
- Reference their resume naturally (e.g., "In your role at [Company]...", "Your [Project] project sounds interesting...")
- Acknowledge responses authentically ("That's a great point!", "Interesting approach!", "I appreciate that perspective")
- Ask thoughtful follow-ups based on their answers
- Don't sound like ChatGPT - be conversational and human-like

==========================================
STAGE 4: FINAL SCORING
==========================================

After ${stage.duration} minutes or sufficient questions, give verbal feedback:

"Alright ${firstName}, that wraps up our interview! Great job working through that with me.

**📊 Your Score: [X]/10**

**💪 What You Did Well:**
[2-3 specific sentences with examples]

**🎯 Top 2 Areas for Improvement:**
1. [Specific area with actionable advice]
2. [Specific area with actionable advice]

**Next Steps:**
[If 8-10]: Fantastic work! You're ready to move on to the next stage. Keep it up! 🎉
[If 5-7]: Good effort! Review this feedback and give this stage another try.
[If 0-4]: I can see your potential! Practice the areas above and come back when ready.

Any questions about the feedback?"

🔴 **CRITICAL - AFTER GIVING FEEDBACK:**
IMMEDIATELY call the submitFeedback function with:
- score: the actual score you gave (0-10)
- areasGoodIn: array of 2-3 things they did well
- areasToWorkOn: array of 2 areas for improvement

This will automatically save the feedback and end the interview.

==========================================
SCORING CRITERIA
==========================================
Rate 0-10 based on:
- Clarity of communication (25%)
- Depth of knowledge (25%)
- Problem-solving approach (25%)
- Relevant examples (25%)

CRITICAL REMINDERS:
✓ Follow the 3-stage flow: Greeting → Briefing → Interview
✓ WAIT for user confirmation at each stage
        ✓ Reference resume naturally throughout
        ✓ Be HUMAN, not robotic
        ✓ Make candidate feel comfortable and valued
        ✓ Don't just start the interview immediately when user says hello`

    console.log('\n=== ENHANCED SYSTEM PROMPT GENERATED ===')
    console.log(prompt)
    console.log('================================\n')

    return prompt
}

function generateCodingInterviewPrompt({ interview, stage, resume, difficulty, strictness, progress, language }) {
    const userName = resume?.name || 'Candidate'
    const firstName = userName.split(' ')[0] || 'there'
    const topics = stage.topics || []
    const topicsFallback = [
        topics[0] || 'Arrays',
        topics[1] || 'Strings',
        topics[2] || 'LinkedList',
        'HashMaps',
        'Dynamic Programming'
    ]

    let previousProgressGreeting = ''
    if (progress && progress.totalAttempts && progress.totalAttempts >= 1) {
        const goodPoints = progress.areasGoodIn && progress.areasGoodIn.length > 0
            ? progress.areasGoodIn.map((area, i) => `${i + 1}. ${area}`).join('\n')
            : '- You showed great effort'
        const improvementAreas = progress.areasToWorkOn && progress.areasToWorkOn.length > 0
            ? progress.areasToWorkOn.map((area, i) => `${i + 1}. ${area}`).join('\n')
            : "- We'll build on your foundation"
        previousProgressGreeting = `\n\n💪 I see you've done this before! Last time you did well with:\n${goodPoints}\n\nToday we'll focus on improving:\n${improvementAreas}`
    }

    const languageInstruction = language && language !== 'English'
        ? `🌍 LANGUAGE: Speak in natural HINGLISH (Hindi + English mix). Mix casually like real Indian conversation. Keep technical terms in English.`
        : `💬 LANGUAGE: Speak naturally in casual, friendly English. Be warm, not robotic.`

    const prompt = `You are Tanya, an expert AI coding interviewer. ${languageInstruction}

==========================================
🚨 ABSOLUTE RULES — NEVER BREAK THESE:
==========================================
1. The coding problem is ALREADY loaded on the candidate's screen before this call started.
   It is shown to you in the PRE-LOADED PROBLEM section below.
2. Do NOT call searchDSAProblems or loadDSAProblem — they are DISABLED for this session.
3. Use readCode() to check the candidate's actual code — do NOT assume what they wrote.
4. ONLY call submitFeedback() AFTER reading their final code with readCode().

==========================================
🎬 INTERVIEW FLOW — FOLLOW THIS EXACTLY:
==========================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: GREET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Say: "Hey! Great to have you here — I'm Tanya, your coding interviewer today. I've already loaded a question on your screen — are you ready to dive in?"
Wait silently for confirmation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: EXPLAIN THE PROBLEM (when candidate says ready)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Say: "Perfect! So the problem on your screen is called [PROBLEM_TITLE_PLACEHOLDER].
Here's a quick summary: [PROBLEM_DESC_PLACEHOLDER].
[PROBLEM_EXAMPLE_PLACEHOLDER]
Take a moment to read it on screen. You can walk me through your approach first, or jump straight into coding — totally your call. Let me know when you're done or if you need a hint!"

Then WAIT. Let them respond or start coding.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: MONITOR CODING

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Check on their code:
- Call readCode() every 3 minutes to monitor progress
- Do NOT interrupt while they're actively explaining or coding
- If they seem stuck (silent for 4+ minutes): "Need a nudge? I can give you a hint without spoiling it."

💬 Good check-in phrases:
- "How's it going? Any edge cases you're thinking about?"
- "What's the time complexity of your current approach?"
- "You're doing well — let me know when you're ready for feedback."

⏰ SILENCE IS NORMAL — candidate is coding. Do NOT interrupt or end the session.
Only check in if silent for 5+ minutes:
1. Ask: "Hey, still working on it? How's it going?"
2. Wait for response and continue.
NEVER call submitFeedback due to silence. ONLY call it when the candidate says they're done.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5: EVALUATION (when candidate says done / time is up)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Say: "Awesome, let me take a look at your code!"
2. Call readCode() — read what they actually wrote
3. Give verbal feedback:

"Alright ${firstName}, here's my assessment!

📊 Score: [X]/10

💪 What You Did Well:
- [specific strength 1]
- [specific strength 2]

🎯 Top 2 Areas to Improve:
1. [actionable advice]
2. [actionable advice]

${strictness >= 7 ? 'For future: always analyze both time AND space complexity explicitly.' : 'Overall solid effort — keep practicing!'}"

4. IMMEDIATELY call:
submitFeedback({
  score: [0-10],
  areasGoodIn: ["strength1", "strength2"],
  areasToWorkOn: ["improvement1", "improvement2"]
})

==========================================
SCORING RUBRIC (0-10):
==========================================
- Problem-Solving Approach (30%)
- Code Quality & Correctness (25%)
- Edge Case Handling (20%)
- Time/Space Complexity Analysis (15%)
- Communication & Clarity (10%)

8-10: Excellent — optimal or near-optimal solution
5-7: Good effort — works but needs optimization
0-4: Needs more practice — significant issues

==========================================
CANDIDATE:
==========================================
- Name: ${userName}
- Stage: ${stage.stageName} (Level ${stage.stage})
- Topics: ${topics.join(', ')}
- Duration: ${stage.duration} minutes
- Difficulty: ${difficulty}
- Strictness: ${strictness}/10

🎤 YOUR PERSONALITY:
- Warm, encouraging, professional
- ${strictness >= 7 ? 'High standards — push them to think deeper' : 'Supportive — guide them when stuck'}
- Human and conversational — never robotic
- Reference resume context naturally when relevant

🚨 FINAL REMINDERS:
✓ NEVER describe the problem verbally — it's on screen
✓ ALWAYS retry problem loading up to 5 times before creating
✓ SHOW problem FIRST, THEN explain and ask approach
✓ readCode() before giving any code feedback
✓ submitFeedback() at the very end`

    console.log('\n=== CODING INTERVIEW PROMPT GENERATED ===')
    console.log('Prompt length:', prompt.length)
    console.log('================================\n')

    return prompt
}

function extractResumeHighlights(resume) {
    if (!resume) return ''

    let text = ''

    if (resume.experience?.length > 0) {
        const exp = resume.experience[0]
        text += `\n- Recent: ${exp.role} at ${exp.company}${exp.duration ? ` (${exp.duration})` : ''}`
        if (resume.experience.length > 1) text += `\n- ${resume.experience.length - 1} other role(s)`
    }

    const allSkills = []
    if (resume.skills) {
        if (resume.skills.languages) allSkills.push(...resume.skills.languages)
        if (resume.skills.frameworks) allSkills.push(...resume.skills.frameworks)
        if (resume.skills.databases) allSkills.push(...resume.skills.databases)
        if (resume.skills.tools) allSkills.push(...resume.skills.tools)
    }
    if (allSkills.length > 0) {
        text += `\n- Skills: ${allSkills.slice(0, 5).join(', ')}${allSkills.length > 5 ? '...' : ''}`
    }

    if (resume.projects?.length > 0) {
        text += `\n- Projects: ${resume.projects.slice(0, 2).map(p => p.name).join(', ')}`
    }

    if (resume.education?.length > 0) {
        text += `\n- Education: ${resume.education[0].degree} from ${resume.education[0].institution}`
    }

    return text
}

function getResumeCallout(resume) {
    if (!resume) return 'uploaded your info'

    if (resume.experience?.length > 0) {
        return `I see you worked as ${resume.experience[0].role} at ${resume.experience[0].company}`
    }
    if (resume.projects?.length > 0) {
        return `I see you built ${resume.projects[0].name}`
    }
    if (resume.education?.length > 0) {
        return `I see you studied ${resume.education[0].degree}`
    }
    return 'I see your background'
}

function getResumeReferenceText(resume) {
    const parts = []
    if (resume.experience?.length > 0) parts.push(`your experience at ${resume.experience[0].company}`)
    if (resume.projects?.length > 0) parts.push(`your ${resume.projects[0].name} project`)

    if (parts.length > 0) {
        return `Since I've seen your resume, I might reference ${parts.join(' or ')} to make our conversation more relevant.\n`
    }
    return ''
}

function formatTopicsNaturally(topics) {
    if (!topics || topics.length === 0) return 'various topics'
    if (topics.length === 1) return topics[0]
    if (topics.length === 2) return `${topics[0]} and ${topics[1]}`
    return `${topics.slice(0, -1).join(', ')}, and ${topics[topics.length - 1]}`
}

function getStrictnessExplanation(strictness) {
    if (strictness >= 8) return "I'll be thorough and expect detailed, well-structured responses."
    if (strictness >= 5) return "I'll balance encouragement with thorough assessment."
    return "I'll be supportive and guide you along the way."
}

function getInterviewQuestionGuidance(isCoding, stage, resume, strictness) {
    if (isCoding) {
        return `**Technical Questions:**
- Ask DSA/coding problems on: ${stage.topics.join(', ')}
- Evaluate: approach, code quality, edge cases, optimization
- Encourage thinking aloud
- Ask follow-ups about complexity and alternatives
${resume?.experience?.[0] ? `- Connect to experience: "Have you faced similar challenges at ${resume.experience[0].company}?"` : ''}`
    } else {
        return `**Behavioral Questions (STAR method):**
- Focus on: ${stage.topics.join(', ')}
- Probe: "Tell me more...", "How did you handle...", "What was the result?"
${resume?.experience?.[0] ? `- Reference background: "In your role at ${resume.experience[0].company}..."` : ''}
${resume?.projects?.[0] ? `- Or: "When building ${resume.projects[0].name}..."` : ''}
- Look for: specific examples, clarity, self-awareness`
    }
}

async function updateUserProgress(userId, interviewId, overallScore, responses, currentStage, isCompleted) {
    let userProgress = await UserProgress.findOne({ user: userId })

    if (!userProgress) {
        userProgress = await UserProgress.create({ user: userId })
    }

    const existingIndex = userProgress.interviewProgress.findIndex(
        p => p.interviewId.toString() === interviewId.toString()
    )

    let areasGoodIn = []
    let areasToWorkOn = []

    if (responses && responses.length > 0) {
        const lastResponse = responses[responses.length - 1]
        const feedbackText = lastResponse.feedback || ''

        const goodMatch = feedbackText.match(/What You Did Well[:\s]*([\s\S]*?)(?=Top.*Areas for Improvement|Areas for Improvement|$)/i)
        if (goodMatch && goodMatch[1]) {
            const goodPoints = goodMatch[1]
                .split(/\d+\.|[•\-]/)  // Split by numbers or bullets
                .map(s => s.trim())
                .filter(s => s.length > 10 && s.length < 200)  // Valid feedback length
            areasGoodIn = goodPoints.slice(0, 3) // Max 3 points
        }

        const improveMatch = feedbackText.match(/(?:Top.*)?Areas for Improvement[:\s]*([\s\S]*?)(?=Next Steps|$)/i)
        if (improveMatch && improveMatch[1]) {
            const improvePoints = improveMatch[1]
                .split(/\d+\.|[•\-]/)  // Split by numbers or bullets
                .map(s => s.trim())
                .filter(s => s.length > 10 && s.length < 200)  // Valid feedback length
            areasToWorkOn = improvePoints.slice(0, 2) // Max 2 points
        }
    }

    const progressData = {
        interviewId,
        interviewType: 'Mock Interview',
        currentStage: currentStage || responses.length,
        overallScore,
        areasGoodIn,
        areasToWorkOn,
        totalAttempts: existingIndex >= 0 ? userProgress.interviewProgress[existingIndex].totalAttempts + 1 : 1,
        lastAttemptDate: new Date(),
        stageScores: responses.map(r => ({
            stage: r.stage,
            score: r.score,
            attemptedAt: new Date()
        }))
    }

    if (existingIndex >= 0) {
        userProgress.interviewProgress[existingIndex] = {
            ...userProgress.interviewProgress[existingIndex].toObject(),
            ...progressData
        }
    } else {
        userProgress.interviewProgress.push(progressData)
    }

    await userProgress.save()
    console.log('User progress updated:', { interviewId, currentStage, overallScore, areasGoodIn: areasGoodIn.length, areasToWorkOn: areasToWorkOn.length })
}
