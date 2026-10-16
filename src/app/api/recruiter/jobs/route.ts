import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { findRecruiterProfile, findJobsByRecruiter, createJob, createSystemLog } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "RECRUITER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const profile = await findRecruiterProfile(session.userId);
    if (!profile) return NextResponse.json({ jobs: [] });

    const jobs = await findJobsByRecruiter(profile.id);
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("List recruiter jobs error:", error);
    return NextResponse.json({ error: "Failed to load jobs." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "RECRUITER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const profile = await findRecruiterProfile(session.userId);
    if (!profile) {
      return NextResponse.json(
        { error: "Recruiter profile not found. Please complete your profile first." },
        { status: 400 }
      );
    }

    const status = typeof body.status === "string" ? body.status : "DRAFT";

    const job = await createJob({
      recruiterId: profile.id,
      title,
      // Company name always mirrors the recruiter's real profile — never client-supplied.
      company: profile.companyName,
      description: typeof body.description === "string" ? body.description : undefined,
      location: typeof body.location === "string" ? body.location : undefined,
      salary: typeof body.salary === "string" ? body.salary : undefined,
      requirements: typeof body.requirements === "string" ? body.requirements : undefined,
      status,
    });

    try {
      await createSystemLog({
        userId: session.userId,
        action: status === "PUBLISHED" ? "JOB_PUBLISHED" : "JOB_POSTED",
        details: title,
      });
    } catch {
      // Best-effort logging — never fail the request over a logging error.
    }

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error("Create job error:", error);
    return NextResponse.json({ error: "Failed to create job." }, { status: 500 });
  }
}
