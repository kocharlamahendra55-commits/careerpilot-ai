import { NextRequest, NextResponse } from "next/server";
import { getSystemStats, prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get basic stats using existing function
    const stats = await getSystemStats();

    // Get resume status counts
    const [analyzed, processing, failed] = await Promise.all([
      prisma.resume.count({ where: { status: 'ANALYZED' } }),
      prisma.resume.count({ where: { status: 'PROCESSING' } }),
      prisma.resume.count({ where: { status: 'FAILED' } }),
    ]);

    // Get recent score history
    const recentAnalyses = await prisma.analysisReport.findMany({
      select: {
        atsScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      stats,
      resumeStatus: { analyzed, processing, failed },
      recentActivity: [],
      scoreHistory: recentAnalyses.map((analysis) => ({
        score: analysis.atsScore,
        date: analysis.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({
      stats: { totalUsers: 0, totalResumes: 0, avgAtsScore: 0, totalAnalyses: 0, apiCalls: 0 },
      resumeStatus: { analyzed: 0, processing: 0, failed: 0 },
      recentActivity: [],
      scoreHistory: [],
    });
  }
}
