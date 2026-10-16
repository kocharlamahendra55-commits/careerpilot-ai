import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { findRecruiterProfile, findApplicationById, updateApplicationStatus, createSystemLog } from "@/lib/db";

/**
 * Server-authoritative status transition policy. Keep this vocabulary aligned with
 * getRecruiterFunnelCounts (APPLIED, SHORTLISTED, INTERVIEW, OFFERED, HIRED, REJECTED)
 * so dashboard aggregation stays correct. HIRED and REJECTED are terminal.
 */
const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  APPLIED: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["INTERVIEW", "REJECTED"],
  INTERVIEW: ["OFFERED", "REJECTED"],
  OFFERED: ["HIRED", "REJECTED"],
  HIRED: [],
  REJECTED: [],
};

/** Statuses a recruiter is allowed to request as a target. */
const RECRUITER_SETTABLE = new Set(["SHORTLISTED", "INTERVIEW", "OFFERED", "HIRED", "REJECTED"]);

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    // `status` is the primary contract; `action` is accepted as an equivalent alias.
    const rawTarget = typeof body.status === "string" ? body.status : typeof body.action === "string" ? body.action : undefined;
    const target = rawTarget?.trim().toUpperCase();

    if (!target || !RECRUITER_SETTABLE.has(target)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const current = application.status;
    const allowed = ALLOWED_TRANSITIONS[current] ?? [];
    if (!allowed.includes(target)) {
      return NextResponse.json(
        { error: `Cannot change status from ${current} to ${target}.` },
        { status: 409 }
      );
    }

    await updateApplicationStatus(id, target);

    try {
      await createSystemLog({
        userId: session.userId,
        action: "APPLICATION_STATUS_UPDATED",
        details: `${target}`,
      });
    } catch {
      // Best-effort logging — never fail the request over a logging error.
    }

    return NextResponse.json({ application: { id, status: target } });
  } catch (error) {
    console.error("Update application status error:", error);
    return NextResponse.json({ error: "Failed to update application status." }, { status: 500 });
  }
}
