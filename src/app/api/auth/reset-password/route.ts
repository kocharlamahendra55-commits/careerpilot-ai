import { NextRequest, NextResponse } from "next/server";
import { findPasswordResetToken, deletePasswordResetToken, updateUserPassword } from "@/lib/db";
import { hashToken, isTokenExpired } from "@/lib/crypto";
import { hashPassword, validatePassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { token, password, confirmPassword } = await req.json();

    // Validate required fields
    if (!token) {
      return NextResponse.json(
        { error: "Reset token is required" }, 
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "New password is required" }, 
        { status: 400 }
      );
    }

    if (!confirmPassword) {
      return NextResponse.json(
        { error: "Password confirmation is required" }, 
        { status: 400 }
      );
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" }, 
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] }, 
        { status: 400 }
      );
    }

    // Hash the token to find it in the database
    const tokenHash = hashToken(token);

    // Find the password reset token
    const resetToken = await findPasswordResetToken(tokenHash);
    
    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" }, 
        { status: 400 }
      );
    }

    // Check if token has expired
    if (isTokenExpired(resetToken.expiresAt)) {
      // Clean up expired token
      await deletePasswordResetToken(tokenHash);
      return NextResponse.json(
        { error: "Reset token has expired. Please request a new password reset." }, 
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update user password
    await updateUserPassword(resetToken.userId, hashedPassword);

    // Delete the used reset token
    await deletePasswordResetToken(tokenHash);

    console.log(`[Auth] Password successfully reset for user ${resetToken.user.email}`);

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now log in with your new password.",
    });

  } catch (error) {
    console.error("[Auth] Reset password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." }, 
      { status: 500 }
    );
  }
}