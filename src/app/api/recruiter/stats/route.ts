import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { findRecruiterProfile, prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session || session.role !== "RECRUITER") {
      return NextResponse.json({ stats: { totalJobs: 0, totalApplications: 0, shortlisted: 0, hired: 0 } });
    }

    const recruiter = await findRecruiterProfile(session.userId);
    if (!recruiter) {
      return NextResponse.json({ stats: { totalJobs: 0, totalApplications: 0, shortlisted: 0, hired: 0 } });
    }

    const [totalJobs, totalApplications, shortlisted, hired] = await Promise.all([
      prisma.job.count({ where: { recruiterId: recruiter.id } }),
      prisma.application.count({
        where: { job: { recruiterId: recruiter.id } }
      }),
      prisma.application.count({
        where: { 
          job: { recruiterId: recruiter.id },
          status: 'SHORTLISTED'
        }
      }),
      prisma.application.count({
        where: { 
          job: { recruiterId: recruiter.id },
          status: 'HIRED'
        }
      }),
    ]);

    return NextResponse.json({ stats: { totalJobs, totalApplications, shortlisted, hired } });
  } catch {
    return NextResponse.json({ stats: { totalJobs: 0, totalApplications: 0, shortlisted: 0, hired: 0 } });
  }
}
