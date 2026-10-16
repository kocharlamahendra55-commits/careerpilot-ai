import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { findRecruiterProfile, findApplicationsByRecruiter } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "RECRUITER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const profile = await findRecruiterProfile(session.userId);
    if (!profile) {
      return NextResponse.json({ applications: [], total: 0, page: 1, pageSize: 10 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));

    const { applications, total } = await findApplicationsByRecruiter(profile.id, {
      jobId,
      status,
      search,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({ applications, total, page, pageSize });
  } catch (error) {
    console.error("List recruiter applications error:", error);
    return NextResponse.json({ error: "Failed to load applications." }, { status: 500 });
  }
}
