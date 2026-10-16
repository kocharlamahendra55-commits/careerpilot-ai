import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { dbRun, generateId } from "@/lib/db";
import { fetchYouTubeVideos } from "@/lib/youtube";
import { generateAIResponse, parseAIJson, getAIErrorPayload } from "@/lib/ai";

const JOB_MATCH_SYSTEM_PROMPT =
  "You are an expert ATS and job matching analyzer. Return ONLY valid JSON with no markdown or explanation.";

function buildJobMatchUserPrompt(resumeText: string, jobDescription: string): string {
  return `You are a senior technical recruiter performing precise job-candidate matching analysis.

CANDIDATE PROFILE:
"""
${resumeText.slice(0, 4000)}
"""

TARGET POSITION:
"""
${jobDescription.slice(0, 3000)}
"""

ANALYSIS REQUIREMENTS:
1. Match Score: Calculate based on skills overlap, experience level, and role requirements
2. Gap Analysis: Identify SPECIFIC skills missing for THIS role (not generic skills)
3. Personalized Resources: Recommend learning paths based on candidate's current skill level
4. Interview Assessment: Predict likelihood based on qualifications vs requirements
5. Salary Estimate: Use candidate's experience level + role requirements

RESOURCE GUIDELINES:
- YouTube topics: Provide exact skill/topic names for API lookup
- Documentation: Use official docs (React, AWS, Google Cloud, Microsoft, etc.)
- Courses: Specify real Coursera/Udemy/edX course titles where possible
- Practice: Target specific problem areas (algorithms, system design, etc.)
- Projects: Suggest practical applications of missing skills

Return ONLY valid JSON:
{
  "match_score": <integer 0-100>,
  "fit_analysis": "CANDIDATE FIT: [Specific strengths for role]. HIRING RECOMMENDATION: [Strong/Moderate/Weak] based on [key factors].",
  "skills_matching": ["[Specific relevant skill]", "[Technical competency]", "[Domain expertise]"],
  "skills_missing": ["[Critical missing skill]", "[Important gap]", "[Nice-to-have skill]"],
  "jd_keywords_found": ["[Matched keyword]", "[Technical term]", "[Industry term]"],
  "jd_keywords_missing": ["[Missing keyword]", "[ATS term needed]", "[Role-specific term]"],
  "improvement_plan": ["IMMEDIATE: [Specific action for this candidate]", "SHORT-TERM: [Skill development priority]", "STRATEGIC: [Career positioning move]"],
  "strengths_for_role": ["TECHNICAL: [Relevant technical strength]", "EXPERIENCE: [Applicable background]", "SOFT SKILL: [Leadership/communication strength]"],
  "interview_likelihood": "High|Medium|Low",
  "salary_estimate": "[Range] based on [experience level] and [location/market factors]",
  "skill_gaps": [
    {
      "skill": "[Specific skill name - Priority Level]",
      "importance": "Critical|High|Medium|Low",
      "why_required": "BUSINESS IMPACT: [Why this skill directly affects job performance]",
      "priority": <1-10 based on role criticality>,
      "estimated_time": "[Realistic timeframe for competency]",
      "resources": {
        "youtube_topics": ["[Foundational topic]", "[Advanced concept]", "[Practical application]"],
        "documentation": [
          {"title": "[Official Documentation]", "url": "https://docs.official-site.com"},
          {"title": "[Authoritative Guide]", "url": "https://github.com/official/repo"}
        ],
        "courses": [
          {"title": "[Comprehensive Course Name]", "platform": "Coursera", "url": "https://coursera.org/learn/course", "free": false, "duration": "[Duration]"},
          {"title": "[Practical Bootcamp]", "platform": "freeCodeCamp", "url": "https://freecodecamp.org/learn/path", "free": true, "duration": "[Duration]"}
        ],
        "practice_platforms": [
          {"platform": "LeetCode", "url": "https://leetcode.com/problemset/topic", "focus": "PRACTICE: [What to focus on]"},
          {"platform": "HackerRank", "url": "https://hackerrank.com/domain", "focus": "BUILD: [Skill area to develop]"}
        ]
      },
      "mini_projects": ["PROJECT: [Hands-on portfolio piece]", "BUILD: [Practical application]"]
    }
  ]
}`;
}

async function enrichJobMatchWithYouTube(match: any, youtubeApiKey?: string): Promise<any> {
  if (!youtubeApiKey) {
    return match;
  }

  const enrichedMatch = { ...match };

  if (match.skill_gaps && Array.isArray(match.skill_gaps)) {
    enrichedMatch.skill_gaps = await Promise.all(
      match.skill_gaps.map(async (gap: any) => {
        const enrichedGap = { ...gap };

        if (gap.resources?.youtube_topics && Array.isArray(gap.resources.youtube_topics)) {
          const topics = gap.resources.youtube_topics;
          const languages: ('English' | 'Hindi' | 'Telugu' | 'Tamil')[] = ['English', 'Hindi', 'Telugu', 'Tamil'];

          // Fetch videos for each topic in each language
          const youtubeVideos = await Promise.all(
            topics.map(async (topic: string) => {
              const videosByLanguage = await Promise.all(
                languages.map(async (language) => {
                  const videos = await fetchYouTubeVideos(topic, language, youtubeApiKey);
                  return { language, videos };
                })
              );

              // Flatten and organize by language
              const allVideos: any[] = [];
              videosByLanguage.forEach(({ language, videos }) => {
                videos.forEach((video) => {
                  allVideos.push({ ...video, language });
                });
              });

              return allVideos;
            })
          );

          // Flatten all videos and sort by views
          const flattenedVideos = youtubeVideos.flat().sort((a, b) => b.viewCount - a.viewCount);

          enrichedGap.resources.youtube = flattenedVideos;
          delete enrichedGap.resources.youtube_topics;
        }

        return enrichedGap;
      })
    );
  }

  return enrichedMatch;
}

export async function POST(req: NextRequest) {
  try {
    const session = getUserFromRequest(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { resume_text, job_description, resume_id } = body;

    if (!resume_text || !job_description) {
      return NextResponse.json({ error: "resume_text and job_description are required" }, { status: 400 });
    }

    let match: Record<string, unknown>;
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;

    try {
      const raw = await generateAIResponse(
        JOB_MATCH_SYSTEM_PROMPT,
        buildJobMatchUserPrompt(resume_text, job_description),
        { temperature: 0.3, maxTokens: 3000, timeoutMs: 100_000 }
      );
      match = parseAIJson<Record<string, unknown>>(raw);
    } catch (aiError) {
      const { status, body } = getAIErrorPayload(aiError);
      return NextResponse.json(body, { status });
    }

    // ── Normalize schema: fill missing fields so UI never crashes ───────────
    const m = match as any;
    m.match_score = typeof m.match_score === "number" ? m.match_score : 0;
    m.fit_analysis = m.fit_analysis ?? "";
    m.skills_matching = Array.isArray(m.skills_matching) ? m.skills_matching : [];
    m.skills_missing = Array.isArray(m.skills_missing) ? m.skills_missing : [];
    m.jd_keywords_found = Array.isArray(m.jd_keywords_found) ? m.jd_keywords_found : [];
    m.jd_keywords_missing = Array.isArray(m.jd_keywords_missing) ? m.jd_keywords_missing : [];
    m.improvement_plan = Array.isArray(m.improvement_plan) ? m.improvement_plan : [];
    m.strengths_for_role = Array.isArray(m.strengths_for_role) ? m.strengths_for_role : [];
    m.interview_likelihood = m.interview_likelihood ?? "Medium";
    m.salary_estimate = m.salary_estimate ?? "";
    m.skill_gaps = Array.isArray(m.skill_gaps) ? m.skill_gaps.map((gap: any) => ({
      skill: gap.skill ?? "",
      importance: gap.importance ?? "Medium",
      why_required: gap.why_required ?? "",
      priority: typeof gap.priority === "number" ? gap.priority : 5,
      estimated_time: gap.estimated_time ?? "",
      resources: {
        youtube_topics: Array.isArray(gap.resources?.youtube_topics) ? gap.resources.youtube_topics : [],
        youtube: Array.isArray(gap.resources?.youtube) ? gap.resources.youtube : [],
        documentation: Array.isArray(gap.resources?.documentation) ? gap.resources.documentation : [],
        courses: Array.isArray(gap.resources?.courses) ? gap.resources.courses : [],
        practice_platforms: Array.isArray(gap.resources?.practice_platforms) ? gap.resources.practice_platforms : [],
      },
      mini_projects: Array.isArray(gap.mini_projects) ? gap.mini_projects : [],
    })) : [];
    match = m;

    // Enrich match with YouTube videos
    match = await enrichJobMatchWithYouTube(match, youtubeApiKey);

    // Log the activity
    try {
      dbRun("INSERT INTO activity_log (id, user_id, action, details) VALUES (?, ?, ?, ?)", [
        generateId(), session.userId, "JOB_MATCH", `Score: ${match.match_score}%`
      ]);
    } catch { /* ignore */ }

    return NextResponse.json({ match, _source: "openrouter" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown";
    return NextResponse.json({ error: "Job match failed", detail: msg }, { status: 500 });
  }
}
