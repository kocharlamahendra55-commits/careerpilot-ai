const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const bcrypt = require('bcryptjs');

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
});

async function resetTestUser() {
  const email = "test@example.com";
  const password = "TestPass123!";
  
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Update or create user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
      },
      create: {
        email,
        password: hashedPassword,
        role: 'STUDENT'
      }
    });
    
    console.log("Test user updated/created:");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("User ID:", user.id);
    
    // Verify the password works
    const isValid = await bcrypt.compare(password, user.password);
    console.log("Password verification test:", isValid ? "SUCCESS" : "FAILED");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetTestUser();