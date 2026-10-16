import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { generateAIResponse, parseAIJson, getAIErrorPayload } from "@/lib/ai";

const JOB_DESCRIPTION_SYSTEM_PROMPT =
  "You are a professional job description writer. Return ONLY valid JSON with no markdown, code blocks, or extra text. The response must be parseable by JSON.parse().";

function buildJobDescriptionPrompt(params: {
  role: string;
  experienceLevel?: string;
  workMode?: string;
  location?: string;
  employmentType?: string;
  industry?: string;
  primarySkills?: string;
  mustHaveSkills?: string;
  niceToHaveSkills?: string;
}): string {
  const {
    role,
    experienceLevel,
    workMode,
    location,
    employmentType,
    industry,
    primarySkills,
    mustHaveSkills,
    niceToHaveSkills,
  } = params;

  return `Generate a realistic, professional job description for the following position:

Role: ${role}
${experienceLevel ? `Experience Level: ${experienceLevel}` : ""}
${workMode ? `Work Mode: ${workMode}` : ""}
${location ? `Location: ${location}` : ""}
${employmentType ? `Employment Type: ${employmentType}` : ""}
${industry ? `Industry: ${industry}` : ""}
${primarySkills ? `Primary Skills Required: ${primarySkills}` : ""}
${mustHaveSkills ? `Must-Have Requirements: ${mustHaveSkills}` : ""}
${niceToHaveSkills ? `Nice-to-Have Skills: ${niceToHaveSkills}` : ""}

CRITICAL: Return ONLY valid JSON. No explanations, no markdown, no extra text.

Generate a comprehensive job description that includes:
- Brief company context (generic, AI-generated company)
- Role overview (2-3 sentences)
- Key responsibilities (4-6 bullet points)
- Required qualifications (education, experience, skills)
- Preferred qualifications (nice-to-haves)
- Benefits/perks (standard professional benefits)

Return this exact JSON structure:

{
  "jobDescription": "Full text job description that combines company context, role overview, responsibilities, qualifications, and benefits in a natural, professional format suitable for resume analysis. Make it 200-400 words, realistic and detailed."
}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { role } = body;

    if (!role || typeof role !== "string" || role.trim().length === 0) {
      return NextResponse.json({ error: "role is required" }, { status: 400 });
    }

    console.log(`[Job Target Generate] Generating JD for role: ${role}`);

    let result: { jobDescription: string };
    try {
      const raw = await generateAIResponse(
        JOB_DESCRIPTION_SYSTEM_PROMPT,
        buildJobDescriptionPrompt(body),
        { temperature: 0.5, maxTokens: 1500, timeoutMs: 30_000 }
      );

      // Enhanced JSON parsing
      try {
        result = parseAIJson<{ jobDescription: string }>(raw);
        
        // Validate structure
        if (!result.jobDescription || typeof result.jobDescription !== "string") {
          console.error("[Job Target Generate] Malformed response:", raw.substring(0, 200));
          throw new Error("Invalid response structure");
        }
      } catch (parseError) {
        console.error("[Job Target Generate] JSON parse error:", parseError);
        throw parseError;
      }
    } catch (aiError) {
      const { status, body: errorBody } = getAIErrorPayload(aiError);
      return NextResponse.json(errorBody, { status });
    }

    console.log(`[Job Target Generate] Success - Generated ${result.jobDescription.length} chars`);

    return NextResponse.json({
      jobDescription: result.jobDescription,
      _source: "openrouter",
      _aiGenerated: true,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[Job Target Generate] Error:", msg);
    return NextResponse.json({ error: "Job description generation failed", detail: msg }, { status: 500 });
  }
}
