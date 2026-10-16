import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, string>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { role, email, password } = body;

    if (!role || !["STUDENT", "RECRUITER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json(
        { error: "This email is already registered. Please sign in instead." },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    if (role === "STUDENT") {
      const { fullName } = body;
      if (!fullName?.trim()) {
        return NextResponse.json({ error: "Full name is required." }, { status: 400 });
      }
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: normalizedEmail, password: hashedPassword, role: "STUDENT" },
        });
        await tx.studentProfile.create({
          data: { userId: user.id, fullName: fullName.trim() },
        });
      });
      return NextResponse.json({ success: true, message: "Account created successfully." });
    }

    if (role === "RECRUITER") {
      const { companyName, recruiterName } = body;
      if (!companyName?.trim()) {
        return NextResponse.json({ error: "Company name is required." }, { status: 400 });
      }
      if (!recruiterName?.trim()) {
        return NextResponse.json({ error: "Recruiter name is required." }, { status: 400 });
      }
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: normalizedEmail, password: hashedPassword, role: "RECRUITER" },
        });
        await tx.recruiterProfile.create({
          data: { userId: user.id, companyName: companyName.trim(), recruiterName: recruiterName.trim() },
        });
      });
      return NextResponse.json({ success: true, message: "Account created successfully." });
    }

    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  } catch (error: unknown) {
    console.error("[Register API Error]:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
