const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
  log: ['query', 'error', 'warn'],
});

async function createTestUser() {
  const email = "test@example.com";
  const password = "TestPass123!";
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 12);
  
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log("Test user already exists:", email);
      return;
    }
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'STUDENT'
      }
    });
    
    // Create student profile
    await prisma.studentProfile.create({
      data: {
        userId: user.id,
        fullName: "Test User",
        phone: "+1234567890",
        college: "Test University",
        degree: "Computer Science",
        preferredRole: "Software Developer",
        location: "Test City"
      }
    });
    
    console.log("Test user created successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("User ID:", user.id);
    
  } catch (error) {
    console.error("Error creating test user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();