import { prisma } from './prisma';
import type { User, StudentProfile, RecruiterProfile, PasswordResetToken } from '@prisma/client';

// Export prisma for direct queries when needed
export { prisma };

// User operations
export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function createUser(data: {
  email: string;
  password: string;
  role?: string;
}): Promise<User> {
  return prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      password: data.password,
      role: data.role || 'STUDENT',
    },
  });
}

// Student profile operations
export async function findStudentProfile(userId: string): Promise<StudentProfile | null> {
  return prisma.studentProfile.findUnique({
    where: { userId },
  });
}

export async function createStudentProfile(data: {
  userId: string;
  fullName: string;
  phone?: string;
  college?: string;
  degree?: string;
  preferredRole?: string;
  location?: string;
}): Promise<StudentProfile> {
  return prisma.studentProfile.create({
    data,
  });
}

export async function updateStudentProfile(
  userId: string,
  data: Partial<Omit<StudentProfile, 'id' | 'userId'>>
): Promise<StudentProfile> {
  return prisma.studentProfile.update({
    where: { userId },
    data,
  });
}

// Recruiter profile operations
export async function findRecruiterProfile(userId: string): Promise<RecruiterProfile | null> {
  return prisma.recruiterProfile.findUnique({
    where: { userId },
  });
}

export function createRecruiterProfile(data: {
  userId: string;
  companyName: string;
  recruiterName: string;
  phone?: string;
  website?: string;
}): Promise<RecruiterProfile> {
  return prisma.recruiterProfile.create({
    data,
  });
}

export function updateRecruiterProfile(
  userId: string,
  data: Partial<Omit<RecruiterProfile, 'id' | 'userId'>>
): Promise<RecruiterProfile> {
  return prisma.recruiterProfile.update({
    where: { userId },
    data,
  });
}

// Resume operations
export function findResumesByUserId(userId: string) {
  return prisma.resume.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      analysis: true,
    },
  });
}

export function findResumeById(id: string) {
  return prisma.resume.findUnique({
    where: { id },
    include: {
      analysis: true,
      jobMatches: true,
    },
  });
}

export function createResume(data: {
  userId: string;
  filename: string;
  originalText?: string;
  fileSize?: number;
  fileType?: string;
  jobDescription?: string;
  status?: string;
}) {
  return prisma.resume.create({
    data: {
      userId: data.userId,
      filename: data.filename,
      originalText: data.originalText || '',
      fileSize: data.fileSize || 0,
      fileType: data.fileType || 'pdf',
      jobDescription: data.jobDescription || '',
      status: data.status || 'PROCESSING',
    },
  });
}

export function updateResumeStatus(id: string, status: string) {
  return prisma.resume.update({
    where: { id },
    data: { status },
  });
}

export async function saveAnalysisAndUpdateStatus(
  resumeId: string, 
  analysisData: {
    ats_score: number;
    summary: string;
    formatting_score: number;
    impact_verb_score: number;
    skills_match_score: number;
    experience_score: number;
    education_score: number;
    strengths: string;
    weaknesses: string;
    hidden_skills: string;
    keyword_suggestions: string;
    grammar_feedback: string;
    formatting_feedback: string;
    skills_gap: string;
    course_recommendations: string;
    roadmap: string;
    interview_questions: string;
  },
  status: string
) {
  // Use a transaction to ensure both operations succeed or fail together
  return prisma.$transaction(async (tx) => {
    // Create analysis report
    const analysis = await tx.analysisReport.create({
      data: {
        resumeId,
        atsScore: analysisData.ats_score,
        summary: analysisData.summary,
        formattingScore: analysisData.formatting_score,
        impactVerbScore: analysisData.impact_verb_score,
        skillsMatchScore: analysisData.skills_match_score,
        experienceScore: analysisData.experience_score,
        educationScore: analysisData.education_score,
        strengths: analysisData.strengths,
        weaknesses: analysisData.weaknesses,
        hiddenSkills: analysisData.hidden_skills,
        keywordSuggestions: analysisData.keyword_suggestions,
        grammarFeedback: analysisData.grammar_feedback,
        formattingFeedback: analysisData.formatting_feedback,
        skillsGap: analysisData.skills_gap,
        courseRecommendations: analysisData.course_recommendations,
        roadmap: analysisData.roadmap,
        interviewQuestions: analysisData.interview_questions,
      },
    });

    // Update resume status
    await tx.resume.update({
      where: { id: resumeId },
      data: { status },
    });

    return analysis;
  });
}

// Analysis operations
export function createAnalysisReport(data: any) {
  return prisma.analysisReport.create({
    data,
  });
}

export function findAnalysisByResumeId(resumeId: string) {
  return prisma.analysisReport.findUnique({
    where: { resumeId },
  });
}

// Job match operations
export function createJobMatch(data: any) {
  return prisma.jobMatch.create({
    data,
  });
}

export function findJobMatchesByResumeId(resumeId: string) {
  return prisma.jobMatch.findMany({
    where: { resumeId },
    orderBy: { createdAt: 'desc' },
  });
}

// System logs
export function createSystemLog(data: {
  userId?: string;
  action: string;
  details?: string;
}) {
  return prisma.systemLog.create({
    data: {
      userId: data.userId || null,
      action: data.action,
      details: data.details || '',
    },
  });
}

// Statistics
export async function getSystemStats() {
  const [totalUsers, totalResumes, totalAnalyses] = await Promise.all([
    prisma.user.count(),
    prisma.resume.count(),
    prisma.analysisReport.count(),
  ]);

  const avgAtsScore = await prisma.analysisReport.aggregate({
    _avg: { atsScore: true },
  });

  return {
    totalUsers,
    totalResumes,
    totalAnalyses,
    avgAtsScore: Math.round(avgAtsScore._avg.atsScore || 0),
    apiCalls: totalAnalyses * 3, // Rough estimate
  };
}

// Utility functions for backwards compatibility
export function generateId(): string {
  // Generate a simple ID similar to cuid
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function dbRun(query: string, params: any[] = []): Promise<void> {
  // This is a compatibility function for raw SQL queries
  // For activity logging, we'll use the system log table
  if (query.includes('activity_log')) {
    // Extract values from the query parameters
    const [id, userId, action, details] = params;
    await createSystemLog({
      userId,
      action,
      details,
    });
  }
  // For other queries, we'll just log them for now
  console.log('Raw SQL query (deprecated):', query, params);
}
// Password reset token operations
export async function createPasswordResetToken(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<PasswordResetToken> {
  // Clean up any existing tokens for this user first
  await prisma.passwordResetToken.deleteMany({
    where: { userId: data.userId },
  });
  
  return prisma.passwordResetToken.create({
    data,
  });
}

export async function findPasswordResetToken(tokenHash: string): Promise<PasswordResetToken & { user: User } | null> {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
}

export async function deletePasswordResetToken(tokenHash: string): Promise<void> {
  await prisma.passwordResetToken.delete({
    where: { tokenHash },
  });
}

export async function updateUserPassword(userId: string, hashedPassword: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
}

// Job operations
export function createJob(data: {
  recruiterId: string;
  title: string;
  company: string;
  description?: string;
  location?: string;
  salary?: string;
  requirements?: string;
  status?: string;
}) {
  return prisma.job.create({
    data: {
      recruiterId: data.recruiterId,
      title: data.title,
      company: data.company,
      description: data.description ?? '',
      location: data.location ?? '',
      salary: data.salary ?? '',
      requirements: data.requirements ?? '[]',
      status: data.status ?? 'DRAFT',
    },
  });
}

export function findJobsByRecruiter(recruiterId: string) {
  return prisma.job.findMany({
    where: { recruiterId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { applications: true } },
    },
  });
}

export function findJobById(id: string) {
  return prisma.job.findUnique({
    where: { id },
    include: {
      recruiter: true,
    },
  });
}

export function updateJob(
  id: string,
  data: Partial<{
    title: string;
    company: string;
    description: string;
    location: string;
    salary: string;
    requirements: string;
    status: string;
  }>
) {
  return prisma.job.update({
    where: { id },
    data,
  });
}

export function findPublishedJobs(searchTerm?: string) {
  const term = searchTerm?.trim();
  return prisma.job.findMany({
    where: {
      status: 'PUBLISHED',
      ...(term
        ? {
            OR: [
              { title: { contains: term } },
              { company: { contains: term } },
              { location: { contains: term } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      recruiter: { select: { companyName: true } },
    },
  });
}

// Application operations
export function createApplication(data: {
  jobId: string;
  userId: string;
  resumeId?: string;
}) {
  return prisma.application.create({
    data: {
      jobId: data.jobId,
      userId: data.userId,
      resumeId: data.resumeId ?? null,
      status: 'APPLIED',
    },
  });
}

export function findApplicationByJobAndUser(jobId: string, userId: string) {
  return prisma.application.findUnique({
    where: { jobId_userId: { jobId, userId } },
  });
}

export async function findApplicationsByRecruiter(
  recruiterId: string,
  filters?: {
    jobId?: string;
    status?: string;
    search?: string;
    skip?: number;
    take?: number;
  }
) {
  const search = filters?.search?.trim();
  const where = {
    job: { recruiterId },
    ...(filters?.jobId ? { jobId: filters.jobId } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(search
      ? {
          user: {
            studentProfile: {
              OR: [
                { fullName: { contains: search } },
                { college: { contains: search } },
              ],
            },
          },
        }
      : {}),
  };

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      include: {
        job: { select: { title: true } },
        // select (not include) on user — never serialize the password hash to API responses.
        user: { select: { id: true, email: true, studentProfile: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    }),
    prisma.application.count({ where }),
  ]);

  return { applications, total };
}

export function findApplicationById(id: string) {
  return prisma.application.findUnique({
    where: { id },
    include: {
      job: true,
      // select (not include) on user — never serialize the password hash to API responses.
      user: { select: { id: true, email: true, studentProfile: true } },
      resume: { include: { analysis: true } },
    },
  });
}

export function updateApplicationStatus(id: string, status: string) {
  return prisma.application.update({ where: { id }, data: { status } });
}

// Recruiter dashboard aggregation operations
export async function getRecruiterFunnelCounts(recruiterId: string) {
  const statuses = ['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED'] as const;
  const [applied, shortlisted, interview, offered, hired, rejected] = await Promise.all(
    statuses.map((status) =>
      prisma.application.count({
        where: { job: { recruiterId }, status },
      })
    )
  );

  return { applied, shortlisted, interview, offered, hired, rejected };
}

export async function getRecruiterApplicationsOverTime(recruiterId: string, days: number = 14) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.application.findMany({
    where: {
      job: { recruiterId },
      createdAt: { gte: since },
    },
    select: { createdAt: true },
  });

  // Zero-fill every day in range, then tally counts in JS (avoids raw SQL date grouping on SQLite).
  const counts = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    counts.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, count }));
}

export async function getRecruiterRecentActivity(
  recruiterId: string,
  recruiterUserId: string,
  limit: number = 10
) {
  const RECRUITER_LOG_ACTIONS = ['JOB_POSTED', 'JOB_PUBLISHED', 'JOB_ARCHIVED', 'JOB_UPDATED'];

  const [logs, applications] = await Promise.all([
    prisma.systemLog.findMany({
      where: { userId: recruiterUserId, action: { in: RECRUITER_LOG_ACTIONS } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.application.findMany({
      where: { job: { recruiterId } },
      include: {
        // select (not include) on user — avoid pulling the password hash into memory.
        user: { select: { email: true, studentProfile: true } },
        job: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);

  type ActivityEntry = {
    type: 'system_log' | 'application';
    action: string;
    description: string;
    createdAt: Date;
  };

  const logEntries: ActivityEntry[] = logs.map((log) => ({
    type: 'system_log',
    action: log.action,
    description: log.details || log.action,
    createdAt: log.createdAt,
  }));

  const applicationEntries: ActivityEntry[] = applications.map((app) => {
    const studentName = app.user.studentProfile?.fullName || app.user.email;
    const jobTitle = app.job.title;
    return {
      type: 'application',
      action: 'APPLICATION_RECEIVED',
      description: `${studentName} applied to ${jobTitle}`,
      createdAt: app.createdAt,
    };
  });

  return [...logEntries, ...applicationEntries]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}