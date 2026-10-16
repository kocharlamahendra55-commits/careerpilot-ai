import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import {
  findStudentProfile, findRecruiterProfile,
  updateStudentProfile, findUserById
} from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await findUserById(session.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.role === "STUDENT") {
      const profile = await findStudentProfile(user.id);
      return NextResponse.json({
        user: { id: user.id, email: user.email, role: user.role },
        profile: profile ? {
          fullName: profile.fullName,
          phone: profile.phone,
          college: profile.college,
          degree: profile.degree,
          preferredRole: profile.preferredRole,
          location: profile.location,
        } : null,
      });
    }

    if (user.role === "RECRUITER") {
      const profile = await findRecruiterProfile(user.id);
      return NextResponse.json({
        user: { id: user.id, email: user.email, role: user.role },
        profile: profile ? {
          companyName: profile.companyName,
          recruiterName: profile.recruiterName,
          phone: profile.phone,
          website: profile.website,
        } : null,
      });
    }

    return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role }, profile: null });
  } catch (e) {
    console.error("Profile GET error:", e);
    return NextResponse.json({ error: "Failed to get profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    if (session.role === "STUDENT") {
      await updateStudentProfile(session.userId, {
        fullName: body.fullName,
        phone: body.phone,
        college: body.college,
        degree: body.degree,
        preferredRole: body.preferredRole,
        location: body.location,
      });
      return NextResponse.json({ success: true, message: "Profile updated successfully." });
    }

    return NextResponse.json({ error: "Profile update not supported for this role." }, { status: 400 });
  } catch (e) {
    console.error("Profile PATCH error:", e);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
