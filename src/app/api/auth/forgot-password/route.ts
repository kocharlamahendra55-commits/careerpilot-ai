import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createPasswordResetToken } from "@/lib/db";
import { generatePasswordResetToken } from "@/lib/crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { validateEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" }, 
        { status: 400 }
      );
    }

    const emailTrimmed = email.trim().toLowerCase();
    
    if (!validateEmail(emailTrimmed)) {
      return NextResponse.json(
        { error: "Invalid email format" }, 
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await findUserByEmail(emailTrimmed);
    
    // Always return success to prevent email enumeration attacks
    // But only send email if user exists
    if (user) {
      // Generate password reset token
      const { token, tokenHash, expiresAt } = generatePasswordResetToken();
      
      // Store token hash in database
      await createPasswordResetToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      // Try to send email
      const emailSent = await sendPasswordResetEmail(emailTrimmed, token);
      
      if (!emailSent) {
        console.error(`[Auth] Failed to send password reset email to ${emailTrimmed}`);
        // Don't reveal email send failure to prevent enumeration
        // Log for development
        console.log(`[Dev] Password reset token for ${emailTrimmed}: ${token}`);
        console.log(`[Dev] Reset URL would be: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`);
      } else {
        console.log(`[Auth] Password reset email sent successfully to ${emailTrimmed}`);
      }
    } else {
      console.log(`[Auth] Password reset requested for non-existent email: ${emailTrimmed}`);
    }

    // Always return success response to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: "If the email is registered, you will receive a password reset link shortly.",
    });

  } catch (error) {
    console.error("[Auth] Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." }, 
      { status: 500 }
    );
  }
}