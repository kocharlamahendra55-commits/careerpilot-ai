import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { dbRun, generateId } from "@/lib/db";
import { fetchYouTubeVideos } from "@/lib/youtube";
import { generateAIResponse, parseAIJson, getAIErrorPayload } from "@/lib/ai";

const ROADMAP_SYSTEM_PROMPT =
  "You are a senior career mentor and technical coach. Return ONLY valid JSON with no markdown, code blocks, or extra text. The response must be parseable by JSON.parse().";

// ─── URL helpers ──────────────────────────────────────────────────────────────

/**
 * Returns true only for real, absolute HTTP/HTTPS URLs that are NOT
 * AI-generated placeholder stubs (e.g. "SPECIFIC_COURSE", "<topic>").
 */
function isValidUrl(url: unknown): boolean {
  if (typeof url !== "string" || !url.trim()) return false;
  // Must start with http/https
  if (!/^https?:\/\//i.test(url)) return false;
  // Reject obvious AI placeholders
  if (/SPECIFIC_|<[^>]+>|\[.*?\]|YOUR_/.test(url)) return false;
  // Reject bare-domain stubs like "https://example.com/SPECIFIC"
  try {
    const u = new URL(url);
    // Path segments shouldn't be all-caps placeholder words
    if (/^\/[A-Z_]{5,}$/.test(u.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Strip invalid-URL items from every resource array in a phase. */
function sanitizePhase(phase: any): any {
  if (!phase?.resources) return phase;
  const r = phase.resources;

  if (Array.isArray(r.courses)) {
    r.courses = r.courses.filter((c: any) => isValidUrl(c?.url));
  }
  if (Array.isArray(r.documentation)) {
    r.documentation = r.documentation.filter((d: any) => isValidUrl(d?.url));
  }
  if (Array.isArray(r.coding_practice)) {
    r.coding_practice = r.coding_practice.filter((p: any) => isValidUrl(p?.url));
  }
  // Remove empty strings / placeholders from youtube_topics
  if (Array.isArray(r.youtube_topics)) {
    r.youtube_topics = r.youtube_topics.filter(
      (t: any) => typeof t === "string" && t.trim().length > 0 && !/<|>/.test(t)
    );
  }
  return phase;
}

/** Deduplicate YouTube videos within a phase by videoId. */
function dedupeVideos(videos: any[]): any[] {
  const seen = new Set<string>();
  return videos.filter((v) => {
    if (!v?.videoId || seen.has(v.videoId)) return false;
    seen.add(v.videoId);
    return true;
  });
}

function buildRoadmapPrompt(resumeText: string, targetRole: string): string {
  const r = encodeURIComponent(targetRole);
  const rk = targetRole.toLowerCase().replace(/\s+/g, "-");

  return `You are a senior career mentor and technical coach. Create an executive-level career advancement roadmap.

CANDIDATE PROFILE:
"""
${resumeText.slice(0, 1500)}
"""

TARGET POSITION: ${targetRole}

CRITICAL: Return ONLY valid JSON. No explanations, no markdown, no extra text.

ENTERPRISE ROADMAP REQUIREMENTS:
- Executive Summary: Clear assessment of current state and target timeline
- 4 Strategic Phases: Foundation → Skills Building → Specialization → Job Ready
- Prioritized Actions: Most critical milestones first
- Resource Strategy: Mix of free and premium learning paths
- Success Metrics: Clear milestones to measure progress
- Risk Assessment: Honest evaluation of readiness and gaps

Return ONLY valid JSON (no markdown, no extra text):
{
  "target_role": "${targetRole}",
  "current_level": "<Junior|Mid-Level|Senior>",
  "estimated_timeline": "[Realistic timeframe based on experience gap]",
  "readiness_score": <0-100>,
  "current_skills_assessment": "CURRENT STATE: [Honest assessment]. READINESS GAP: [Key limitations]. COMPETITIVE ADVANTAGE: [Unique strengths].",
  "phases": [
    {
      "phase": "PHASE 1",
      "title": "Foundation & Critical Skills",
      "duration": "[Specific timeframe]",
      "focus": "OUTCOME: [What candidate will achieve]",
      "goals": ["MASTER: [Core technical skill]", "BUILD: [Portfolio project]", "EARN: [Certification if relevant]"],
      "skills_to_learn": ["[Priority 1 skill]", "[Priority 2 skill]", "[Priority 3 skill]"],
      "projects": [{"name": "[Specific project name]", "description": "BUILD: [What it demonstrates to employers]", "tech_stack": ["[Technology 1]", "[Technology 2]"]}],
      "certifications": ["[Industry certification if relevant]"],
      "milestones": ["MILESTONE: [Measurable achievement]", "VALIDATION: [Proof of competency]"],
      "resources": {
        "youtube_topics": ["[Fundamental topic]", "[Advanced concept]", "[Best practices]"],
        "courses": [
          {"title": "[Comprehensive course name]", "platform": "[Real platform]", "url": "[Real URL]", "free": true, "duration": "[Duration]"}
        ],
        "documentation": [
          {"title": "[Official documentation]", "url": "[Real docs URL]"}
        ],
        "coding_practice": [
          {"platform": "[Platform name]", "url": "[Real practice URL]", "focus": "PRACTICE: [Specific skill area]"}
        ]
      }
    },
    {
      "phase": "PHASE 2", 
      "title": "Intermediate Skills & Portfolio",
      "duration": "[Timeframe]",
      "focus": "OUTCOME: [Professional-level competency achieved]",
      "goals": ["DEVELOP: [Advanced skill]", "COMPLETE: [Complex project]", "NETWORK: [Industry connections]"],
      "skills_to_learn": ["[Intermediate skill 1]", "[Intermediate skill 2]", "[Soft skill]"],
      "projects": [{"name": "[Portfolio project]", "description": "DEMONSTRATES: [Professional capability]", "tech_stack": ["[Technology 1]", "[Technology 2]"]}],
      "certifications": ["[Advanced certification]"],
      "milestones": ["ACHIEVEMENT: [Career milestone]", "RECOGNITION: [Industry validation]"],
      "resources": {
        "youtube_topics": ["[Advanced topic]", "[Industry practices]", "[Case studies]"],
        "courses": [{"title": "[Specialized course]", "platform": "[Platform]", "url": "[Real URL]", "free": false, "duration": "[Duration]"}],
        "documentation": [{"title": "[Advanced guide]", "url": "[Real URL]"}],
        "coding_practice": [{"platform": "[Platform]", "url": "[Real URL]", "focus": "BUILD: [Complex scenarios]"}]
      }
    },
    {
      "phase": "PHASE 3",
      "title": "Specialization & Leadership",
      "duration": "[Timeframe]",
      "focus": "OUTCOME: [Senior-level expertise and leadership]",
      "goals": ["SPECIALIZE: [Niche expertise]", "LEAD: [Team or project leadership]", "CONTRIBUTE: [Open source or community]"],
      "skills_to_learn": ["[Specialized skill]", "[Leadership skill]", "[Strategic skill]"],
      "projects": [{"name": "[Advanced project]", "description": "SHOWCASES: [Senior-level thinking]", "tech_stack": ["[Advanced tech 1]", "[Advanced tech 2]"]}],
      "certifications": ["[Expert-level certification]"],
      "milestones": ["LEADERSHIP: [Team leadership example]", "EXPERTISE: [Recognition as subject expert]"],
      "resources": {
        "youtube_topics": ["[Expert-level topic]", "[Leadership content]", "[Industry trends]"],
        "courses": [{"title": "[Expert course]", "platform": "[Platform]", "url": "[Real URL]", "free": false, "duration": "[Duration]"}],
        "documentation": [{"title": "[Expert documentation]", "url": "[Real URL]"}],
        "coding_practice": [{"platform": "[Platform]", "url": "[Real URL]", "focus": "MASTER: [Advanced patterns]"}]
      }
    },
    {
      "phase": "Phase 4",
      "title": "Job Ready & Active Applications",
      "duration": "<e.g. 3-4 weeks>",
      "focus": "<focus>",
      "goals": ["<goal>", "<goal>"],
      "skills_to_learn": ["<skill>"],
      "projects": [],
      "certifications": [],
      "milestones": ["<milestone>"],
      "resources": {
        "youtube_topics": ["<topic 1>"],
        "courses": [{"title": "<real course>", "platform": "freeCodeCamp", "url": "https://www.freecodecamp.org/learn/coding-interview-prep", "free": true, "duration": "<d>"}],
        "documentation": [{"title": "Tech Interview Handbook", "url": "https://github.com/yangshun/tech-interview-handbook"}],
        "coding_practice": [{"platform": "LeetCode", "url": "https://leetcode.com/interview/", "focus": "Mock interviews"}]
      }
    }
  ],
  "job_platforms": [{"name": "LinkedIn", "url": "https://linkedin.com/jobs", "description": "networking"}],
  "portfolio_recommendations": ["<item>"],
  "resume_improvement_tips": ["<tip>"],
  "interview_prep_milestones": ["<milestone>"],
  "recommended_certifications": ["<cert>"],
  "skills_to_acquire": ["<skill>"]
}`;
}



async function enrichRoadmapWithYouTube(roadmap: any, youtubeApiKey?: string): Promise<any> {
  const enrichedRoadmap = { ...roadmap };

  if (!Array.isArray(roadmap.phases)) return enrichedRoadmap;

  enrichedRoadmap.phases = await Promise.all(
    roadmap.phases.map(async (phase: any) => {
      const enrichedPhase = { ...phase };
      const topics: string[] = enrichedPhase.resources?.youtube_topics ?? [];

      if (!youtubeApiKey) {
        // No API key — leave youtube_topics intact so UI shows topic pills as placeholder
        return enrichedPhase;
      }

      if (topics.length === 0) return enrichedPhase;

      const languages: ('English' | 'Hindi' | 'Telugu' | 'Tamil')[] = ['English', 'Hindi', 'Telugu', 'Tamil'];

      // Fetch videos for each unique topic × language pair (no duplicate topics)
      const uniqueTopics = [...new Set(topics)];
      const videoMatrix = await Promise.all(
        uniqueTopics.map((topic) =>
          Promise.all(
            languages.map(async (language) => {
              const videos = await fetchYouTubeVideos(topic, language, youtubeApiKey);
              return videos.map((v) => ({ ...v, language }));
            })
          )
        )
      );

      // Flatten, deduplicate by videoId, sort by views
      const allVideos = dedupeVideos(
        videoMatrix.flat(2).sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
      );

      enrichedPhase.resources = { ...enrichedPhase.resources };
      enrichedPhase.resources.youtube = allVideos;
      delete enrichedPhase.resources.youtube_topics; // consumed — don't expose to client
      return enrichedPhase;
    })
  );

  return enrichedRoadmap;
}

export async function POST(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { resume_text, target_role } = body;

    if (!resume_text || !target_role) {
      return NextResponse.json({ error: "resume_text and target_role are required" }, { status: 400 });
    }

    let roadmap: Record<string, unknown>;
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;

    try {
      const raw = await generateAIResponse(
        ROADMAP_SYSTEM_PROMPT,
        buildRoadmapPrompt(resume_text, target_role),
        { temperature: 0.4, maxTokens: 5000, timeoutMs: 90_000 }
      );
      // Enhanced JSON parsing with validation
      try {
        roadmap = parseAIJson<Record<string, unknown>>(raw);
        
        // Validate structure
        if (!roadmap.phases || !Array.isArray(roadmap.phases)) {
          console.warn("[Roadmap] AI returned malformed structure, attempting to fix...");
          if (typeof roadmap === "object") {
            const keys = Object.keys(roadmap);
            const phasesKey = keys.find(k => k.toLowerCase().includes("phase"));
            if (phasesKey && Array.isArray(roadmap[phasesKey])) {
              roadmap.phases = roadmap[phasesKey];
            }
          }
        }
      } catch (parseError) {
        console.error("[Roadmap] JSON parse error:", parseError);
        console.error("[Roadmap] Raw response:", raw.substring(0, 500));
        throw parseError;
      }
    } catch (aiError) {
      const { status, body } = getAIErrorPayload(aiError);
      return NextResponse.json(body, { status });
    }

    // ── Normalize schema: fill missing fields so UI never crashes ───────────
    const rm = roadmap as any;
    rm.target_role = rm.target_role ?? target_role;
    rm.current_level = rm.current_level ?? "";
    rm.estimated_timeline = rm.estimated_timeline ?? "";
    rm.readiness_score = typeof rm.readiness_score === "number" ? rm.readiness_score : 0;
    rm.current_skills_assessment = rm.current_skills_assessment ?? "";
    rm.phases = Array.isArray(rm.phases) ? rm.phases.map((p: any) => ({
      phase: p.phase ?? "",
      title: p.title ?? "",
      duration: p.duration ?? "",
      focus: p.focus ?? "",
      goals: Array.isArray(p.goals) ? p.goals : [],
      skills_to_learn: Array.isArray(p.skills_to_learn) ? p.skills_to_learn : [],
      projects: Array.isArray(p.projects) ? p.projects : [],
      certifications: Array.isArray(p.certifications) ? p.certifications : [],
      milestones: Array.isArray(p.milestones) ? p.milestones : [],
      resources: {
        youtube_topics: Array.isArray(p.resources?.youtube_topics) ? p.resources.youtube_topics : [],
        youtube: Array.isArray(p.resources?.youtube) ? p.resources.youtube : [],
        courses: Array.isArray(p.resources?.courses) ? p.resources.courses : [],
        documentation: Array.isArray(p.resources?.documentation) ? p.resources.documentation : [],
        coding_practice: Array.isArray(p.resources?.coding_practice) ? p.resources.coding_practice : [],
      },
    })) : [];
    rm.job_application_milestones = Array.isArray(rm.job_application_milestones) ? rm.job_application_milestones : [];
    rm.portfolio_recommendations = Array.isArray(rm.portfolio_recommendations) ? rm.portfolio_recommendations : [];
    rm.resume_improvement_tips = Array.isArray(rm.resume_improvement_tips) ? rm.resume_improvement_tips : [];
    rm.interview_prep_milestones = Array.isArray(rm.interview_prep_milestones) ? rm.interview_prep_milestones : [];
    rm.recommended_certifications = Array.isArray(rm.recommended_certifications) ? rm.recommended_certifications : [];
    rm.skills_to_acquire = Array.isArray(rm.skills_to_acquire) ? rm.skills_to_acquire : [];
    roadmap = rm;

    // Enrich roadmap with YouTube videos
    roadmap = await enrichRoadmapWithYouTube(roadmap, youtubeApiKey);

    // Sanitize every phase — strip AI placeholder URLs
    if (Array.isArray((roadmap as any).phases)) {
      (roadmap as any).phases = (roadmap as any).phases.map(sanitizePhase);
    }

    // Always ensure job_platforms is present with correct URLs
    const r = encodeURIComponent(target_role);
    const rk = target_role.toLowerCase().replace(/\s+/g, "-");
    if (!roadmap.job_platforms || (roadmap.job_platforms as unknown[]).length === 0) {
      roadmap.job_platforms = [
        { name: "LinkedIn Jobs", url: `https://www.linkedin.com/jobs/search/?keywords=${r}`, description: "Best for referrals and professional networking" },
        { name: "Indeed", url: `https://www.indeed.com/jobs?q=${r}`, description: "Largest job board" },
        { name: "Naukri", url: `https://www.naukri.com/${rk}-jobs`, description: "India's leading job portal" },
        { name: "Wellfound", url: `https://wellfound.com/jobs?role=${r}`, description: "Startup opportunities" },
        { name: "Glassdoor", url: `https://www.glassdoor.co.in/Job/india-${rk}-jobs`, description: "Jobs with salary data and reviews" },
      ];
    }

    try {
      dbRun("INSERT INTO activity_log (id, user_id, action, details) VALUES (?, ?, ?, ?)", [
        generateId(), session.userId, "ROADMAP", `Target: ${target_role}`,
      ]);
    } catch { /* ignore */ }

    return NextResponse.json({
      roadmap,
      _source: "openrouter",
      _youtube_available: !!(youtubeApiKey && youtubeApiKey.length > 5),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown";
    return NextResponse.json({ error: "Roadmap generation failed", detail: msg }, { status: 500 });
  }
}
