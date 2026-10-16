import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { findUserById, findStudentProfile, findRecruiterProfile } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    console.log("🔐 ME: Received /me request");

    const session = getUserFromRequest(req);
    console.log("🔐 ME: Session from request:", session ? `User ${session.userId}` : "No session");
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await findUserById(session.userId);
    console.log("🔐 ME: User from database:", user ? `Found ${user.email}` : "User not found");
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    let name = user.email;
    let profile: Record<string, unknown> | null = null;

    if (user.role === "STUDENT") {
      const sp = await findStudentProfile(user.id);
      if (sp) {
        name = sp.fullName || user.email;
        profile = {
          fullName: sp.fullName,
          phone: sp.phone,
          college: sp.college,
          degree: sp.degree,
          preferredRole: sp.preferredRole,
          location: sp.location,
        };
      }
    } else if (user.role === "RECRUITER") {
      const rp = await findRecruiterProfile(user.id);
      if (rp) {
        name = rp.recruiterName || user.email;
        profile = {
          companyName: rp.companyName,
          recruiterName: rp.recruiterName,
          phone: rp.phone,
          website: rp.website,
        };
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name,
        profile,
      },
    });
  } catch (error) {
    console.error("me error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
