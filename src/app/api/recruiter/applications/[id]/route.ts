import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { findRecruiterProfile, findApplicationById } from "@/lib/db";

/** Parse a JSON-string array field, falling back to an empty array on bad/missing data. */
function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "RECRUITER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const application = await findApplicationById(id);
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const profile = await findRecruiterProfile(session.userId);
    if (!profile || application.job.recruiterId !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const analysis = application.resume?.analysis;

    return NextResponse.json({
      application: {
        id: application.id,
        status: application.status,
        createdAt: application.createdAt,
        job: {
          id: application.job.id,
          title: application.job.title,
        },
        user: {
          email: application.user.email,
          studentProfile: application.user.studentProfile,
        },
        resume: application.resume
          ? {
              id: application.resume.id,
              filename: application.resume.filename,
              originalText: application.resume.originalText,
            }
          : null,
        analysis: analysis
          ? {
              atsScore: analysis.atsScore,
              summary: analysis.summary,
              strengths: parseJsonArray(analysis.strengths),
              weaknesses: parseJsonArray(analysis.weaknesses),
              hiddenSkills: parseJsonArray(analysis.hiddenSkills),
              keywordSuggestions: parseJsonArray(analysis.keywordSuggestions),
              formattingScore: analysis.formattingScore,
              impactVerbScore: analysis.impactVerbScore,
              skillsMatchScore: analysis.skillsMatchScore,
              experienceScore: analysis.experienceScore,
              educationScore: analysis.educationScore,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Get application error:", error);
    return NextResponse.json({ error: "Failed to load application." }, { status: 500 });
  }
}
