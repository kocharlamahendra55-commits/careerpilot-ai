import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, findStudentProfile, findRecruiterProfile } from "@/lib/db";
import { verifyPassword, signToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    console.log("🔐 LOGIN: Received login request for:", email);

    if (!email || !password) {
      console.log("🔐 LOGIN: Missing credentials");
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await findUserByEmail(email.trim().toLowerCase());
    console.log("🔐 LOGIN: User lookup result:", user ? `Found user ${user.id}` : "User not found");
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    console.log("🔐 LOGIN: Password verification:", valid ? "SUCCESS" : "FAILED");
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role as "STUDENT" | "RECRUITER" | "ADMIN",
    });

    const headers = setSessionCookie(token);

    // Get display name from profile
    let name = user.email;
    if (user.role === "STUDENT") {
      const profile = await findStudentProfile(user.id);
      if (profile?.fullName) name = profile.fullName;
    } else if (user.role === "RECRUITER") {
      const profile = await findRecruiterProfile(user.id);
      if (profile?.recruiterName) name = profile.recruiterName;
    }

    console.log("🔐 LOGIN: Sending success response with redirect:", user.role === "RECRUITER" ? "/recruiter/dashboard" : "/dashboard");
    
    return NextResponse.json(
      {
        success: true,
        role: user.role,
        user: { id: user.id, email: user.email, name },
        redirect: user.role === "RECRUITER" ? "/recruiter/dashboard" : "/dashboard",
      },
      { headers }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
