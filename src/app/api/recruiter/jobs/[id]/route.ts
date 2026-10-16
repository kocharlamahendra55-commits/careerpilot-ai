import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { findRecruiterProfile, findJobById, updateJob, createSystemLog } from "@/lib/db";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "RECRUITER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const job = await findJobById(id);
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });

    const profile = await findRecruiterProfile(session.userId);
    if (!profile || job.recruiterId !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Get job error:", error);
    return NextResponse.json({ error: "Failed to load job." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "RECRUITER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const existingJob = await findJobById(id);
    if (!existingJob) return NextResponse.json({ error: "Job not found." }, { status: 404 });

    const profile = await findRecruiterProfile(session.userId);
    if (!profile || existingJob.recruiterId !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const updateData: Partial<{
      title: string;
      company: string;
      description: string;
      location: string;
      salary: string;
      requirements: string;
      status: string;
    }> = {};

    if (typeof body.title === "string") updateData.title = body.title;
    if (typeof body.description === "string") updateData.description = body.description;
    if (typeof body.location === "string") updateData.location = body.location;
    if (typeof body.salary === "string") updateData.salary = body.salary;
    if (typeof body.requirements === "string") updateData.requirements = body.requirements;
    if (typeof body.status === "string") updateData.status = body.status;

    const job = await updateJob(id, updateData);

    try {
      let action = "JOB_UPDATED";
      if (updateData.status === "PUBLISHED") action = "JOB_PUBLISHED";
      else if (updateData.status === "ARCHIVED") action = "JOB_ARCHIVED";
      await createSystemLog({ userId: session.userId, action, details: job.title });
    } catch {
      // Best-effort logging — never fail the request over a logging error.
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("Update job error:", error);
    return NextResponse.json({ error: "Failed to update job." }, { status: 500 });
  }
}
