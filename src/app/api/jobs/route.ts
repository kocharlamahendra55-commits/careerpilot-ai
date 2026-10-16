import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { findPublishedJobs } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? undefined;

    const jobs = await findPublishedJobs(search);

    // Keep the list payload light — omit full description/requirements for the browse view.
    const listJobs = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      createdAt: job.createdAt,
    }));

    return NextResponse.json({ jobs: listJobs });
  } catch (error) {
    console.error("List published jobs error:", error);
    return NextResponse.json({ error: "Failed to load jobs." }, { status: 500 });
  }
}
