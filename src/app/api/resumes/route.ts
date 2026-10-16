import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { findResumesByUserId, findAnalysisByResumeId } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = getUserFromRequest(req as any);
    if (!session) {
      return NextResponse.json({ resumes: [] }, { status: 401 });
    }

    const resumes = await findResumesByUserId(session.userId);

    const resumesWithAnalysis = await Promise.all(
      resumes.map(async (r) => {
        const analysis = await findAnalysisByResumeId(r.id);
        return {
          id: r.id,
          filename: r.filename,
          fileSize: r.fileSize,
          fileType: r.fileType,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          analysis: analysis
            ? { atsScore: analysis.atsScore, summary: analysis.summary }
            : null,
        };
      })
    );

    return NextResponse.json({ resumes: resumesWithAnalysis });
  } catch (error) {
    console.error("Resumes fetch error:", error);
    return NextResponse.json({ resumes: [] });
  }
}
