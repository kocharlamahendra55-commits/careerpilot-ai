import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { createResume, saveAnalysisAndUpdateStatus, updateResumeStatus } from "@/lib/db";
import { generateAIResponse, parseAIJson, getAIErrorPayload } from "@/lib/ai";

// Import pdf-parse v1.1.1 (CommonJS module) using dynamic import
// This approach works better with Next.js for CommonJS modules

const RESUME_ANALYSIS_SYSTEM_PROMPT =
  "You are an expert ATS resume analyzer. Return ONLY valid JSON with no markdown, explanation, or extra text.";

/**
 * Build the user prompt. Resume text is sliced to 6000 chars (saves tokens
 * while preserving all meaningful content in a typical resume).
 */
function buildUserPrompt(resumeText: string, jobDescription: string = ""): string {
  const jobContext = jobDescription
    ? `\nTarget Position: ${jobDescription.slice(0, 1000)}\n\n`
    : "\n";

  return `You are a senior technical recruiter and ATS optimization expert. Analyze this resume with recruiter-level precision${jobDescription ? " specifically for the target position" : ""}.

Candidate Resume:
"""
${resumeText.slice(0, 4500)}
"""
${jobContext}RESPONSE FORMAT REQUIREMENTS:
- Executive Summary: 2-sentence hiring recommendation focused on unique value
- Strengths: Top 3 specific achievements/skills that stand out
- Critical Issues: Top 3 specific problems that need immediate attention
- ATS Optimization: Specific, actionable improvements (not generic advice)
- Skills Analysis: Implied skills from experience not explicitly listed
- Interview Focus: Role-specific questions based on actual experience
- Career Progression: Realistic next-step roadmap based on current level

Return ONLY this JSON (no explanations):
{
  "ats_score": <integer 0-100>,
  "summary": "EXECUTIVE SUMMARY: [Unique value proposition]. HIRING RECOMMENDATION: [Fit assessment for role].",
  "score_breakdown": {
    "formatting": <integer 0-100>,
    "impact_verbs": <integer 0-100>,
    "skills_match": <integer 0-100>,
    "experience_depth": <integer 0-100>,
    "education_relevance": <integer 0-100>
  },
  "strengths": ["ACHIEVEMENT: [Specific quantified result]", "EXPERTISE: [Technical/domain competency]", "LEADERSHIP: [Management or influence example]"],
  "weaknesses": ["CRITICAL: [Immediate improvement needed]", "MISSING: [Essential skill for target role]", "EXPERIENCE: [Gap that limits candidacy]"],
  "hidden_skills": ["TECHNICAL: [Skill implied by projects]", "ANALYTICAL: [Skill inferred from results]", "DOMAIN: [Industry knowledge from context]"],
  "keyword_optimizer_suggestions": ["ADD: [Specific ATS keyword missing]", "EMPHASIZE: [Important skill to highlight]", "INCLUDE: [Industry term needed]"],
  "grammar_tone_feedback": ["GRAMMAR: [Specific language issue]", "TONE: [Professional improvement needed]"],
  "formatting_feedback": ["STRUCTURE: [Specific format improvement]", "SECTION: [Content organization enhancement]"],
  "skills_gap": ["PRIORITY 1: [Most critical skill needed]", "PRIORITY 2: [Important certification/experience]", "PRIORITY 3: [Development area for growth]"],
  "course_recommendations": [
    {"title": "[Specific Course Name]", "provider": "[Real Platform]", "difficulty": "Beginner|Intermediate|Advanced", "link": "https://platform.com/course"}
  ],
  "interview_questions": [
    {"question": "[Specific behavioral question based on resume experience]", "type": "Behavioral", "intent": "Tests [specific skill/experience from resume]", "sample_answer": "Framework: [STAR method approach]"},
    {"question": "[Technical question relevant to role]", "type": "Technical", "intent": "Validates [specific technical competency]", "sample_answer": "Key points: [Technical concepts to cover]"},
    {"question": "[Situational question for role challenges]", "type": "Situational", "intent": "Assesses [leadership/problem-solving ability]", "sample_answer": "Structure: [Problem-solving approach]"}
  ],
  "roadmap": {
    "target_role": "[Specific next role based on experience level]",
    "timeline": "[Realistic timeframe: 6-12 months / 12-18 months]",
    "phases": [
      {"phase": "IMMEDIATE ACTIONS (0-3 months)", "duration": "3 months", "goals": ["SKILL: [Specific technical skill to develop]", "CERTIFICATION: [Industry credential to pursue]"]},
      {"phase": "SHORT-TERM MILESTONES (3-9 months)", "duration": "6 months", "goals": ["PROJECT: [Portfolio/experience to gain]", "NETWORK: [Industry connections to build]"]},
      {"phase": "CAREER ADVANCEMENT (9-18 months)", "duration": "9 months", "goals": ["POSITION: [Target role to apply for]", "LEADERSHIP: [Team/project leadership opportunity]"]}
    ]
  }
}`;
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const session = getUserFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse multipart form ─────────────────────────────────────────────────
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const jobDescription = (formData.get("jobDescription") as string | null) ?? "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log(`[Analyze] File: ${file.name} | Size: ${file.size} | Type: ${file.type}`);

    // ── Read file buffer ─────────────────────────────────────────────────────
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ── Extract text ─────────────────────────────────────────────────────────
    let resumeText = "";

    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      resumeText = buffer.toString("utf-8").trim();
      console.log(`[Analyze] TXT extracted: ${resumeText.length} chars`);
    } else if (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      console.log(`[Analyze] Parsing PDF with pdf-parse v1...`);
      
      const tPdf = Date.now();
      try {
        // Dynamic import for CommonJS module
        const pdfParse = (await import("pdf-parse")).default;
        console.log(`[Analyze] typeof pdfParse:`, typeof pdfParse);
        console.log(`[Analyze] buffer length:`, buffer.length);
        
        const pdfData = await pdfParse(buffer);
        const rawText: string = pdfData.text ?? "";
        console.log(`[Analyze] pdf-parse OK in ${Date.now() - tPdf}ms | raw length: ${rawText.length}`);
        console.log(`[Analyze] First 200 chars: "${rawText.slice(0, 200)}"`);

        // Normalize whitespace — collapse runs of spaces/tabs, preserve paragraph breaks
        resumeText = rawText
          .replace(/\r\n/g, "\n")
          .replace(/[ \t]{2,}/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        console.log(`[Analyze] Normalized text length: ${resumeText.length} chars`);
      } catch (pdfError) {
        console.error("[Analyze] pdf-parse error:", pdfError instanceof Error ? pdfError.message : pdfError);
        return NextResponse.json({
          success: false,
          error: `PDF parsing failed: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}. Please ensure the PDF contains readable (non-scanned) text.`,
        }, { status: 400 });
      }

      if (resumeText.length < 50) {
        console.error(`[Analyze] Extracted only ${resumeText.length} chars — likely a scanned/image PDF`);
        return NextResponse.json({
          success: false,
          error: `Could not extract readable text from this PDF (extracted only ${resumeText.length} characters). This may be a scanned or image-only PDF. Please use a text-based PDF or a .txt file.`,
        }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF or TXT file." },
        { status: 400 }
      );
    }

    // ── DB + AI in parallel ───────────────────────────────────────────────────
    // createResume (INSERT+SELECT in one child process) and the AI call are
    // fully independent — kick them off concurrently.
    const tParallel = Date.now();

    // ── DB: create resume record ─────────────────────────────────────────────
    const dbCreatePromise = Promise.resolve().then(() =>
      createResume({
        userId: session.userId,
        filename: file.name,
        originalText: resumeText,
        fileSize: file.size,
        fileType: file.type || "application/pdf",
        jobDescription,
      })
    );

    // ── AI: generate analysis ────────────────────────────────────────────────
    const aiPromise = generateAIResponse(
      RESUME_ANALYSIS_SYSTEM_PROMPT,
      buildUserPrompt(resumeText, jobDescription),
      { temperature: 0.3, maxTokens: 2800 }
    );

    let resume: Awaited<ReturnType<typeof createResume>>;
    let rawAI: string;

    try {
      [resume, rawAI] = await Promise.all([dbCreatePromise, aiPromise]);
      console.log(`[Analyze] Parallel phase done in ${Date.now() - tParallel}ms | resumeId: ${resume.id}`);
    } catch (err) {
      // Reliability: if the resume row was created before the AI call failed,
      // don't leave it stuck in PROCESSING. Best-effort terminal transition.
      try {
        const createdResume = await dbCreatePromise;
        await updateResumeStatus(createdResume.id, "FAILED");
      } catch {
        // Ignore cleanup errors — never mask the original AI failure.
      }
      const { status, body } = getAIErrorPayload(err);
      if (status !== 500) {
        return NextResponse.json(body, { status });
      }
      throw err;
    }

    // ── Parse AI JSON ────────────────────────────────────────────────────────
    let analysis: Record<string, unknown>;
    try {
      const parsed = parseAIJson<Record<string, unknown>>(rawAI);
      analysis = { ...parsed, filename: file.name };
    } catch (parseErr) {
      // Mark resume as failed, then surface the error
      try { await updateResumeStatus(resume.id, "FAILED"); } catch { /* ignore */ }
      const { status, body } = getAIErrorPayload(parseErr);
      return NextResponse.json(body, { status });
    }

    // ── Save analysis + update status in ONE child process ───────────────────
    const tDb = Date.now();
    const scoreBreakdown = analysis.score_breakdown as Record<string, number> | undefined;
    try {
      await saveAnalysisAndUpdateStatus(resume.id, {
        ats_score: Number(analysis.ats_score ?? 0),
        summary: String(analysis.summary ?? ""),
        formatting_score: scoreBreakdown?.formatting ?? 0,
        impact_verb_score: scoreBreakdown?.impact_verbs ?? 0,
        skills_match_score: scoreBreakdown?.skills_match ?? 0,
        experience_score: scoreBreakdown?.experience_depth ?? 0,
        education_score: scoreBreakdown?.education_relevance ?? 0,
        strengths: JSON.stringify(analysis.strengths ?? []),
        weaknesses: JSON.stringify(analysis.weaknesses ?? []),
        hidden_skills: JSON.stringify(analysis.hidden_skills ?? []),
        keyword_suggestions: JSON.stringify(analysis.keyword_optimizer_suggestions ?? []),
        grammar_feedback: JSON.stringify(analysis.grammar_tone_feedback ?? []),
        formatting_feedback: JSON.stringify(analysis.formatting_feedback ?? []),
        skills_gap: JSON.stringify(analysis.skills_gap ?? []),
        course_recommendations: JSON.stringify(analysis.course_recommendations ?? []),
        roadmap: JSON.stringify(analysis.roadmap ?? {}),
        interview_questions: JSON.stringify(analysis.interview_questions ?? []),
      }, "ANALYZED");
      console.log(`[Analyze] Analysis saved in ${Date.now() - tDb}ms`);
    } catch (dbError) {
      console.error("[Analyze] DB save error:", dbError instanceof Error ? dbError.message : dbError);
      // Non-fatal — analysis was generated, return it even if save failed
    }

    const totalMs = Date.now() - t0;
    console.log(`[Analyze] Total time: ${totalMs}ms`);

    return NextResponse.json({
      success: true,
      resumeId: resume.id,
      filename: file.name,
      resume_text: resumeText,
      analysis: {
        ...analysis,
        _source: "openrouter",
        _resumeId: resume.id,
        _timing_ms: totalMs,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Analyze] Unhandled error:", message);
    return NextResponse.json({
      success: false,
      error: message,
      stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
