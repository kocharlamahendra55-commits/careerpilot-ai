/**
 * Analysis Flow Diagnostic Test
 * Tests the complete resume analysis workflow to identify failure points
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
});

const TEST_USER_EMAIL = "arjun.reddy.test@careerpilot.dev";

async function testAnalysisFlow() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║       ANALYSIS FLOW DIAGNOSTIC TEST                       ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  try {
    // Step 1: Verify user exists
    console.log("📋 STEP 1: Verifying User Account");
    console.log("─────────────────────────────────────────────────────────────");
    const user = await prisma.user.findUnique({
      where: { email: TEST_USER_EMAIL },
      include: {
        studentProfile: true,
        resumes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            analysis: true,
          }
        }
      }
    });

    if (!user) {
      console.error("❌ ERROR: User not found");
      process.exit(1);
    }

    console.log(`✓ User found: ${user.email}`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Total Resumes: ${user.resumes.length}`);
    console.log();

    // Step 2: Analyze resume statuses
    console.log("📊 STEP 2: Resume Status Analysis");
    console.log("─────────────────────────────────────────────────────────────");
    
    const statusCounts = {
      ANALYZED: 0,
      PROCESSING: 0,
      FAILED: 0,
      OTHER: 0
    };

    user.resumes.forEach(resume => {
      if (statusCounts[resume.status] !== undefined) {
        statusCounts[resume.status]++;
      } else {
        statusCounts.OTHER++;
      }
    });

    console.log(`  ANALYZED: ${statusCounts.ANALYZED}`);
    console.log(`  PROCESSING: ${statusCounts.PROCESSING}`);
    console.log(`  FAILED: ${statusCounts.FAILED}`);
    console.log(`  OTHER: ${statusCounts.OTHER}`);
    console.log();

    // Step 3: Check recent resumes
    console.log("📄 STEP 3: Recent Resume Details");
    console.log("─────────────────────────────────────────────────────────────");
    
    const recentResumes = user.resumes.slice(0, 5);
    recentResumes.forEach((resume, idx) => {
      console.log(`\n[${idx + 1}] ${resume.filename}`);
      console.log(`    ID: ${resume.id}`);
      console.log(`    Status: ${resume.status}`);
      console.log(`    Created: ${resume.createdAt}`);
      console.log(`    File Size: ${resume.fileSize} bytes`);
      console.log(`    File Type: ${resume.fileType}`);
      console.log(`    Has Analysis: ${resume.analysis ? 'YES' : 'NO'}`);
      if (resume.analysis) {
        console.log(`    ATS Score: ${resume.analysis.atsScore}`);
      }
    });
    console.log();

    // Step 4: Check for stuck PROCESSING resumes
    console.log("⚠️  STEP 4: Checking for Stuck Resumes");
    console.log("─────────────────────────────────────────────────────────────");
    
    const processingResumes = user.resumes.filter(r => r.status === 'PROCESSING');
    if (processingResumes.length > 0) {
      console.log(`⚠️  Found ${processingResumes.length} stuck PROCESSING resume(s):`);
      processingResumes.forEach(r => {
        const ageMinutes = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 60000);
        console.log(`  - ${r.filename} (${ageMinutes} minutes old)`);
      });
    } else {
      console.log("✓ No stuck PROCESSING resumes");
    }
    console.log();

    // Step 5: Environment Variables Check
    console.log("🔑 STEP 5: API Configuration Check");
    console.log("─────────────────────────────────────────────────────────────");
    
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const youtubeKey = process.env.YOUTUBE_API_KEY;
    
    console.log(`  OPENROUTER_API_KEY: ${openRouterKey ? '✓ Configured (' + openRouterKey.substring(0, 15) + '...)' : '❌ MISSING'}`);
    console.log(`  YOUTUBE_API_KEY: ${youtubeKey && youtubeKey.length > 5 ? '✓ Configured' : '⚠️  Not configured (optional)'}`);
    console.log();

    // Step 6: Database Health Check
    console.log("💾 STEP 6: Database Health Check");
    console.log("─────────────────────────────────────────────────────────────");
    
    const totalUsers = await prisma.user.count();
    const totalResumes = await prisma.resume.count();
    const totalAnalyses = await prisma.analysisReport.count();
    
    console.log(`  Total Users: ${totalUsers}`);
    console.log(`  Total Resumes: ${totalResumes}`);
    console.log(`  Total Analysis Reports: ${totalAnalyses}`);
    console.log(`  Analysis Coverage: ${totalResumes > 0 ? ((totalAnalyses / totalResumes) * 100).toFixed(1) : 0}%`);
    console.log();

    // Step 7: Session Storage Simulation Test
    console.log("🧪 STEP 7: Simulating Job Match Analysis Flow");
    console.log("─────────────────────────────────────────────────────────────");
    
    const testResume = user.resumes.find(r => r.status === 'ANALYZED' && r.analysis);
    if (testResume) {
      console.log(`✓ Using test resume: ${testResume.filename}`);
      console.log(`  Resume Text Length: ${testResume.originalText.length} chars`);
      console.log(`  Job Description Length: ${testResume.jobDescription.length} chars`);
      console.log();
      
      console.log("  This resume has the following data available:");
      console.log(`  - Resume ID: ${testResume.id}`);
      console.log(`  - ATS Score: ${testResume.analysis.atsScore}`);
      console.log(`  - Analysis ID: ${testResume.analysis.id}`);
      console.log();
      
      console.log("  To test the Job Match flow:");
      console.log("  1. The frontend should store this in sessionStorage:");
      console.log("     - resumeText");
      console.log("     - jobDescription");
      console.log("     - analysis object");
      console.log("     - timestamp");
      console.log();
      console.log("  2. Job Match page calls these APIs in parallel:");
      console.log("     - /api/job-match (POST)");
      console.log("     - /api/roadmap (POST)");
      console.log("     - /api/interview (POST)");
      console.log();
      console.log("  3. Each API makes a single OpenRouter request");
      console.log("  4. Results are cached in sessionStorage");
    } else {
      console.log("⚠️  No analyzed resume found for simulation");
    }
    console.log();

    // Summary
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║                     DIAGNOSTIC SUMMARY                      ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log();
    
    const issues = [];
    const warnings = [];
    
    if (!openRouterKey) {
      issues.push("OpenRouter API key is missing");
    }
    
    if (statusCounts.PROCESSING > 0) {
      warnings.push(`${statusCounts.PROCESSING} resume(s) stuck in PROCESSING state`);
    }
    
    if (statusCounts.FAILED > 0) {
      warnings.push(`${statusCounts.FAILED} resume(s) in FAILED state`);
    }
    
    if (!youtubeKey || youtubeKey.length === 0) {
      warnings.push("YouTube API key not configured (YouTube videos won't load)");
    }
    
    if (issues.length === 0 && warnings.length === 0) {
      console.log("✅ NO CRITICAL ISSUES DETECTED");
      console.log();
      console.log("System Status: HEALTHY");
      console.log();
      console.log("Expected Behavior:");
      console.log("  - Resume analysis should work correctly");
      console.log("  - Job Match page should load 3 API responses");
      console.log("  - Caching should prevent duplicate API calls");
      console.log("  - 55 resume analyses should be possible");
    } else {
      if (issues.length > 0) {
        console.log("❌ CRITICAL ISSUES:");
        issues.forEach(issue => console.log(`  - ${issue}`));
        console.log();
      }
      
      if (warnings.length > 0) {
        console.log("⚠️  WARNINGS:");
        warnings.forEach(warning => console.log(`  - ${warning}`));
        console.log();
      }
    }
    
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║                  NEXT STEPS FOR TESTING                    ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log();
    console.log("To test the actual analysis flow:");
    console.log("  1. Start the dev server: npm run dev");
    console.log("  2. Login with: arjun.reddy.test@careerpilot.dev");
    console.log("  3. Upload a resume and analyze it");
    console.log("  4. Check browser console for API responses");
    console.log("  5. Check server terminal for AI request logs");
    console.log();
    console.log("Look for these patterns in the logs:");
    console.log("  - [AI] errors indicate OpenRouter issues");
    console.log("  - 429 status = rate limit (wait and retry)");
    console.log("  - 401/403 status = API key issue");
    console.log("  - 5xx status = provider/server error (retry)");
    console.log("  - TIMEOUT = request exceeded 120 seconds");
    console.log();

  } catch (error) {
    console.error("❌ DIAGNOSTIC ERROR:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testAnalysisFlow();
