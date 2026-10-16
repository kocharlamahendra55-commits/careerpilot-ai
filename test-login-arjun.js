const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const bcrypt = require('bcryptjs');

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
});

async function testLogin() {
  const email = "arjun.reddy.test@careerpilot.dev";
  const password = "Arjun@12345";
  
  console.log("🧪 TESTING LOGIN CREDENTIALS");
  console.log("════════════════════════════════════════════");
  console.log();
  console.log("Testing with:");
  console.log("  Email:", email);
  console.log("  Password:", password);
  console.log();
  
  try {
    // Step 1: Find user by email (normalized)
    console.log("Step 1: Looking up user...");
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        studentProfile: true,
      }
    });
    
    if (!user) {
      console.log("❌ FAILED: User not found");
      process.exit(1);
    }
    
    console.log("✓ User found");
    console.log("  ID:", user.id);
    console.log("  Email:", user.email);
    console.log("  Role:", user.role);
    console.log();
    
    // Step 2: Verify password (simulate login authentication)
    console.log("Step 2: Verifying password...");
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log("❌ FAILED: Invalid password");
      console.log();
      console.log("Debug Info:");
      console.log("  Password attempted:", password);
      console.log("  Stored hash (first 20 chars):", user.password.substring(0, 20) + "...");
      process.exit(1);
    }
    
    console.log("✓ Password verified successfully");
    console.log();
    
    // Step 3: Get display name (simulate profile lookup)
    console.log("Step 3: Loading user profile...");
    let displayName = user.email;
    if (user.studentProfile && user.studentProfile.fullName) {
      displayName = user.studentProfile.fullName;
    }
    console.log("✓ Profile loaded");
    console.log("  Display Name:", displayName);
    console.log();
    
    // Success!
    console.log("════════════════════════════════════════════");
    console.log("✅ LOGIN TEST SUCCESSFUL");
    console.log("════════════════════════════════════════════");
    console.log();
    console.log("Login Simulation Result:");
    console.log("  Status: AUTHENTICATED");
    console.log("  User ID:", user.id);
    console.log("  Email:", user.email);
    console.log("  Display Name:", displayName);
    console.log("  Role:", user.role);
    console.log("  Expected Redirect: /dashboard");
    console.log();
    console.log("The user can now successfully log in to the application");
    console.log("with the credentials:");
    console.log();
    console.log("  Email: arjun.reddy.test@careerpilot.dev");
    console.log("  Password: Arjun@12345");
    
  } catch (error) {
    console.error("❌ ERROR during login test:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
