import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { findJobById, findApplicationByJobAndUser } from "@/lib/db";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const job = await findJobById(id);

    // Don't leak draft/archived jobs to students.
    if (!job || job.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const existingApplication = await findApplicationByJobAndUser(id, session.userId);

    return NextResponse.json({
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        description: job.description,
        location: job.location,
        salary: job.salary,
        requirements: job.requirements,
        status: job.status,
        createdAt: job.createdAt,
      },
      hasApplied: !!existingApplication,
    });
  } catch (error) {
    console.error("Get published job error:", error);
    return NextResponse.json({ error: "Failed to load job." }, { status: 500 });
  }
}
