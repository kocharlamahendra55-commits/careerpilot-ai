// TypeScript interfaces for CareerPilot AI

export interface ATSScoreBreakdown {
  formatting: number;
  impact_verbs: number;
  skills_match: number;
  experience_depth: number;
  education_relevance: number;
}

export interface ResumeAnalysis {
  ats_score: number;
  summary: string;
  score_breakdown: ATSScoreBreakdown;
  formatting_feedback: string[];
  strengths: string[];
  weaknesses: string[];
  hidden_skills: string[];
  grammar_tone_feedback: string[];
  keyword_optimizer_suggestions: string[];
}

export interface CourseRecommendation {
  title: string;
  provider: string;
  difficulty: string;
  link: string;
}

export interface ResourceRecommendations {
  github_repos: string[];
  linkedin_influencers: string[];
  youtube_channels_or_videos: string[];
}

export interface SkillGap {
  skills_gap: string[];
  course_recommendations: CourseRecommendation[];
  resource_recommendations: ResourceRecommendations;
}

export interface SkillGapDetail {
  skill: string;
  importance: string;
  why_required: string;
  priority: number;
  estimated_time: string;
  resources: {
    youtube?: any[];
    documentation?: { title: string; url: string }[];
    courses?: { title: string; platform: string; url: string; free: boolean; duration: string }[];
    practice_platforms?: { platform: string; url: string }[];
  };
  mini_projects: string[];
}

export interface JobMatch {
  match_score: number;
  skills_matching: string[];
  skills_missing: string[];
  jd_keywords_found: string[];
  jd_keywords_missing: string[];
  fit_analysis: string;
  improvement_plan: string[];
  strengths_for_role?: string[];
  interview_likelihood?: string;
  salary_estimate?: string;
  skill_gaps?: SkillGapDetail[];
}

export interface InterviewQuestion {
  question: string;
  type: string;
  intent: string;
  sample_answer: string;
}

export interface InterviewPrep {
  questions: InterviewQuestion[];
}

// Legacy types (kept for backward compatibility)
export interface RoadmapMilestone {
  phase: string;
  title: string;
  description: string;
  skills_to_acquire: string[];
  projects_to_build: string[];
}

// ── Enhanced Roadmap Types ─────────────────────────────────────────────────

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelName: string;
  channelId: string;
  thumbnail: string;
  viewCount: number;
  publishedAt: string;
  duration: string;
  language: "English" | "Hindi" | "Telugu" | "Tamil";
}

export interface RoadmapCourse {
  title: string;
  platform: string;
  url: string;
  free: boolean;
  duration: string;
}

export interface RoadmapDocumentation {
  title: string;
  url: string;
}

export interface RoadmapCodingPractice {
  platform: string;
  url: string;
  focus: string;
}

export interface RoadmapResources {
  youtube?: YouTubeVideo[];
  youtube_topics?: string[];
  courses: RoadmapCourse[];
  documentation: RoadmapDocumentation[];
  coding_practice: RoadmapCodingPractice[];
}

export interface RoadmapProject {
  name: string;
  description: string;
  tech_stack: string[];
}

export interface RoadmapPhase {
  phase: string;
  title: string;
  duration: string;
  focus: string;
  goals: string[];
  skills_to_learn: string[];
  projects: RoadmapProject[];
  certifications: string[];
  milestones: string[];
  resources: RoadmapResources;
}

export interface JobApplicationMilestone {
  milestone: string;
  timing: string;
  description: string;
}

export interface JobPlatform {
  name: string;
  url: string;
  description: string;
}

export interface CareerRoadmap {
  target_role: string;
  current_level?: string;
  estimated_timeline?: string;
  readiness_score?: number;
  current_skills_assessment?: string;
  phases?: RoadmapPhase[];
  job_application_milestones?: JobApplicationMilestone[];
  job_platforms?: JobPlatform[];
  portfolio_recommendations?: string[];
  resume_improvement_tips?: string[];
  interview_prep_milestones?: string[];
  recommended_certifications?: string[];
  skills_to_acquire?: string[];
  // legacy
  roadmap_timeline?: RoadmapMilestone[];
}

export interface ResumeRecord {
  id: string;
  filename: string;
  fileSize: number;
  fileType: string;
  status: "PROCESSING" | "ANALYZED" | "FAILED";
  createdAt: string;
  analysis?: {
    atsScore: number;
    summary: string;
  };
}

export interface DashboardStats {
  totalResumes: number;
  averageAtsScore: number;
  analyzedThisMonth: number;
  totalJobMatches: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
}
