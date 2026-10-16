import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import {
  findRecruiterProfile,
  getRecruiterFunnelCounts,
  getRecruiterApplicationsOverTime,
  getRecruiterRecentActivity,
  prisma,
} from "@/lib/db";

const EMPTY_DASHBOARD = {
  activeJobs: 0,
  newApplicationsThisWeek: 0,
  funnel: { applied: 0, shortlisted: 0, interview: 0, offered: 0, hired: 0, rejected: 0 },
  applicationsOverTime: [] as { date: string; count: number }[],
  recentActivity: [] as unknown[],
  alerts: [] as { type: "info" | "warning"; message: string }[],
};

export async function GET(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "RECRUITER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const profile = await findRecruiterProfile(session.userId);
    if (!profile) {
      return NextResponse.json(EMPTY_DASHBOARD);
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [activeJobs, funnel, applicationsOverTime, recentActivity, newApplicationsThisWeek, jobsForAlerts] =
      await Promise.all([
        prisma.job.count({ where: { recruiterId: profile.id, status: "PUBLISHED" } }),
        getRecruiterFunnelCounts(profile.id),
        getRecruiterApplicationsOverTime(profile.id),
        getRecruiterRecentActivity(profile.id, session.userId),
        prisma.application.count({
          where: { job: { recruiterId: profile.id }, createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.job.findMany({
          where: { recruiterId: profile.id },
          select: { title: true, status: true, _count: { select: { applications: true } } },
        }),
      ]);

    // ── Rule-based alerts (pure logic, no AI) ──────────────────────────────
    const alerts: { type: "info" | "warning"; message: string }[] = [];

    for (const job of jobsForAlerts) {
      if (job.status === "PUBLISHED" && job._count.applications === 0) {
        alerts.push({ type: "warning", message: `'${job.title}' has received no applications yet.` });
      }
    }

    const draftCount = jobsForAlerts.filter((j) => j.status === "DRAFT").length;
    if (draftCount > 0) {
      alerts.push({
        type: "info",
        message: `You have ${draftCount} draft job(s) — publish them to start receiving applicants.`,
      });
    }

    if (newApplicationsThisWeek > 0) {
      alerts.push({
        type: "info",
        message: `You have ${newApplicationsThisWeek} new application(s) this week.`,
      });
    }

    return NextResponse.json({
      activeJobs,
      newApplicationsThisWeek,
      funnel,
      applicationsOverTime,
      recentActivity,
      alerts,
    });
  } catch (error) {
    console.error("Recruiter dashboard error:", error);
    return NextResponse.json(EMPTY_DASHBOARD);
  }
}
