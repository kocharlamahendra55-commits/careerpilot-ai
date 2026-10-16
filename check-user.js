const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const bcrypt = require('bcryptjs');

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
});

async function checkUser() {
  const email = "test@example.com";
  
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.log("User not found");
      return;
    }
    
    console.log("User found:");
    console.log("ID:", user.id);
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    console.log("Password hash:", user.password.substring(0, 20) + "...");
    
    // Test password verification
    const testPassword = "TestPass123!";
    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log("Password 'TestPass123!' is valid:", isValid);
    
    // Test common passwords
    const commonPasswords = ["password", "123456", "test", "admin"];
    for (const pwd of commonPasswords) {
      const valid = await bcrypt.compare(pwd, user.password);
      if (valid) {
        console.log("Password found:", pwd);
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();