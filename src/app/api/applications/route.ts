import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import {
  findJobById,
  findResumeById,
  createApplication,
  createSystemLog,
} from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const jobId =
      typeof body.jobId === "string" ? body.jobId : "";

    const resumeId =
      typeof body.resumeId === "string" ? body.resumeId : "";

    if (!jobId || !resumeId) {
      return NextResponse.json(
        { error: "jobId and resumeId are required." },
        { status: 400 }
      );
    }

    const job = await findJobById(jobId);

    if (!job || job.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "This job is not open for applications." },
        { status: 404 }
      );
    }

    const resume = await findResumeById(resumeId);

    if (!resume || resume.userId !== session.userId) {
      return NextResponse.json(
        { error: "Resume not found." },
        { status: 403 }
      );
    }

    if (resume.status !== "ANALYZED") {
      return NextResponse.json(
        { error: "Please analyze your resume before applying." },
        { status: 400 }
      );
    }

    let application;

    try {
      application = await createApplication({
        jobId,
        userId: session.userId,
        resumeId,
      });
    } catch (dbError: any) {
      if (dbError?.code === "P2002") {
        return NextResponse.json(
          { error: "You have already applied to this job." },
          { status: 409 }
        );
      }

      throw dbError;
    }

    try {
      await createSystemLog({
        userId: session.userId,
        action: "APPLICATION_SUBMITTED",
        details: jobId,
      });
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json(
      { application },
      { status: 201 }
    );
  } catch (error) {
    console.error("Submit application error:", error);

    return NextResponse.json(
      { error: "Failed to submit application." },
      { status: 500 }
    );
  }
}