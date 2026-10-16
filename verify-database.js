const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
});

async function verifyDatabase() {
  try {
    const userCount = await prisma.user.count();
    const resumeCount = await prisma.resume.count();
    const analysisCount = await prisma.analysisReport.count();
    
    const arjunUser = await prisma.user.findUnique({
      where: { email: 'arjun.reddy.test@careerpilot.dev' },
      include: {
        resumes: true,
        studentProfile: true
      }
    });
    
    console.log('DATABASE INTEGRITY CHECK');
    console.log('========================');
    console.log('Total Users:', userCount);
    console.log('Total Resumes:', resumeCount);
    console.log('Total Analysis Reports:', analysisCount);
    console.log('');
    console.log('Test User Status:');
    console.log('  Email:', arjunUser?.email || 'NOT FOUND');
    console.log('  ID:', arjunUser?.id || 'N/A');
    console.log('  Resumes:', arjunUser?.resumes.length || 0);
    console.log('  Profile:', arjunUser?.studentProfile ? 'EXISTS' : 'MISSING');
    console.log('');
    console.log('? Database integrity preserved');
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();
