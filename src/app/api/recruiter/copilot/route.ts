import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { findRecruiterProfile, getRecruiterFunnelCounts, prisma } from "@/lib/db";
import { generateAIResponse, parseAIJson, getAIErrorPayload } from "@/lib/ai";

const COPILOT_SYSTEM_PROMPT =
  "You are an AI recruiting assistant embedded in a hiring platform. Given the recruiter's current stats, write a warm, concise 2-sentence daily brief plus ONE specific actionable suggestion. Return ONLY valid JSON with no markdown.";

interface CopilotResponse {
  brief: string;
  suggestion: string;
}

function buildFallback(activeJobs: number, newApplications: number): CopilotResponse & { _fallback: true } {
  return {
    brief: `You have ${activeJobs} active job(s) and ${newApplications} new application(s) this week.`,
    suggestion: "Review your candidate list to keep the pipeline moving.",
    _fallback: true,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "RECRUITER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const profile = await findRecruiterProfile(session.userId);
    if (!profile) {
      return NextResponse.json(buildFallback(0, 0));
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [activeJobs, funnel, newApplicationsThisWeek, zeroApplicationJobs] = await Promise.all([
      prisma.job.count({ where: { recruiterId: profile.id, status: "PUBLISHED" } }),
      getRecruiterFunnelCounts(profile.id),
      prisma.application.count({
        where: { job: { recruiterId: profile.id }, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.job.count({
        where: { recruiterId: profile.id, status: "PUBLISHED", applications: { none: {} } },
      }),
    ]);

    const userPrompt = `Active jobs: ${activeJobs}\nNew applications this week: ${newApplicationsThisWeek}\nShortlisted: ${funnel.shortlisted}\nJobs with zero applications: ${zeroApplicationJobs}`;

    try {
      const raw = await generateAIResponse(COPILOT_SYSTEM_PROMPT, userPrompt, {
        temperature: 0.6,
        maxTokens: 300,
        timeoutMs: 30_000,
      });
      const parsed = parseAIJson<CopilotResponse>(raw);

      if (!parsed.brief || !parsed.suggestion) {
        throw new Error("Incomplete AI copilot response");
      }

      return NextResponse.json({ brief: parsed.brief, suggestion: parsed.suggestion });
    } catch (aiError) {
      // AI failures (missing key, rate limit, network, parse error) must never break
      // the recruiter dashboard — classify for logging only, then degrade gracefully
      // with a rule-based brief instead of surfacing an error to the client.
      const { body: errorBody } = getAIErrorPayload(aiError);
      console.error("Copilot AI error (falling back):", errorBody);
      return NextResponse.json(buildFallback(activeJobs, newApplicationsThisWeek));
    }
  } catch (error) {
    console.error("Copilot route error:", error);
    return NextResponse.json(buildFallback(0, 0));
  }
}
