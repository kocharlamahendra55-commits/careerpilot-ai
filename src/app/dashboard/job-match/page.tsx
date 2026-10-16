"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, ArrowRight, CheckCircle2, XCircle, Zap, Target, Map, MessageSquare, BookOpen, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Clock, Star, Award, Code, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { JobMatch } from "@/types";
import { categorizeJobPlatforms } from "@/lib/jobPlatformCategories";
import { generateResumeAnalysisReport } from "@/lib/pdfGenerator";

const LOADING_STEPS = [
  { text: "Reading Resume...", duration: 600 },
  { text: "Extracting Skills...", duration: 700 },
  { text: "Matching Job Description...", duration: 800 },
  { text: "Calculating ATS Score...", duration: 700 },
  { text: "Building Career Roadmap...", duration: 900 },
  { text: "Preparing Interview Questions...", duration: 700 },
];

export default function JobMatchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [resumeText, setResumeText] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [atsScore, setAtsScore] = useState(0);
  const [atsSummary, setAtsSummary] = useState("");
  const [atsBreakdown, setAtsBreakdown] = useState<any>(null);
  const [result, setResult] = useState<JobMatch | null>(null);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [interviewPrep, setInterviewPrep] = useState<any>(null);
  const [skillGap, setSkillGap] = useState<any>(null);
  const [skillGapDetails, setSkillGapDetails] = useState<any[]>([]);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<string>("overview");

  // ”€”€ Frontend schema normalization: ensures all fields exist before rendering ”€”€
  const normalizeJobMatch = (raw: any): JobMatch => ({
    match_score: typeof raw?.match_score === "number" ? raw.match_score : 0,
    fit_analysis: raw?.fit_analysis ?? "",
    skills_matching: Array.isArray(raw?.skills_matching) ? raw.skills_matching : [],
    skills_missing: Array.isArray(raw?.skills_missing) ? raw.skills_missing : [],
    jd_keywords_found: Array.isArray(raw?.jd_keywords_found) ? raw.jd_keywords_found : [],
    jd_keywords_missing: Array.isArray(raw?.jd_keywords_missing) ? raw.jd_keywords_missing : [],
    improvement_plan: Array.isArray(raw?.improvement_plan) ? raw.improvement_plan : [],
    strengths_for_role: Array.isArray(raw?.strengths_for_role) ? raw.strengths_for_role : [],
    interview_likelihood: raw?.interview_likelihood ?? "Medium",
    salary_estimate: raw?.salary_estimate ?? "",
    skill_gaps: Array.isArray(raw?.skill_gaps)
      ? raw.skill_gaps.map((gap: any) => ({
          skill: gap?.skill ?? "",
          importance: gap?.importance ?? "Medium",
          why_required: gap?.why_required ?? "",
          priority: typeof gap?.priority === "number" ? gap.priority : 5,
          estimated_time: gap?.estimated_time ?? "",
          resources: {
            youtube: Array.isArray(gap?.resources?.youtube) ? gap.resources.youtube : [],
            documentation: Array.isArray(gap?.resources?.documentation) ? gap.resources.documentation : [],
            courses: Array.isArray(gap?.resources?.courses) ? gap.resources.courses : [],
            practice_platforms: Array.isArray(gap?.resources?.practice_platforms) ? gap.resources.practice_platforms : [],
          },
          mini_projects: Array.isArray(gap?.mini_projects) ? gap.mini_projects : [],
        }))
      : [],
  } as JobMatch);

  useEffect(() => {
    loadDataAndAnalyze();
  }, []);

  const loadDataAndAnalyze = async () => {
    try {
      // Load from sessionStorage
      const storedData = sessionStorage.getItem('resumeAnalysisData');
      
      if (!storedData) {
        setError("No analysis data found. Please upload and analyze a resume first.");
        setLoading(false);
        return;
      }

      const { resumeText: resText, jobDescription: jobDescText, analysis, timestamp } = JSON.parse(storedData);
      setResumeText(resText);
      setJobDesc(jobDescText);
      setAtsScore(analysis.ats_score || 0);
      setAtsSummary(analysis.summary || "");
      setAtsBreakdown(analysis.score_breakdown || {});

      // Check if we have cached data that's less than 5 minutes old
      const cacheKey = `career_analysis_${resText.length}_${resText.slice(0, 50).replace(/\s/g, '')}_${jobDescText.slice(0, 20).replace(/\s/g, '')}_${timestamp}`;
      const cached = sessionStorage.getItem(cacheKey);
      const now = Date.now();
      
      if (cached) {
        const { data, timestamp: cacheTime } = JSON.parse(cached);
        if (now - cacheTime < 5 * 60 * 1000) { // 5 minutes cache
          console.log("[JobMatch] Using cached data");
          if (data.jobMatch) {
            const normalized = normalizeJobMatch(data.jobMatch);
            setResult(normalized);
            setSkillGapDetails(normalized.skill_gaps || []);
            setSkillGap({
              missing_skills: normalized.skills_missing,
              improvement_plan: normalized.improvement_plan,
            });
          }
          if (data.roadmap) setRoadmap(data.roadmap);
          if (data.interviewPrep) setInterviewPrep(data.interviewPrep);
          setLoading(false);
          return;
        }
      }

      // Shorter loading animation
      for (let i = 0; i < LOADING_STEPS.length; i++) {
        setLoadingStep(i);
        await new Promise(resolve => setTimeout(resolve, 50)); // Minimal delay for UX
      }

      // Call APIs in parallel with better error handling
      type ApiResult = { success: boolean; data?: any; error?: string };
      
      const callJobMatchAPI = async (): Promise<ApiResult> => {
        try {
          const res = await fetch("/api/job-match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resume_text: resText, job_description: jobDescText }),
          });
          if (res.ok) {
            const result = await res.json();
            return { success: true, data: result.match };
          } else {
            const errorBody = await res.json().catch(() => ({}));
            const errorMsg = errorBody.error || `HTTP ${res.status}`;
            console.error("[JobMatch] Job Match API error:", errorMsg, errorBody);
            return { success: false, error: `Job Match API: ${errorMsg}` };
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Network error";
          console.error("[JobMatch] Job Match API exception:", errorMsg);
          return { success: false, error: `Job Match API: ${errorMsg}` };
        }
      };

      const callRoadmapAPI = async (): Promise<ApiResult> => {
        try {
          const res = await fetch("/api/roadmap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resume_text: resText, target_role: jobDescText }),
          });
          if (res.ok) {
            const result = await res.json();
            return { success: true, data: result.roadmap };
          } else {
            const errorBody = await res.json().catch(() => ({}));
            const errorMsg = errorBody.error || `HTTP ${res.status}`;
            console.error("[JobMatch] Roadmap API error:", errorMsg, errorBody);
            return { success: false, error: `Roadmap API: ${errorMsg}` };
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Network error";
          console.error("[JobMatch] Roadmap API exception:", errorMsg);
          return { success: false, error: `Roadmap API: ${errorMsg}` };
        }
      };

      const callInterviewAPI = async (): Promise<ApiResult> => {
        try {
          const res = await fetch("/api/interview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resume_text: resText, job_description: jobDescText }),
          });
          if (res.ok) {
            const result = await res.json();
            return { success: true, data: result.interview_prep };
          } else {
            const errorBody = await res.json().catch(() => ({}));
            const errorMsg = errorBody.error || `HTTP ${res.status}`;
            console.error("[JobMatch] Interview API error:", errorMsg, errorBody);
            return { success: false, error: `Interview API: ${errorMsg}` };
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : "Network error";
          console.error("[JobMatch] Interview API exception:", errorMsg);
          return { success: false, error: `Interview API: ${errorMsg}` };
        }
      };

      // Call APIs sequentially with delay to avoid rate limits
      console.log("[JobMatch] Starting API calls (sequential with delay)...");
      
      const jobMatchResult = await callJobMatchAPI();
      if (jobMatchResult.success) {
        console.log("[JobMatch] ✓ Job Match API succeeded");
      } else {
        console.error("[JobMatch] ✗ Job Match API failed:", jobMatchResult.error);
      }
      
      // Small delay to avoid rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const roadmapResult = await callRoadmapAPI();
      if (roadmapResult.success) {
        console.log("[JobMatch] ✓ Roadmap API succeeded");
      } else {
        console.error("[JobMatch] ✗ Roadmap API failed:", roadmapResult.error);
      }
      
      // Small delay to avoid rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const interviewResult = await callInterviewAPI();
      if (interviewResult.success) {
        console.log("[JobMatch] ✓ Interview API succeeded");
      } else {
        console.error("[JobMatch] ✗ Interview API failed:", interviewResult.error);
      }

      // Process results with detailed error tracking
      let hasData = false;
      const cacheData: any = {};
      const failedApis: string[] = [];

      if (jobMatchResult.success && jobMatchResult.data) {
        const normalized = normalizeJobMatch(jobMatchResult.data);
        setResult(normalized);
        setSkillGapDetails(normalized.skill_gaps || []);
        setSkillGap({
          missing_skills: normalized.skills_missing,
          improvement_plan: normalized.improvement_plan,
        });
        cacheData.jobMatch = normalized;
        hasData = true;
      } else {
        console.warn("Job Match API failed:", jobMatchResult.error);
        failedApis.push("Job Match");
      }

      if (roadmapResult.success && roadmapResult.data) {
        const normalizedRoadmap = normalizeData(roadmapResult.data);
        setRoadmap(normalizedRoadmap);
        cacheData.roadmap = normalizedRoadmap;
        hasData = true;
      } else {
        console.warn("Roadmap API failed:", roadmapResult.error);
        failedApis.push("Career Roadmap");
      }

      if (interviewResult.success && interviewResult.data) {
        const normalizedInterview = normalizeData(interviewResult.data);
        setInterviewPrep(normalizedInterview);
        cacheData.interviewPrep = normalizedInterview;
        hasData = true;
      } else {
        console.warn("Interview API failed:", interviewResult.error);
        failedApis.push("Interview Prep");
      }

      if (!hasData) {
        // All APIs failed - set error state without throwing
        const errorDetails = failedApis.length === 3 
          ? "All analysis services are currently unavailable. This may be due to:\n\n" +
            "? AI service rate limit (if analyzing many resumes quickly)\n" +
            "? Network connectivity issues\n" +
            "? Temporary service outage\n\n" +
            "Please wait 2-3 minutes and try again. If the issue persists, contact support."
          : `${failedApis.join(", ")} ${failedApis.length === 1 ? "service is" : "services are"} currently unavailable.`;
        
        console.error("[JobMatch] Analysis failed:", errorDetails);
        setError(errorDetails);
        setLoading(false);
        return; // Don't throw - prevents React error boundary
      }
      
      // Log partial failures
      if (failedApis.length > 0) {
        console.warn(`[JobMatch] Partial success: ${failedApis.join(", ")} failed but continuing with available data`);
      }

      // Cache the results - Use same cache key format for consistency
      const finalCacheKey = `career_analysis_${resText.length}_${resText.slice(0, 50).replace(/\s/g, '')}_${jobDescText.slice(0, 20).replace(/\s/g, '')}_${timestamp}`;
      sessionStorage.setItem(finalCacheKey, JSON.stringify({
        data: cacheData,
        timestamp: now
      }));

      setLoading(false);

    } catch (e: unknown) {
      console.error("Error loading analysis:", e);
      setError(e instanceof Error ? e.message : "Failed to load analysis data");
      setLoading(false);
    }
  };

  const toggleQuestion = (index: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  const togglePhase = (index: number) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPhases(newExpanded);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Target },
    { id: "skillgap", label: "Skill Gap", icon: BookOpen },
    { id: "roadmap", label: "Career Roadmap", icon: Map },
    { id: "interview", label: "Interview Prep", icon: MessageSquare },
  ];

  const formatViews = (views: number): string => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const getVideoUrl = (vid: any): string => {
    // Handle both new structure (videoId) and old structure (url)
    if (vid.videoId) return `https://www.youtube.com/watch?v=${vid.videoId}`;
    if (vid.url) return vid.url;
    return '#';
  };

  const normalizeData = (data: any): any => {
    if (!data || typeof data !== 'object') return data;
    
    const normalized: Record<string, any> = Array.isArray(data) ? [] : {};
    
    for (const key in data) {
      const value = data[key];
      
      if (Array.isArray(value)) {
        normalized[key] = value.length > 0 ? value.map(normalizeData) : [];
      } else if (typeof value === 'object' && value !== null) {
        normalized[key] = normalizeData(value);
      } else if (typeof value === 'string') {
        normalized[key] = value;
      } else if (typeof value === 'number') {
        normalized[key] = value;
      } else if (value === null || value === undefined) {
        if (Array.isArray(data)) {
          normalized[key] = null;
        } else {
          // Determine default based on key name patterns
          if (key.includes('count') || key.includes('score') || key.includes('priority') || key.includes('duration')) {
            normalized[key] = 0;
          } else if (key.includes('list') || key.includes('items') || key.includes('skills') || key.includes('goals')) {
            normalized[key] = [];
          } else {
            normalized[key] = '';
          }
        }
      } else {
        normalized[key] = value;
      }
    }
    
    return normalized;
  };

  // Generate Executive Career Snapshot insights from existing analysis data
  const generateExecutiveSnapshot = () => {
    if (!result && !roadmap && !interviewPrep) return null;

    // Hiring Readiness Score - derived from ATS score and match score
    const hiringReadiness = Math.round((atsScore + (result?.match_score || 0)) / 2);
    
    // Strongest Competitive Advantage - from existing strengths/matching skills
    const topStrength = result?.strengths_for_role?.[0] || result?.skills_matching?.[0];
    const advantage = topStrength ? 
      (topStrength.includes('React') || topStrength.includes('JavaScript') ? 'Frontend Development Expertise' :
       topStrength.includes('Python') || topStrength.includes('Data') ? 'Data Science & Analytics' :
       topStrength.includes('AWS') || topStrength.includes('Cloud') ? 'Cloud Architecture Skills' :
       topStrength.includes('Management') || topStrength.includes('Lead') ? 'Leadership Experience' :
       'Technical Proficiency') : null;

    // Biggest Hiring Risk - from missing skills or weaknesses
    const criticalMissing = result?.skills_missing?.slice(0, 2) || [];
    const risk = criticalMissing.length > 0 ? 
      `Missing ${criticalMissing[0]}${criticalMissing[1] ? ` & ${criticalMissing[1]}` : ''}` : null;

    // Fastest Improvement - from improvement plan or skill gaps
    const quickWin = result?.improvement_plan?.[0] || skillGapDetails?.[0]?.skill;
    const improvement = quickWin ? 
      (quickWin.includes('certif') ? 'Get Industry Certification' :
       quickWin.includes('project') || quickWin.includes('portfolio') ? 'Build Portfolio Project' :
       quickWin.includes('skill') || quickWin.includes('learn') ? 'Upskill Core Technology' :
       'Update Resume Keywords') : null;

    // Best-Fit Job Category - from roadmap target or job description analysis
    const targetRole = roadmap?.target_role || jobDesc;
    const category = targetRole ?
      (targetRole.includes('Senior') || targetRole.includes('Lead') ? 'Senior Technical Role' :
       targetRole.includes('Full Stack') ? 'Full Stack Development' :
       targetRole.includes('Frontend') ? 'Frontend Engineering' :
       targetRole.includes('Backend') ? 'Backend Engineering' :
       targetRole.includes('Data') ? 'Data Engineering' :
       'Software Development') : null;

    // Recruiter Confidence - based on ATS score and match score
    const confidence = hiringReadiness >= 80 ? 'High' : 
                      hiringReadiness >= 60 ? 'Medium' : 'Low';

    // ATS Improvement Potential - based on current score
    const atsImprovement = atsScore >= 80 ? '10-15 points' :
                          atsScore >= 60 ? '15-25 points' : 
                          '25-40 points';

    // Career Direction - from roadmap assessment
    const currentLevel = roadmap?.current_level;
    const direction = currentLevel ?
      (currentLevel.includes('Junior') || currentLevel.includes('Entry') ? 'Advancing to Mid-Level' :
       currentLevel.includes('Mid') || currentLevel.includes('Senior') ? 'Growth to Senior/Lead' :
       'Leadership & Specialization') :
      (hiringReadiness >= 70 ? 'Career Advancement' : 'Skill Development Focus');

    return {
      hiringReadiness,
      advantage,
      risk,
      improvement,
      category,
      confidence,
      atsImprovement,
      direction
    };
  };

  // Generate Recruiter Perspective insights from existing analysis data
  const generateRecruiterPerspective = () => {
    if (!result && !roadmap && !interviewPrep) return null;

    // First Impression (based on ATS score and summary)
    const firstImpression = atsScore >= 85 ? "Strong technical profile with excellent ATS optimization" :
                           atsScore >= 70 ? "Solid candidate profile with good technical foundation" :
                           atsScore >= 55 ? "Potential candidate requiring targeted improvements" :
                           "Profile needs significant enhancement before consideration";

    // Top 3 Hiring Strengths (from existing strengths/matching skills)
    const allStrengths = [
      ...(result?.strengths_for_role || []),
      ...(result?.skills_matching || [])
    ].slice(0, 3);

    const hiringStrengths = allStrengths.length > 0 ? allStrengths : 
      atsScore >= 70 ? ["Technical competency demonstrated", "Resume well-structured", "Industry-relevant experience"] :
      ["Basic technical foundation", "Relevant educational background", "Professional presentation"];

    // Top 3 Hiring Risks (from missing skills/weaknesses)
    const allRisks = [
      ...(result?.skills_missing || []).slice(0, 2),
      ...(skillGapDetails?.slice(0, 1).map(gap => gap.skill) || [])
    ].slice(0, 3);

    const hiringRisks = allRisks.length > 0 ? 
      allRisks.map(risk => `Missing ${risk}`) :
      atsScore < 60 ? ["Limited technical depth", "Insufficient keywords", "Experience gaps"] :
      ["Minor skill updates needed"];

    // Interview Recommendation
    const matchScore = result?.match_score || 0;
    const avgScore = (atsScore + matchScore) / 2;
    const recommendation = avgScore >= 80 ? "Proceed" :
                          avgScore >= 65 ? "Consider" : "Hold";

    // Best Suitable Role (from job description or analysis)
    const targetRole = roadmap?.target_role || jobDesc || "Role assessment needed";
    
    // Interview Focus Areas (from existing improvement plan)
    const focusAreas = result?.improvement_plan?.slice(0, 3) || 
                      skillGapDetails?.slice(0, 3).map(gap => gap.skill) ||
                      ["Technical competency", "Project experience", "Problem-solving approach"];

    // Suggested Candidate Level (from roadmap current level or inferred from experience)
    const currentLevel = roadmap?.current_level;
    let candidateLevel = "Mid";
    if (currentLevel) {
      if (currentLevel.includes('Entry') || currentLevel.includes('Junior') || currentLevel.includes('Graduate')) {
        candidateLevel = "Fresher";
      } else if (currentLevel.includes('Senior') || currentLevel.includes('Lead')) {
        candidateLevel = "Senior";
      } else if (currentLevel.includes('Intern')) {
        candidateLevel = "Intern";
      }
    } else {
      // Infer from scores
      candidateLevel = avgScore >= 85 ? "Senior" :
                      avgScore >= 70 ? "Mid" :
                      avgScore >= 50 ? "Junior" : "Fresher";
    }

    // Overall Recruiter Verdict (based on fit analysis or generated)
    let verdict = result?.fit_analysis || "";
    if (!verdict) {
      verdict = avgScore >= 80 ? 
        "Strong candidate with excellent technical fit and immediate contribution potential. Recommend fast-track interview process." :
        avgScore >= 65 ?
        "Solid candidate profile with good foundation. Address skill gaps through targeted interview assessment." :
        "Developing candidate requiring significant upskilling. Consider for junior roles with mentorship support.";
    }
    
    // Ensure verdict is 2-3 sentences
    const sentences = verdict.split('.').filter(s => s.trim()).slice(0, 3);
    const finalVerdict = sentences.join('. ') + (sentences.length > 0 ? '.' : '');

    return {
      firstImpression,
      hiringStrengths,
      hiringRisks,
      recommendation,
      targetRole,
      focusAreas,
      candidateLevel,
      verdict: finalVerdict,
      interviewLikelihood: result?.interview_likelihood || "Medium"
    };
  };


  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card className="p-12 flex flex-col items-center text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-purple/30 to-brand-indigo/20 border border-brand-purple/30 flex items-center justify-center mb-6"
          >
            <Zap size={32} className="text-brand-purple-light" />
          </motion.div>
          <h3 className="text-2xl font-bold text-white mb-3">Analyzing Your Profile</h3>
          <p className="text-sm text-white/50 mb-8">Generating comprehensive AI analysis...</p>
          
          <div className="w-full max-w-md space-y-4">
            {LOADING_STEPS.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: idx <= loadingStep ? 1 : 0.3,
                  x: 0 
                }}
                className="flex items-center gap-4"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                  idx < loadingStep 
                    ? "bg-emerald-500/20 border border-emerald-500/40" 
                    : idx === loadingStep
                    ? "bg-brand-purple/20 border border-brand-purple/40 animate-pulse"
                    : "bg-white/5 border border-white/10"
                }`}>
                  {idx < loadingStep ? <CheckCircle2 size={16} className="text-emerald-400" /> : <span className="text-brand-purple-light text-sm">•</span>}
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium transition-colors ${
                    idx <= loadingStep ? "text-white" : "text-white/40"
                  }`}>
                    {step.text}
                  </p>
                </div>
                {idx === loadingStep && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 rounded-full bg-brand-purple-light"
                  />
                )}
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="p-10 text-center">
          <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Analysis Not Available</h3>
          <p className="text-sm text-white/50 mb-6">{error}</p>
          <Button onClick={() => router.push("/dashboard/upload")}>
            <ArrowRight size={16} />
            Go to Upload Resume
          </Button>
        </Card>
      </div>
    );
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500/40 to-pink-600/20 flex items-center justify-center">
            <Briefcase size={18} className="text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Career Intelligence Dashboard</h1>
            <p className="text-sm text-white/40">Complete analysis for: {jobDesc}</p>
          </div>
        </div>
      </motion.div>

      {/* Executive Career Snapshot */}
      {(() => {
        const snapshot = generateExecutiveSnapshot();
        if (!snapshot) return null;
        
        return (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
            <Card className="bg-gradient-to-br from-brand-purple/8 to-brand-indigo/4 border-brand-purple/15">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-purple/20 flex items-center justify-center">
                    <Star size={16} className="text-brand-purple-light" />
                  </div>
                  <CardTitle className="text-lg">Executive Career Snapshot</CardTitle>
                  <Badge variant="purple" className="ml-auto text-xs">15s read</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Hiring Readiness Score */}
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Hiring Readiness</p>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                        <span className="text-lg font-bold text-emerald-400">{snapshot.hiringReadiness}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {snapshot.hiringReadiness >= 80 ? 'Interview Ready' : 
                           snapshot.hiringReadiness >= 60 ? 'Strong Candidate' : 'Needs Focus'}
                        </p>
                        <p className="text-xs text-white/50">/100 Overall</p>
                      </div>
                    </div>
                  </div>

                  {/* Strongest Competitive Advantage */}
                  {snapshot.advantage && (
                    <div className="space-y-2">
                      <p className="text-xs text-white/40 uppercase tracking-wider">Competitive Edge</p>
                      <div className="flex items-start gap-2">
                        <Zap size={14} className="text-yellow-400 mt-1 shrink-0" />
                        <p className="text-sm font-medium text-white leading-snug">{snapshot.advantage}</p>
                      </div>
                    </div>
                  )}

                  {/* Biggest Hiring Risk */}
                  {snapshot.risk && (
                    <div className="space-y-2">
                      <p className="text-xs text-white/40 uppercase tracking-wider">Primary Risk</p>
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-red-400 mt-1 shrink-0" />
                        <p className="text-sm font-medium text-white leading-snug">{snapshot.risk}</p>
                      </div>
                    </div>
                  )}

                  {/* Fastest Improvement */}
                  {snapshot.improvement && (
                    <div className="space-y-2">
                      <p className="text-xs text-white/40 uppercase tracking-wider">Quick Win</p>
                      <div className="flex items-start gap-2">
                        <Target size={14} className="text-brand-cyan-light mt-1 shrink-0" />
                        <p className="text-sm font-medium text-white leading-snug">{snapshot.improvement}</p>
                      </div>
                    </div>
                  )}

                </div>

                {/* Second Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  
                  {/* Best-Fit Job Category */}
                  {snapshot.category && (
                    <div className="space-y-2">
                      <p className="text-xs text-white/40 uppercase tracking-wider">Best Fit Role</p>
                      <div className="flex items-start gap-2">
                        <Briefcase size={14} className="text-pink-400 mt-1 shrink-0" />
                        <p className="text-sm font-medium text-white leading-snug">{snapshot.category}</p>
                      </div>
                    </div>
                  )}

                  {/* Recruiter Confidence */}
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Recruiter Appeal</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        snapshot.confidence === 'High' ? 'bg-emerald-400' :
                        snapshot.confidence === 'Medium' ? 'bg-yellow-400' : 'bg-red-400'
                      }`} />
                      <p className="text-sm font-semibold text-white">{snapshot.confidence} Interest</p>
                    </div>
                  </div>

                  {/* ATS Improvement Potential */}
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider">ATS Upside</p>
                    <div className="flex items-start gap-2">
                      <TrendingUp size={14} className="text-brand-purple-light mt-1 shrink-0" />
                      <p className="text-sm font-medium text-white leading-snug">+{snapshot.atsImprovement}</p>
                    </div>
                  </div>

                  {/* Career Direction */}
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Career Path</p>
                    <div className="flex items-start gap-2">
                      <ArrowRight size={14} className="text-emerald-400 mt-1 shrink-0" />
                      <p className="text-sm font-medium text-white leading-snug">{snapshot.direction}</p>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })()}

      {/* Recruiter Perspective */}
      {(() => {
        const perspective = generateRecruiterPerspective();
        if (!perspective) return null;
        
        return (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
            <Card className="bg-gradient-to-br from-emerald-500/6 to-emerald-600/3 border-emerald-500/15">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Briefcase size={16} className="text-emerald-400" />
                  </div>
                  <CardTitle className="text-lg">Recruiter Perspective</CardTitle>
                  <Badge variant="green" className="ml-auto text-xs">Hiring Assessment</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* First Row: Quick Assessment */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* First Impression */}
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider flex items-center gap-1">
                      <Clock size={10} />
                      30s Impression
                    </p>
                    <p className="text-sm text-white/80 leading-relaxed">{perspective.firstImpression}</p>
                  </div>

                  {/* Interview Recommendation */}
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Interview Decision</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        perspective.recommendation === 'Proceed' ? 'bg-emerald-400' :
                        perspective.recommendation === 'Consider' ? 'bg-yellow-400' : 'bg-red-400'
                      }`} />
                      <span className={`text-base font-bold ${
                        perspective.recommendation === 'Proceed' ? 'text-emerald-400' :
                        perspective.recommendation === 'Consider' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {perspective.recommendation}
                      </span>
                    </div>
                    <p className="text-xs text-white/50">
                      {perspective.interviewLikelihood} likelihood
                    </p>
                  </div>

                  {/* Candidate Level */}
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider">Suggested Level</p>
                    <div className="flex items-center gap-2">
                      <Award size={14} className="text-brand-purple-light" />
                      <span className="text-sm font-semibold text-white">{perspective.candidateLevel}</span>
                    </div>
                    <p className="text-xs text-white/50">Best role fit</p>
                  </div>

                </div>

                {/* Second Row: Strengths & Risks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Hiring Strengths */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      Top 3 Hiring Strengths
                    </p>
                    <ul className="space-y-2">
                      {perspective.hiringStrengths.map((strength, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/75">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Hiring Risks */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-red-400 flex items-center gap-2">
                      <AlertTriangle size={14} />
                      Top 3 Hiring Risks
                    </p>
                    <ul className="space-y-2">
                      {perspective.hiringRisks.map((risk, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/75">
                          <span className="w-5 h-5 rounded-full bg-red-500/15 flex items-center justify-center text-xs font-bold text-red-400 shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* Third Row: Role & Interview Focus */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Best Suitable Role */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-brand-cyan-light flex items-center gap-2">
                      <Target size={14} />
                      Best Suitable Role
                    </p>
                    <div className="bg-brand-cyan/8 border border-brand-cyan/15 rounded-lg p-3">
                      <p className="text-sm font-medium text-white">{perspective.targetRole}</p>
                    </div>
                  </div>

                  {/* Interview Focus Areas */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-brand-purple-light flex items-center gap-2">
                      <MessageSquare size={14} />
                      Interview Focus Areas
                    </p>
                    <div className="space-y-2">
                      {perspective.focusAreas.map((area, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-purple-light mt-2 shrink-0" />
                          <p className="text-sm text-white/75 leading-relaxed">{area}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Overall Recruiter Verdict */}
                <div className="bg-white/4 border border-white/8 rounded-xl p-4">
                  <p className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Star size={14} className="text-yellow-400" />
                    Overall Recruiter Verdict
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed italic">
                    "{perspective.verdict}"
                  </p>
                </div>

              </CardContent>
            </Card>
          </motion.div>
        );
      })()}

      {/* Tab Navigation */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <Card className="p-2">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-brand-purple/20 border border-brand-purple/30 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white/70"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Overview Tab Content */}
      {activeTab === "overview" && (
        <>
          {/* Section 1: ATS Score */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
            <Card variant="glow">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <ScoreRing score={atsScore} size={130} label="ATS" />
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-2">
                    {atsScore >= 80 ? "🎉 Excellent Match!" : atsScore >= 60 ? "👍 Good Match" : "⚠️ Needs Improvement"}
                  </h2>
                  <p className="text-sm text-white/50 mb-4">{atsSummary}</p>
                  {result && (
                    <div className="flex gap-4 flex-wrap">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-400">{(result.skills_matching ?? []).length}</div>
                        <div className="text-xs text-white/40">Skills Matched</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{(result.skills_missing ?? []).length}</div>
                        <div className="text-xs text-white/40">Skills Missing</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-brand-purple-light">{(result.jd_keywords_found ?? []).length}</div>
                        <div className="text-xs text-white/40">Keywords Found</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* ATS Score Breakdown */}
          {atsBreakdown && (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
              <Card>
                <CardHeader><CardTitle>📊 Score Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(atsBreakdown ?? {}).map(([key, value]) => (
                      <ProgressBar
                        key={key}
                        value={Number(value)}
                        label={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Section 2 & 3: Matching and Missing Skills */}
          {result && (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Matching Skills */}
                <Card>
                  <CardHeader><CardTitle>✅ Matching Skills</CardTitle><Badge variant="green">{(result.skills_matching ?? []).length}</Badge></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(result.skills_matching ?? []).map((s, i) => (
                        <Badge key={i} variant="green" dot>{s}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Missing Skills */}
                <Card>
                  <CardHeader><CardTitle>❌ Missing Skills</CardTitle><Badge variant="red">{(result.skills_missing ?? []).length}</Badge></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(result.skills_missing ?? []).map((s, i) => (
                        <Badge key={i} variant="red" dot>{s}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

        </>
      )}

      {/* Career Roadmap Tab Content */}
      {activeTab === "roadmap" && roadmap && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <Card>
            <CardHeader>
              <CardTitle>🗺 Career Roadmap</CardTitle>
              <Badge variant="cyan">{roadmap.target_role}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overview */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <p className="text-xs text-white/40 uppercase tracking-wider">Current Level</p>
                  <p className="text-sm font-semibold text-white">{roadmap.current_level}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white/40 uppercase tracking-wider">Timeline</p>
                  <p className="text-sm font-semibold text-white">{roadmap.estimated_timeline}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white/40 uppercase tracking-wider">Readiness</p>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={roadmap.readiness_score} showValue height={6} className="flex-1" />
                  </div>
                </div>
              </div>

              {/* Current Skills Assessment */}
              {roadmap.current_skills_assessment && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Skills Assessment</p>
                  <p className="text-sm text-white/70">{roadmap.current_skills_assessment}</p>
                </div>
              )}

              {/* Phases with expandable resources */}
              {(roadmap?.phases ?? []).map((phase: any, idx: number) => (
                <div key={idx} className="border border-white/10 rounded-xl bg-white/3 overflow-hidden">
                  <button
                    onClick={() => togglePhase(idx)}
                    className="w-full text-left p-4 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center text-sm font-bold text-brand-purple-light shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-white">{phase.title}</h4>
                        <Badge variant="gray" className="ml-auto">{phase.duration}</Badge>
                      </div>
                      <p className="text-xs text-white/40 mt-0.5">{phase.focus}</p>
                    </div>
                    <div className="text-white/30 shrink-0">
                      {expandedPhases.has(idx) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedPhases.has(idx) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
                          {/* Goals */}
                          {phase.goals?.length > 0 && (
                            <div>
                              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">🎯 Goals</p>
                              <ul className="space-y-1">
                                {(phase.goals ?? []).map((goal: string, gIdx: number) => (
                                  <li key={gIdx} className="text-sm text-white/70 flex items-start gap-2">
                                    <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                                    {goal}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Skills to Learn */}
                          {phase.skills_to_learn?.length > 0 && (
                            <div>
                              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">🧠 Skills to Learn</p>
                              <div className="flex flex-wrap gap-2">
                                {(phase.skills_to_learn ?? []).map((skill: string, sIdx: number) => (
                                  <Badge key={sIdx} variant="cyan">{skill}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Projects */}
                          {phase.projects?.length > 0 && (
                            <div>
                              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">🛠️ Projects to Build</p>
                              <div className="space-y-2">
                                {(phase.projects ?? []).map((proj: any, pIdx: number) => (
                                  <div key={pIdx} className="bg-white/5 rounded-lg p-3">
                                    <p className="text-sm font-medium text-white">{proj.name}</p>
                                    <p className="text-xs text-white/50 mt-1">{proj.description}</p>
                                    {proj.tech_stack?.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {(proj.tech_stack ?? []).map((tech: string, tIdx: number) => (
                                          <Badge key={tIdx} variant="gray" className="text-xs">{tech}</Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Milestones */}
                          {phase.milestones?.length > 0 && (
                            <div>
                              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">🏁 Milestones</p>
                              <ul className="space-y-1">
                                {(phase.milestones ?? []).map((m: string, mIdx: number) => (
                                  <li key={mIdx} className="text-xs text-white/50 flex items-start gap-1">
                                    <Star size={10} className="text-yellow-400 mt-0.5 shrink-0" />
                                    {m}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Resources */}
                          {phase.resources && (
                            <div className="space-y-3">
                              <p className="text-xs text-white/30 uppercase tracking-wider">📚 Learning Resources</p>

                              {/* YouTube */}
                              {phase.resources.youtube?.length > 0 && (
                                <div>
                                  <p className="text-xs text-red-400/70 mb-1">â–¶ YouTube</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                    {(phase.resources?.youtube ?? []).map((vid: any, vIdx: number) => (
                                      <a key={vIdx} href={vid.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                                        <ExternalLink size={10} className="shrink-0 text-red-400/50" />
                                        <span className="truncate">{vid.title}</span>
                                        <Badge variant="gray" className="text-xs shrink-0">{vid.language}</Badge>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Courses */}
                              {phase.resources.courses?.length > 0 && (
                                <div>
                                  <p className="text-xs text-brand-purple-light/70 mb-1">🎓 Courses</p>
                                  <div className="space-y-1">
                                    {(phase.resources?.courses ?? []).map((course: any, cIdx: number) => (
                                      <a key={cIdx} href={course.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                                        <ExternalLink size={10} className="shrink-0 text-brand-purple-light/50" />
                                        <span className="flex-1 truncate">{course.title}</span>
                                        <Badge variant={course.free ? "green" : "gray"} className="text-xs shrink-0">
                                          {course.free ? "Free" : course.platform}
                                        </Badge>
                                        {course.duration && <span className="text-white/30 shrink-0">{course.duration}</span>}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Docs + GitHub */}
                              {phase.resources.documentation?.length > 0 && (
                                <div>
                                  <p className="text-xs text-emerald-400/70 mb-1">📄 Docs & GitHub</p>
                                  <div className="flex flex-wrap gap-2">
                                    {(phase.resources?.documentation ?? []).map((doc: any, dIdx: number) => (
                                      <a key={dIdx} href={doc.url} target="_blank" rel="noopener noreferrer"
                                        className="text-xs text-emerald-400/70 hover:text-emerald-400 flex items-center gap-1 transition-colors">
                                        <ExternalLink size={10} />
                                        {doc.title}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Coding Practice */}
                              {phase.resources.coding_practice?.length > 0 && (
                                <div>
                                  <p className="text-xs text-yellow-400/70 mb-1">💻 Coding Practice</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                    {(phase.resources?.coding_practice ?? []).map((cp: any, cpIdx: number) => (
                                      <a key={cpIdx} href={cp.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-start gap-2 text-xs text-white/50 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                                        <ExternalLink size={10} className="shrink-0 text-yellow-400/50 mt-0.5" />
                                        <span>
                                          <span className="text-yellow-400/70 font-medium">{cp.platform}</span>
                                          {cp.focus && <span className="block text-white/30">{cp.focus}</span>}
                                        </span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {/* Skills to Acquire Summary */}
              {roadmap.skills_to_acquire?.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Key Skills to Acquire</p>
                  <div className="flex flex-wrap gap-2">
                    {roadmap.skills_to_acquire.map((skill: string, i: number) => (
                      <Badge key={i} variant="cyan">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {roadmap.recommended_certifications?.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">🏆 Recommended Certifications</p>
                  <ul className="space-y-1">
                    {roadmap.recommended_certifications.map((cert: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                        <Award size={13} className="text-yellow-400 mt-0.5 shrink-0" />
                        {cert}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interview Prep Milestones */}
              {roadmap.interview_prep_milestones?.length > 0 && (
                <div className="bg-brand-purple/10 border border-brand-purple/20 rounded-xl p-4">
                  <p className="text-sm font-semibold text-white mb-2">🎯 Interview Prep Milestones</p>
                  <ul className="space-y-1">
                    {roadmap.interview_prep_milestones.map((m: string, i: number) => (
                      <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                        <CheckCircle2 size={12} className="text-brand-purple-light mt-0.5 shrink-0" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Job Application Milestones */}
              {roadmap.job_application_milestones?.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">📅 Job Application Milestones</p>
                  <div className="space-y-2">
                    {roadmap.job_application_milestones.map((m: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 bg-white/3 border border-white/10 rounded-lg p-3">
                        <Badge variant="gray" className="shrink-0 text-xs">{m.timing}</Badge>
                        <div>
                          <p className="text-sm font-medium text-white">{m.milestone}</p>
                          {m.description && <p className="text-xs text-white/50 mt-0.5">{m.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Job Platforms - Part of Roadmap Tab */}
      {activeTab === "roadmap" && roadmap?.job_platforms?.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <Card>
            <CardHeader>
              <CardTitle>🌐 Job Platforms</CardTitle>
              <Badge variant="gray">{roadmap.job_platforms.length} Platforms</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categorizeJobPlatforms(roadmap.job_platforms).map((group) => (
                  <motion.div
                    key={group.key}
                    whileHover={{ y: -4 }}
                    className="rounded-2xl border border-white/8 bg-white/3 p-5 shadow-lg shadow-black/20 transition-all duration-300 hover:border-brand-purple/30 hover:shadow-brand-purple/10 hover:bg-white/4"
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="text-2xl shrink-0 leading-none">{group.icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white leading-snug">{group.label}</p>
                          <p className="text-[11px] text-white/40 mt-0.5">{group.subtitle}</p>
                        </div>
                      </div>
                      <Badge variant="purple" className="text-[10px] shrink-0">
                        {group.platforms.length} {group.platforms.length === 1 ? "Platform" : "Platforms"}
                      </Badge>
                    </div>

                    {/* Platform rows */}
                    <div className="space-y-1 pt-3 border-t border-white/8">
                      {group.platforms.map((platform: any, i: number) => (
                        <a
                          key={i}
                          href={platform.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-white/5 transition-all duration-200"
                        >
                          <motion.div whileHover={{ x: 3 }} className="flex items-center justify-between gap-2 w-full min-w-0">
                            <p className="text-xs font-medium text-white/85 truncate">{platform.name}</p>
                            <ExternalLink size={12} className="text-white/25 group-hover:text-brand-purple-light transition-colors shrink-0" />
                          </motion.div>
                        </a>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Portfolio & Resume Tips - Part of Roadmap Tab */}
      {activeTab === "roadmap" && (roadmap?.portfolio_recommendations?.length > 0 || roadmap?.resume_improvement_tips?.length > 0) && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {roadmap?.portfolio_recommendations?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>💼 Portfolio Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {roadmap.portfolio_recommendations.map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                        <Star size={13} className="text-yellow-400 mt-0.5 shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {roadmap?.resume_improvement_tips?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>📝 Resume Improvement Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {roadmap.resume_improvement_tips.map((tip: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                        <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      )}

      {/* Skill Gap Tab Content */}
      {activeTab === "skillgap" && (skillGapDetails.length > 0 || skillGap) && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <Card>
            <CardHeader>
              <CardTitle>📚 Skill Gap Analysis</CardTitle>
              <Badge variant="red">{skillGapDetails.length || skillGap?.missing_skills?.length || 0} Gaps Identified</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Detailed skill gap cards if available */}
              {skillGapDetails.length > 0 ? (
                <div className="space-y-4">
                  {(skillGapDetails ?? []).map((gap: any, i: number) => {
                    const importanceColor = gap.importance === "Critical" ? "red" : gap.importance === "High" ? "yellow" : gap.importance === "Medium" ? "cyan" : "gray";
                    return (
                      <div key={i} className="border border-white/10 rounded-xl p-4 bg-white/3 space-y-3">
                        {/* Skill header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-white">{gap.skill}</h4>
                            <Badge variant={importanceColor as any}>{gap.importance}</Badge>
                            <Badge variant="gray" className="text-xs">Priority {gap.priority}/10</Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-white/40 shrink-0">
                            <Clock size={12} />
                            <span>{gap.estimated_time}</span>
                          </div>
                        </div>
                        {/* Why required */}
                        {gap.why_required && (
                          <p className="text-sm text-white/60 leading-relaxed">{gap.why_required}</p>
                        )}
                        {/* Resources + Mini Projects + Platforms */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                          {/* YouTube Videos */}
                          {gap.resources?.youtube?.length > 0 && (
                            <div>
                              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">â–¶ YouTube</p>
                              <ul className="space-y-2">
                                {(gap.resources?.youtube ?? []).slice(0, 4).map((vid: any, vIdx: number) => (
                                  <li key={vIdx} className="text-xs">
                                    <a 
                                      href={getVideoUrl(vid)} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="block group"
                                    >
                                      <div className="flex gap-2 items-start">
                                        {vid.thumbnail && (
                                          <img 
                                            src={vid.thumbnail} 
                                            alt={vid.title}
                                            className="w-20 h-12 object-cover rounded flex-shrink-0"
                                          />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-red-400/70 group-hover:text-red-400 transition-colors line-clamp-2 leading-tight">
                                            {vid.title}
                                          </p>
                                          <div className="flex items-center gap-2 mt-1 text-white/30">
                                            <span>{vid.channelName}</span>
                                            <span>•</span>
                                            <span>{formatViews(vid.viewCount)} views</span>
                                            <span>•</span>
                                            <span>{vid.duration}</span>
                                          </div>
                                          <span className="text-white/20 text-[10px]">{vid.language}</span>
                                        </div>
                                      </div>
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {/* Documentation */}
                          {gap.resources?.documentation?.length > 0 && (
                            <div>
                              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">📝 Docs</p>
                              <ul className="space-y-1">
                                {(gap.resources?.documentation ?? []).map((doc: any, dIdx: number) => (
                                  <li key={dIdx} className="text-xs">
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400/70 hover:text-emerald-400 flex items-center gap-1 transition-colors">
                                      <ExternalLink size={10} className="shrink-0" />
                                      <span className="truncate">{doc.title}</span>
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {/* Courses */}
                          {gap.resources?.courses?.length > 0 && (
                            <div>
                              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">🎓 Courses</p>
                              <ul className="space-y-1">
                                {(gap.resources?.courses ?? []).map((course: any, cIdx: number) => (
                                  <li key={cIdx} className="text-xs">
                                    <a href={course.url} target="_blank" rel="noopener noreferrer" className="text-brand-purple-light/70 hover:text-brand-purple-light flex items-center gap-1 transition-colors">
                                      <ExternalLink size={10} className="shrink-0" />
                                      <span className="truncate">{course.title}</span>
                                    </a>
                                    <span className={`text-white/30 ml-2 ${course.free ? 'text-emerald-400/70' : ''}`}>{course.free ? 'Free' : course.platform}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {/* Practice Platforms */}
                          {gap.resources?.practice_platforms?.length > 0 && (
                            <div>
                              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">💻 Practice</p>
                              <ul className="space-y-1">
                                {(gap.resources?.practice_platforms ?? []).map((plat: any, pIdx: number) => (
                                  <li key={pIdx} className="text-xs">
                                    <a href={plat.url} target="_blank" rel="noopener noreferrer" className="text-yellow-400/70 hover:text-yellow-400 flex items-center gap-1 transition-colors">
                                      <ExternalLink size={10} className="shrink-0" />
                                      <span className="truncate">{plat.platform}</span>
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        {/* Mini Projects */}
                        {gap.mini_projects?.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-white/30 uppercase tracking-wider mb-2">🛠️ Mini Projects</p>
                            <ul className="space-y-1">
                              {(gap.mini_projects ?? []).map((proj: string, pIdx: number) => (
                                <li key={pIdx} className="text-xs text-white/50 flex items-start gap-1">
                                  <Code size={10} className="text-emerald-400 mt-0.5 shrink-0" />
                                  {proj}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Fallback: basic skill gap display */
                <div className="space-y-4">
                  {skillGap?.missing_skills?.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Missing Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {skillGap.missing_skills.map((skill: string, i: number) => (
                          <Badge key={i} variant="red">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {skillGap?.improvement_plan?.length > 0 && (
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Recommended Actions</p>
                      <ul className="space-y-2">
                        {skillGap.improvement_plan.map((action: string, i: number) => (
                          <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                            <BookOpen size={14} className="text-brand-purple-light mt-0.5 shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Interview Prep Tab Content */}
      {activeTab === "interview" && interviewPrep && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <Card>
            <CardHeader>
              <CardTitle>🎤 Interview Preparation</CardTitle>
              <Badge variant="purple">{interviewPrep.questions?.length || 0} Questions</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {(interviewPrep?.questions ?? []).map((q: any, idx: number) => (
                <div key={idx} className="border border-white/10 rounded-xl p-4 bg-white/3">
                  <button 
                    onClick={() => toggleQuestion(idx)}
                    className="w-full text-left flex items-start gap-3 mb-2"
                  >
                    <span className="w-6 h-6 rounded-full bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center text-xs text-brand-purple-light shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-white mb-2">{q.question}</p>
                      <div className="flex gap-2 mb-2">
                        <Badge variant="gray" className="text-xs">{q.type}</Badge>
                        <Badge variant={q.difficulty === "Hard" ? "red" : q.difficulty === "Medium" ? "yellow" : "green"} className="text-xs">{q.difficulty}</Badge>
                      </div>
                      <p className="text-xs text-white/40"><span className="text-white/60">Intent:</span> {q.intent}</p>
                    </div>
                    <div className="text-white/30 shrink-0">
                      {expandedQuestions.has(idx) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedQuestions.has(idx) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden pl-9"
                      >
                        <div className="bg-white/5 rounded-lg p-3 mt-2">
                          <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Sample Answer</p>
                          <p className="text-sm text-white/70">{q.sample_answer}</p>
                        </div>
                        {q.common_mistakes?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Common Mistakes</p>
                            <ul className="space-y-1">
                              {(Array.isArray(q.common_mistakes)
                                ? q.common_mistakes
                                : String(q.common_mistakes).split(",").map((s: string) => s.trim())
                              ).map((mistake: string, mIdx: number) => (
                                <li key={mIdx} className="text-xs text-red-400/70">• {mistake}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {q.follow_ups?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-white/30 uppercase tracking-wider mb-1">Follow-ups</p>
                            <ul className="space-y-1">
                              {q.follow_ups.map((fu: string, fIdx: number) => (
                                <li key={fIdx} className="text-xs text-white/50 flex items-start gap-1">
                                  <MessageSquare size={10} className="mt-0.5" />
                                  {fu}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {interviewPrep.interview_tips?.length > 0 && (
                <div className="bg-brand-purple/10 border border-brand-purple/20 rounded-xl p-4">
                  <p className="text-sm font-semibold text-white mb-2">💡 Interview Tips</p>
                  <ul className="space-y-1">
                    {interviewPrep.interview_tips.map((tip: string, i: number) => (
                      <li key={i} className="text-xs text-white/70">• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {interviewPrep.red_flags_to_avoid?.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <p className="text-sm font-semibold text-white mb-2">⚠️ Red Flags to Avoid</p>
                  <ul className="space-y-1">
                    {interviewPrep.red_flags_to_avoid.map((flag: string, i: number) => (
                      <li key={i} className="text-xs text-white/70">• {flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {interviewPrep.questions_to_ask_interviewer?.length > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-sm font-semibold text-white mb-2">â“ Questions to Ask Interviewer</p>
                  <ul className="space-y-1">
                    {interviewPrep.questions_to_ask_interviewer.map((question: string, i: number) => (
                      <li key={i} className="text-xs text-white/70">• {question}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Section 7: Final Recommendation */}
      {result && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}>
          <Card className="bg-gradient-to-br from-brand-purple/10 to-brand-indigo/5 border-brand-purple/20">
            <CardHeader>
              <CardTitle>🎯 Final Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/70 mb-4">{result.fit_analysis}</p>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white">Next Steps:</h4>
                <ul className="space-y-2">
                  {(result.improvement_plan ?? []).slice(0, 3).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                      <CheckCircle2 size={14} className="text-brand-purple-light mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={() => router.push("/dashboard/upload")} variant="secondary">
                  <ArrowRight size={16} />
                  Analyze Another Resume
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => {
                    try {
                      // Get the stored analysis data
                      const storedData = sessionStorage.getItem('resumeAnalysisData');
                      if (!storedData) {
                        alert('No analysis data available. Please analyze a resume first.');
                        return;
                      }
                      
                      const { resumeText: resText, jobDescription: jobDescText, analysis, timestamp } = JSON.parse(storedData);
                      
                      // Generate and download PDF
                      generateResumeAnalysisReport({
                        resumeText: resText,
                        jobDescription: jobDescText,
                        analysis: analysis,
                        timestamp: timestamp,
                        atsScore: atsScore,
                        atsSummary: atsSummary,
                        atsBreakdown: atsBreakdown,
                        result: result,
                        roadmap: roadmap,
                        interviewPrep: interviewPrep,
                        skillGap: skillGap,
                        skillGapDetails: skillGapDetails,
                        filename: analysis?.filename || 'resume'
                      });
                    } catch (error) {
                      console.error('[JobMatch] PDF generation error:', error);
                      alert('Failed to generate PDF report. Please try again.');
                    }
                  }}
                >
                  Download Full Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
