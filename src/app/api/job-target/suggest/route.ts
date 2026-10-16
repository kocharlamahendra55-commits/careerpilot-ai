import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { generateAIResponse, parseAIJson, getAIErrorPayload } from "@/lib/ai";

const ROLE_SUGGESTION_SYSTEM_PROMPT =
  "You are a career advisor analyzing resumes. Return ONLY valid JSON with no markdown, code blocks, or extra text. The response must be parseable by JSON.parse().";

function buildRoleSuggestionPrompt(resumeText: string): string {
  return `Analyze this resume and suggest 3-5 suitable target roles based on the candidate's actual skills, experience, and projects.

Resume:
"""
${resumeText.slice(0, 3000)}
"""

CRITICAL: Return ONLY valid JSON. No explanations, no markdown, no extra text.

Based ONLY on information present in this resume, suggest realistic target roles.

DO NOT invent fake statistics, market trends, or company data.
DO NOT suggest roles requiring skills the candidate doesn't have.
DO suggest roles that match their current level and experience.

Return this exact JSON structure:

{
  "suggestions": [
    {
      "role": "Specific Role Title",
      "reason": "Brief 1-2 sentence explanation why this role fits based on their actual skills/experience",
      "skills": ["Skill 1 from resume", "Skill 2 from resume", "Skill 3 from resume"],
      "confidence": "high|medium"
    }
  ]
}

Generate 3-5 suggestions, ordered by best fit first.`;
}

export async function POST(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { resumeText } = body;

    if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 50) {
      return NextResponse.json({ error: "resumeText is required and must be at least 50 characters" }, { status: 400 });
    }

    console.log(`[Job Target Suggest] Analyzing resume (${resumeText.length} chars)`);

    let result: { suggestions: Array<{ role: string; reason: string; skills: string[]; confidence: string }> };
    try {
      const raw = await generateAIResponse(
        ROLE_SUGGESTION_SYSTEM_PROMPT,
        buildRoleSuggestionPrompt(resumeText),
        { temperature: 0.4, maxTokens: 1200, timeoutMs: 30_000 }
      );

      // Enhanced JSON parsing
      try {
        result = parseAIJson<typeof result>(raw);
        
        // Validate structure
        if (!Array.isArray(result.suggestions)) {
          console.error("[Job Target Suggest] Malformed response:", raw.substring(0, 200));
          throw new Error("Invalid response structure");
        }

        // Normalize each suggestion
        result.suggestions = result.suggestions.map((sug: any) => ({
          role: sug.role || "Unknown Role",
          reason: sug.reason || "",
          skills: Array.isArray(sug.skills) ? sug.skills : [],
          confidence: sug.confidence === "high" || sug.confidence === "medium" ? sug.confidence : "medium",
        }));
      } catch (parseError) {
        console.error("[Job Target Suggest] JSON parse error:", parseError);
        throw parseError;
      }
    } catch (aiError) {
      const { status, body: errorBody } = getAIErrorPayload(aiError);
      return NextResponse.json(errorBody, { status });
    }

    console.log(`[Job Target Suggest] Success - Generated ${result.suggestions.length} suggestions`);

    return NextResponse.json({
      suggestions: result.suggestions,
      _source: "openrouter",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("[Job Target Suggest] Error:", msg);
    return NextResponse.json({ error: "Role suggestion failed", detail: msg }, { status: 500 });
  }
}
