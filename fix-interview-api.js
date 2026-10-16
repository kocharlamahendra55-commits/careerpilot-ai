const fs = require('fs');

const newContent = `import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { dbRun, generateId } from "@/lib/db";
import { generateAIResponse, parseAIJson, getAIErrorPayload } from "@/lib/ai";

const INTERVIEW_SYSTEM_PROMPT =
  "You are a senior technical interviewer at a top tech company. Return ONLY valid JSON with no markdown, code blocks, or extra text. The response must be parseable by JSON.parse().";

function buildInterviewUserPrompt(resumeText, jobDescription) {
  return \`Generate 15 interview questions for this candidate based on their resume\${jobDescription ? " and the target job description" : ""}.

Resume:
"""
\${resumeText.slice(0, 1500)}
"""

\${jobDescription ? \`Target Position:\\n"""\\n\${jobDescription.slice(0, 1000)}\\n"""\\n\` : ""}
CRITICAL: Return ONLY valid JSON. No explanations, no markdown, no extra text.

Generate exactly 15 questions distributed as follows:
- HR: 2 questions
- Behavioral: 3 questions  
- Technical: 4 questions
- Coding: 2 questions
- SQL: 1 question
- Scenario: 2 questions
- System Design: 1 question

Each question must include:
- question: string (the interview question)
- type: string (one of: HR, Behavioral, Technical, Coding, SQL, Scenario, System Design)
- difficulty: string (Easy, Medium, or Hard)
- intent: string (what skill/quality this tests)
- sample_answer: string (2-3 sentences providing a framework for answering)
- common_mistakes: array of 2 strings
- follow_ups: array of 2 strings

Return this exact JSON structure (no markdown, no code blocks):
{
  "total_questions": 15,
  "questions": [
    {
      "question": "Tell me about yourself and your background.",
      "type": "HR",
      "difficulty": "Easy",
      "intent": "Assess communication skills and background fit",
      "sample_answer": "Focus on professional highlights relevant to the role, keeping it concise and structured.",
      "common_mistakes": ["Speaking too long or going off-topic", "Not connecting experience to the role"],
      "follow_ups": ["What motivated you to apply for this position?", "How does your background align with this role?"]
    }
  ],
  "interview_tips": ["Research the company and role thoroughly", "Prepare specific examples using STAR method", "Ask thoughtful questions"],
  "red_flags_to_avoid": ["Speaking negatively about past employers", "Being unprepared or arriving late"],
  "questions_to_ask_interviewer": ["What does success look like in this role?", "What are the team dynamics?", "What are the growth opportunities?"]
}\`;
}

export async function POST(req) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { resume_text, job_description } = body;

    if (!resume_text) {
      return NextResponse.json({ error: "resume_text is required" }, { status: 400 });
    }

    let interviewPrep;
    try {
      const raw = await generateAIResponse(
        INTERVIEW_SYSTEM_PROMPT,
        buildInterviewUserPrompt(resume_text, job_description || ""),
        { temperature: 0.4, maxTokens: 4000, timeoutMs: 90_000 }
      );
      
      // Enhanced JSON parsing with validation
      try {
        interviewPrep = parseAIJson(raw);
        
        // Validate structure
        if (!interviewPrep.questions || !Array.isArray(interviewPrep.questions)) {
          console.warn("[Interview] AI returned malformed structure, attempting to fix...");
          if (typeof interviewPrep === 'object') {
            const keys = Object.keys(interviewPrep);
            const questionsKey = keys.find(k => k.toLowerCase().includes('question'));
            if (questionsKey && Array.isArray(interviewPrep[questionsKey])) {
              interviewPrep.questions = interviewPrep[questionsKey];
            }
          }
        }
      } catch (parseError) {
        console.error("[Interview] JSON parse error:", parseError);
        console.error("[Interview] Raw response:", raw.substring(0, 500));
        throw parseError;
      }
    } catch (aiError) {
      const { status, body: errorBody } = getAIErrorPayload(aiError);
      return NextResponse.json(errorBody, { status });
    }

    // ?? Normalize schema: fill missing fields so UI never crashes ???????????
    const ip = interviewPrep;
    ip.questions = Array.isArray(ip.questions)
      ? ip.questions.map((q) => ({
          question: q.question ?? "",
          type: q.type ?? "General",
          difficulty: q.difficulty ?? "Medium",
          intent: q.intent ?? "",
          sample_answer: q.sample_answer ?? "",
          common_mistakes: Array.isArray(q.common_mistakes) ? q.common_mistakes : [],
          follow_ups: Array.isArray(q.follow_ups) ? q.follow_ups : [],
        }))
      : [];
    ip.total_questions = ip.questions.length;
    ip.interview_tips = Array.isArray(ip.interview_tips) ? ip.interview_tips : [];
    ip.red_flags_to_avoid = Array.isArray(ip.red_flags_to_avoid) ? ip.red_flags_to_avoid : [];
    ip.questions_to_ask_interviewer = Array.isArray(ip.questions_to_ask_interviewer)
      ? ip.questions_to_ask_interviewer
      : [];
    interviewPrep = ip;

    try {
      const questionCount = ip.questions.length;
      dbRun("INSERT INTO activity_log (id, user_id, action, details) VALUES (?, ?, ?, ?)", [
        generateId(), session.userId, "INTERVIEW_PREP", \`\${questionCount} questions\`,
      ]);
    } catch { /* ignore */ }

    return NextResponse.json({ interview_prep: interviewPrep, _source: "openrouter" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    return NextResponse.json({ error: "Interview prep failed", detail: msg }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/interview/route.ts', newContent, 'utf8');
console.log('? Fixed src/app/api/interview/route.ts');
