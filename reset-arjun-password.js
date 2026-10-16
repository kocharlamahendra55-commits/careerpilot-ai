const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const bcrypt = require('bcryptjs');

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
});

async function resetArjunPassword() {
  const email = "arjun.reddy.test@careerpilot.dev";
  const newPassword = "Arjun@12345";
  
  console.log("🔐 Starting password reset for:", email);
  console.log("─────────────────────────────────────────────");
  
  try {
    // First, verify the user exists and capture the current state
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
        resumes: true,
        applications: true,
      }
    });
    
    if (!existingUser) {
      console.error("❌ ERROR: User not found with email:", email);
      console.log("No changes were made to the database.");
      process.exit(1);
    }
    
    console.log("✓ User found:");
    console.log("  User ID:", existingUser.id);
    console.log("  Email:", existingUser.email);
    console.log("  Role:", existingUser.role);
    console.log("  Created:", existingUser.createdAt);
    console.log("  Student Profile:", existingUser.studentProfile ? "EXISTS" : "NONE");
    console.log("  Resumes count:", existingUser.resumes.length);
    console.log("  Applications count:", existingUser.applications.length);
    console.log();
    
    // Hash the new password using the same settings as the auth system (12 rounds)
    console.log("🔒 Hashing new password...");
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log("✓ Password hashed successfully");
    console.log();
    
    // Update ONLY the password field for this specific user
    console.log("📝 Updating password in database...");
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
      },
    });
    
    console.log("✓ Password updated successfully");
    console.log();
    
    // Verify the user ID hasn't changed
    if (updatedUser.id !== existingUser.id) {
      console.error("❌ CRITICAL ERROR: User ID changed!");
      console.error("  Original ID:", existingUser.id);
      console.error("  New ID:", updatedUser.id);
      process.exit(1);
    }
    
    console.log("✓ User ID verification: PASSED (unchanged)");
    console.log("  User ID:", updatedUser.id);
    console.log();
    
    // Test the new password works
    console.log("🧪 Testing new password...");
    const isValid = await bcrypt.compare(newPassword, updatedUser.password);
    
    if (!isValid) {
      console.error("❌ Password verification FAILED!");
      console.error("The password was updated but verification failed.");
      process.exit(1);
    }
    
    console.log("✓ Password verification: SUCCESS");
    console.log();
    console.log("─────────────────────────────────────────────");
    console.log("✅ PASSWORD RESET COMPLETE");
    console.log();
    console.log("Summary:");
    console.log("  Email:", email);
    console.log("  New Password:", newPassword);
    console.log("  User ID (unchanged):", updatedUser.id);
    console.log("  Role:", updatedUser.role);
    console.log("  All related data preserved: ✓");
    console.log();
    console.log("You can now log in with these credentials.");
    
  } catch (error) {
    console.error("❌ ERROR during password reset:");
    console.error(error);
    console.log();
    console.log("No changes were committed to the database.");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetArjunPassword();
