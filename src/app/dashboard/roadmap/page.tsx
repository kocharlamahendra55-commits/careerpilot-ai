"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map, ArrowRight, CheckCircle2, BookOpen, GitBranch, Video,
  ExternalLink, Play, Eye, Clock, Calendar, ChevronDown,
  Target, Trophy, Briefcase, Star, Code2, Globe, GraduationCap,
  Layers, Zap, TrendingUp, Award, FileText, AlertCircle, Info,
  Sparkles, Database,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type {
  CareerRoadmap, RoadmapPhase, YouTubeVideo,
  RoadmapCourse, RoadmapDocumentation, RoadmapCodingPractice,
} from "@/types";
import { categorizeJobPlatforms } from "@/lib/jobPlatformCategories";

// ─── Constants ────────────────────────────────────────────────────────────────
const PHASE_COLORS = [
  { gradient: "from-brand-purple/20 to-brand-indigo/10", border: "border-brand-purple/25", dot: "bg-brand-purple-light", badge: "purple" as const, icon: "text-brand-purple-light", hoverBorder: "hover:border-brand-purple/40" },
  { gradient: "from-brand-cyan/15 to-brand-cyan/5",      border: "border-brand-cyan/25",   dot: "bg-brand-cyan-light",   badge: "cyan"   as const, icon: "text-brand-cyan-light",   hoverBorder: "hover:border-brand-cyan/40" },
  { gradient: "from-pink-500/15 to-pink-600/5",           border: "border-pink-500/25",     dot: "bg-pink-400",           badge: "pink"   as const, icon: "text-pink-400",           hoverBorder: "hover:border-pink-500/40" },
  { gradient: "from-emerald-500/15 to-emerald-600/5",     border: "border-emerald-500/25",  dot: "bg-emerald-400",        badge: "green"  as const, icon: "text-emerald-400",        hoverBorder: "hover:border-emerald-500/40" },
];

const LANG_COLORS: Record<string, string> = {
  English: "text-blue-400 bg-blue-400/10 border-blue-400/25",
  Hindi:   "text-orange-400 bg-orange-400/10 border-orange-400/25",
  Telugu:  "text-green-400 bg-green-400/10 border-green-400/25",
  Tamil:   "text-red-400 bg-red-400/10 border-red-400/25",
};
const LANG_FLAGS: Record<string, string> = { English: "🇬🇧", Hindi: "🇮🇳", Telugu: "🌴", Tamil: "🌺" };
const LANGUAGES = ["English", "Hindi", "Telugu", "Tamil"] as const;

const PLATFORM_ICONS: Record<string, string> = {
  LeetCode: "⚡", HackerRank: "🟢", GeeksforGeeks: "🔵", CodeChef: "👨‍🍳",
  Coursera: "🎓", Udemy: "🟣", freeCodeCamp: "🔥", "Microsoft Learn": "🪟",
  "AWS Skill Builder": "☁️", Google: "🔵", IBM: "🔷", "Meta/Coursera": "📘",
  "Oracle Learning": "🔴", LinkedIn: "🔗", Indeed: "🏢", Naukri: "🇮🇳",
  Wellfound: "🚀", Glassdoor: "🔍",
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45 } }),
};

// ─── Client-side URL guard (mirrors server-side isValidUrl) ──────────────────
function isUsableUrl(url: unknown): boolean {
  if (typeof url !== "string" || !url.trim()) return false;
  if (!/^https?:\/\//i.test(url)) return false;
  if (/SPECIFIC_|<[^>]+>|\[.*?\]|YOUR_/.test(url)) return false;
  try {
    const u = new URL(url);
    if (/^\/[A-Z_]{5,}$/.test(u.pathname)) return false;
    return true;
  } catch { return false; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
function formatDate(iso: string): string {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short" }); }
  catch { return ""; }
}

// ─── Broken-link fallback chip ────────────────────────────────────────────────
function BrokenLinkChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] border bg-white/2 border-white/6 text-white/25 cursor-not-allowed select-none">
      <AlertCircle size={10} className="text-white/20" />
      {label}
      <span className="text-[9px] text-white/20">unavailable</span>
    </span>
  );
}

// ─── YouTube Video Card ───────────────────────────────────────────────────────
function VideoCard({ video }: { video: YouTubeVideo }) {
  const url = `https://www.youtube.com/watch?v=${video.videoId}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block group">
      <motion.div
        whileHover={{ y: -3 }}
        className="rounded-xl overflow-hidden border border-white/8 bg-white/2 hover:border-brand-purple/30 transition-all duration-300 h-full flex flex-col"
      >
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-black/40 shrink-0">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video size={28} className="text-white/15" />
            </div>
          )}
          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all duration-300 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-red-500/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
              <Play size={14} className="text-white ml-0.5" fill="white" />
            </div>
          </div>
          {/* Duration badge */}
          {video.duration && (
            <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none">
              {video.duration}
            </span>
          )}
        </div>
        {/* Info */}
        <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-white/90 line-clamp-2 leading-snug group-hover:text-white transition-colors">
              {video.title}
            </p>
            <p className="text-[11px] text-white/45 truncate mt-0.5">{video.channelName}</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-white/30 mt-1.5 flex-wrap">
            {video.viewCount > 0 && (
              <span className="flex items-center gap-1"><Eye size={9} />{formatViews(video.viewCount)} views</span>
            )}
            {video.publishedAt && (
              <span className="flex items-center gap-1"><Calendar size={9} />{formatDate(video.publishedAt)}</span>
            )}
          </div>
        </div>
      </motion.div>
    </a>
  );
}

// ─── YouTube topics placeholder (no API key) ──────────────────────────────────
function YoutubeTopicsPills({ topics }: { topics: string[] }) {
  if (!topics?.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Video size={14} className="text-red-400/60" />
        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">YouTube Topics</span>
        <Badge variant="gray" className="text-[10px]">Search manually</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {topics.map((t, i) => (
          <a
            key={i}
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(t + " tutorial")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <motion.span
              whileHover={{ scale: 1.04 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-red-500/15 bg-red-500/5 text-white/40 hover:text-white/70 hover:border-red-500/30 transition-all"
            >
              <Play size={9} className="text-red-400/50" />
              {t}
              <ExternalLink size={8} className="opacity-30" />
            </motion.span>
          </a>
        ))}
      </div>
      <p className="text-[10px] text-white/20 mt-2 flex items-center gap-1">
        <Info size={9} />Add a YOUTUBE_API_KEY in .env.local to display real video thumbnails automatically.
      </p>
    </div>
  );
}

// ─── YouTube Section (tabbed by language, smart default) ─────────────────────
function YouTubeSection({ videos }: { videos: YouTubeVideo[] }) {
  // Group by language
  const byLang: Record<string, YouTubeVideo[]> = {};
  for (const v of videos) {
    const lang = v.language || "English";
    if (!byLang[lang]) byLang[lang] = [];
    byLang[lang].push(v);
  }
  const availableLangs = LANGUAGES.filter((l) => (byLang[l]?.length ?? 0) > 0);

  // Default to first available language (not hardcoded English)
  const [activeTab, setActiveTab] = useState<string>(() => availableLangs[0] ?? "English");

  // When video set changes (e.g. different phase), reset to first available
  useEffect(() => {
    if (availableLangs.length > 0 && !availableLangs.includes(activeTab as any)) {
      setActiveTab(availableLangs[0]);
    }
  }, [videos]); // eslint-disable-line react-hooks/exhaustive-deps

  if (availableLangs.length === 0) return null;

  const activeVideos = byLang[activeTab] ?? byLang[availableLangs[0]] ?? [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Video size={15} className="text-red-400" />
        <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">YouTube Videos</span>
        <Badge variant="red" className="text-[10px]">{videos.length} videos</Badge>
      </div>

      {/* Language tabs — scrollable on mobile */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {availableLangs.map((lang) => (
          <button
            key={lang}
            onClick={() => setActiveTab(lang)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-all duration-200 ${
              activeTab === lang
                ? LANG_COLORS[lang]
                : "bg-white/3 border-white/8 text-white/40 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            <span>{LANG_FLAGS[lang]}</span>
            {lang}
            <span className="opacity-60">({byLang[lang].length})</span>
          </button>
        ))}
      </div>

      {/* Video grid — responsive: 1 col mobile, 2 sm, 3 lg */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {activeVideos.slice(0, 6).map((v) => (
            <VideoCard key={v.videoId} video={v} />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* No videos in selected language */}
      {activeVideos.length === 0 && (
        <div className="flex items-center gap-2 py-4 text-xs text-white/30">
          <Info size={13} />No videos available for {activeTab} yet. Try another language tab.
        </div>
      )}
    </div>
  );
}

// ─── Courses Section ──────────────────────────────────────────────────────────
function CoursesSection({ courses }: { courses: RoadmapCourse[] }) {
  if (!courses?.length) return null;
  const validCourses = courses.filter((c) => c?.title);
  if (!validCourses.length) return null;

  const free = validCourses.filter((c) => c.free);
  const paid = validCourses.filter((c) => !c.free);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap size={15} className="text-brand-cyan-light" />
        <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Courses</span>
        {free.length > 0 && <Badge variant="green" className="text-[10px]">{free.length} free</Badge>}
        {paid.length > 0 && <Badge variant="yellow" className="text-[10px]">{paid.length} paid</Badge>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {validCourses.map((course, i) => {
          const usable = isUsableUrl(course.url);
          const inner = (
            <motion.div
              whileHover={usable ? { x: 2 } : {}}
              className={`flex items-start gap-3 p-3 rounded-xl bg-white/2 border transition-all duration-200 ${
                usable
                  ? "border-white/5 hover:border-brand-cyan/25 hover:bg-white/4 cursor-pointer"
                  : "border-white/4 opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 border border-brand-cyan/15 flex items-center justify-center shrink-0 text-sm">
                {PLATFORM_ICONS[course.platform] ?? "📚"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/85 line-clamp-2 leading-snug">{course.title}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-white/40">{course.platform}</span>
                  {course.duration && <span className="text-[10px] text-white/25">· {course.duration}</span>}
                  <Badge variant={course.free ? "green" : "yellow"} className="text-[9px] px-1.5 py-0">
                    {course.free ? "Free" : "Paid"}
                  </Badge>
                  {!usable && <Badge variant="gray" className="text-[9px] px-1.5 py-0">link unavailable</Badge>}
                </div>
              </div>
              {usable
                ? <ExternalLink size={11} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0 mt-0.5" />
                : <AlertCircle size={11} className="text-white/15 shrink-0 mt-0.5" />
              }
            </motion.div>
          );
          return usable
            ? <a key={i} href={course.url} target="_blank" rel="noopener noreferrer" className="group block">{inner}</a>
            : <div key={i}>{inner}</div>;
        })}
      </div>
    </div>
  );
}

// ─── Documentation & GitHub Section ──────────────────────────────────────────
function DocsSection({ docs }: { docs: RoadmapDocumentation[] }) {
  if (!docs?.length) return null;
  const validDocs = docs.filter((d) => d?.title);
  if (!validDocs.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Globe size={15} className="text-brand-purple-light" />
        <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Official Docs & GitHub</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {validDocs.map((doc, i) => {
          const usable = isUsableUrl(doc.url);
          const isGH = doc.url?.includes("github.com");
          return usable ? (
            <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer">
              <motion.span
                whileHover={{ scale: 1.04 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white/2 border-white/8 text-white/60 hover:border-brand-purple/30 hover:text-white hover:bg-white/4 transition-all duration-200"
              >
                {isGH ? <GitBranch size={11} /> : <FileText size={11} />}
                {doc.title}
                <ExternalLink size={9} className="opacity-40" />
              </motion.span>
            </a>
          ) : (
            <BrokenLinkChip key={i} label={doc.title} />
          );
        })}
      </div>
    </div>
  );
}

// ─── Practice Platforms Section ───────────────────────────────────────────────
function PracticeSection({ platforms }: { platforms: RoadmapCodingPractice[] }) {
  if (!platforms?.length) return null;
  const validPlatforms = platforms.filter((p) => p?.platform);
  if (!validPlatforms.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Code2 size={15} className="text-emerald-400" />
        <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Practice Platforms</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {validPlatforms.map((p, i) => {
          const usable = isUsableUrl(p.url);
          const inner = (
            <motion.div
              whileHover={usable ? { x: 2 } : {}}
              className={`flex items-start gap-3 p-3 rounded-xl bg-white/2 border transition-all duration-200 ${
                usable
                  ? "border-white/5 hover:border-emerald-500/25 hover:bg-white/4"
                  : "border-white/4 opacity-50 cursor-not-allowed"
              }`}
            >
              <span className="text-base shrink-0 mt-0.5 leading-none">{PLATFORM_ICONS[p.platform] ?? "💻"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white/85">{p.platform}</p>
                <p className="text-[11px] text-white/40 mt-0.5 line-clamp-2">{p.focus}</p>
                {!usable && <span className="text-[9px] text-white/20 mt-0.5 block">link unavailable</span>}
              </div>
              {usable
                ? <ExternalLink size={11} className="text-white/20 group-hover:text-emerald-400 transition-colors shrink-0 mt-0.5" />
                : <AlertCircle size={11} className="text-white/15 shrink-0 mt-0.5" />
              }
            </motion.div>
          );
          return usable
            ? <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="group">{inner}</a>
            : <div key={i}>{inner}</div>;
        })}
      </div>
    </div>
  );
}

// ─── Readiness Score Ring ─────────────────────────────────────────────────────
function ReadinessRing({ score }: { score: number }) {
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <svg width="96" height="96" viewBox="0 0 100 100" className="shrink-0">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 1.2s ease" }}
      />
      <text x="50" y="46" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{score}</text>
      <text x="50" y="60" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">/ 100</text>
    </svg>
  );
}

// ─── Phase Card ───────────────────────────────────────────────────────────────
function PhaseCard({ phase, index }: { phase: RoadmapPhase; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const colors = PHASE_COLORS[index % PHASE_COLORS.length];

  const hasRealVideos  = (phase.resources?.youtube?.length ?? 0) > 0;
  const hasTopics      = (phase.resources?.youtube_topics?.length ?? 0) > 0;
  const hasCourses     = (phase.resources?.courses?.filter(c => c?.title)?.length ?? 0) > 0;
  const hasDocs        = (phase.resources?.documentation?.filter(d => d?.title)?.length ?? 0) > 0;
  const hasPractice    = (phase.resources?.coding_practice?.filter(p => p?.platform)?.length ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.45 }}
      className="relative"
    >
      {/* Timeline dot — positioned relative to the pl-10 sm:pl-[52px] container */}
      <div className={`absolute -left-[38px] sm:-left-[52px] top-5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br ${colors.gradient} border-2 border-white/20 flex items-center justify-center z-10`}>
        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${colors.dot}`} />
      </div>

      <Card className={`bg-gradient-to-br ${colors.gradient} ${colors.border} border`}>
        {/* Header — always visible, acts as toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-left focus:outline-none"
          aria-expanded={expanded}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <Badge variant={colors.badge} className="text-[10px]">{phase.phase}</Badge>
                {phase.duration && (
                  <Badge variant="gray" className="text-[10px]">
                    <Clock size={9} className="inline mr-0.5" />{phase.duration}
                  </Badge>
                )}
                {hasRealVideos && (
                  <Badge variant="red" className="text-[10px]">
                    <Play size={9} className="inline mr-0.5" />Videos
                  </Badge>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-snug">{phase.title}</h3>
              {!expanded && phase.focus && (
                <p className="text-xs text-white/45 mt-1 line-clamp-1">{phase.focus}</p>
              )}
            </div>
            <div className={`${colors.icon} shrink-0 mt-1 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
              <ChevronDown size={17} />
            </div>
          </div>
        </button>

        {/* Body — collapsible */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.32, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-6 pt-4 border-t border-white/8">

                {/* Focus */}
                {phase.focus && (
                  <p className="text-sm text-white/55 leading-relaxed">{phase.focus}</p>
                )}

                {/* Goals + Skills grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(phase.goals?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2 flex items-center gap-1">
                        <Target size={10} />Goals
                      </p>
                      <ul className="space-y-1.5">
                        {phase.goals!.map((g, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                            <CheckCircle2 size={11} className={`${colors.icon} mt-0.5 shrink-0`} />{g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(phase.skills_to_learn?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2 flex items-center gap-1">
                        <Layers size={10} />Skills to Learn
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {phase.skills_to_learn!.map((s, i) => (
                          <Badge key={i} variant={colors.badge} className="text-[11px]">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Projects */}
                {(phase.projects?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2 flex items-center gap-1">
                      <Code2 size={10} />Projects to Build
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {phase.projects!.map((proj, i) => (
                        <div key={i} className="p-3 rounded-xl bg-black/20 border border-white/6">
                          <p className="text-xs font-semibold text-white/85 mb-1">{proj.name}</p>
                          <p className="text-[11px] text-white/40 leading-snug mb-2">{proj.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {proj.tech_stack?.map((t, j) => (
                              <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/35 border border-white/8">{t}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Milestones */}
                {(phase.milestones?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2 flex items-center gap-1">
                      <Trophy size={10} />Milestones
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {phase.milestones!.map((m, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-black/20 border border-white/6 text-white/50">
                          <Star size={9} className={colors.icon} />{m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── YouTube real videos ── */}
                {hasRealVideos && <YouTubeSection videos={phase.resources.youtube!} />}

                {/* ── YouTube topic pills (no API key) ── */}
                {!hasRealVideos && hasTopics && (
                  <YoutubeTopicsPills topics={phase.resources.youtube_topics!} />
                )}

                {/* ── Courses ── */}
                {hasCourses && <CoursesSection courses={phase.resources.courses!} />}

                {/* ── Docs ── */}
                {hasDocs && <DocsSection docs={phase.resources.documentation!} />}

                {/* ── Practice ── */}
                {hasPractice && <PracticeSection platforms={phase.resources.coding_practice!} />}

                {/* ── Certifications ── */}
                {(phase.certifications?.filter(Boolean)?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2 flex items-center gap-1">
                      <Award size={10} />Certifications
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {phase.certifications!.filter(Boolean).map((cert, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                          <Award size={9} />{cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── Source / Notice Banner ───────────────────────────────────────────────────
function SourceBanner({ source, youtubeAvailable }: { source: string; youtubeAvailable: boolean }) {
  const isAI = source === "openrouter";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Data source */}
      <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border font-medium ${
        isAI
          ? "bg-brand-purple/10 border-brand-purple/20 text-brand-purple-light"
          : "bg-white/4 border-white/8 text-white/40"
      }`}>
        {isAI
          ? <><Sparkles size={10} />AI Generated (OpenRouter)</>
          : <><Database size={10} />Not yet generated</>
        }
      </span>

      {/* YouTube status */}
      {youtubeAvailable ? (
        <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border bg-red-500/8 border-red-500/15 text-red-400/70 font-medium">
          <Video size={10} />Real YouTube videos
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border bg-white/3 border-white/8 text-white/30 font-medium">
          <Info size={10} />Add YOUTUBE_API_KEY for real video thumbnails
        </span>
      )}
    </div>
  );
}

// ─── Roadmap Summary ──────────────────────────────────────────────────────────
function RoadmapSummary({ roadmap }: { roadmap: CareerRoadmap }) {
  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {typeof roadmap.readiness_score === "number" && (
          <Card variant="stat" className="flex items-center gap-3 p-4">
            <ReadinessRing score={roadmap.readiness_score} />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Readiness</p>
              <p className="text-sm font-semibold text-white/80 leading-snug">
                {roadmap.readiness_score >= 70 ? "Strong Candidate" : roadmap.readiness_score >= 40 ? "On Track" : "Needs Work"}
              </p>
              {roadmap.current_level && (
                <Badge variant="purple" className="text-[10px] mt-1">{roadmap.current_level} Level</Badge>
              )}
            </div>
          </Card>
        )}
        {roadmap.estimated_timeline && (
          <Card variant="stat" className="flex items-center gap-3 p-4">
            <div className="w-11 h-11 rounded-xl bg-brand-cyan/15 border border-brand-cyan/20 flex items-center justify-center shrink-0">
              <Clock size={20} className="text-brand-cyan-light" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Timeline</p>
              <p className="text-base font-bold text-white">{roadmap.estimated_timeline}</p>
            </div>
          </Card>
        )}
        {roadmap.phases && (
          <Card variant="stat" className="flex items-center gap-3 p-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Layers size={20} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Phases</p>
              <p className="text-base font-bold text-white">{roadmap.phases.length} Phases</p>
              <p className="text-[10px] text-white/35 mt-0.5">Foundation → Job Ready</p>
            </div>
          </Card>
        )}
      </div>

      {/* Assessment */}
      {roadmap.current_skills_assessment && (
        <Card className="border-brand-purple/12">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-purple/15 border border-brand-purple/20 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingUp size={14} className="text-brand-purple-light" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-white/45 uppercase tracking-wider mb-1.5">Skills Assessment</p>
              <p className="text-sm text-white/65 leading-relaxed">{roadmap.current_skills_assessment}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Key skills chips */}
      {(roadmap.skills_to_acquire?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap size={14} className="text-yellow-400" />Key Skills to Acquire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {roadmap.skills_to_acquire!.map((s, i) => (
                <Badge key={i} variant="yellow" className="text-xs">{s}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Bottom Sections ──────────────────────────────────────────────────────────
function BottomSections({ roadmap }: { roadmap: CareerRoadmap }) {
  return (
    <div className="space-y-4">
      <div className="section-divider" />

      {/* Job Platforms */}
      {(roadmap.job_platforms?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Briefcase size={14} className="text-brand-cyan-light" />Job Platforms
            </CardTitle>
            <Badge variant="cyan" className="text-[10px]">{roadmap.job_platforms!.length} portals</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categorizeJobPlatforms(roadmap.job_platforms).map((group) => (
                <motion.div
                  key={group.key}
                  whileHover={{ y: -4 }}
                  className="rounded-2xl border border-white/8 bg-white/3 p-5 shadow-lg shadow-black/20 transition-all duration-300 hover:border-brand-cyan/30 hover:shadow-brand-cyan/10 hover:bg-white/4"
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
                    <Badge variant="cyan" className="text-[10px] shrink-0">
                      {group.platforms.length} {group.platforms.length === 1 ? "Platform" : "Platforms"}
                    </Badge>
                  </div>

                  {/* Platform rows */}
                  <div className="space-y-1 pt-3 border-t border-white/8">
                    {group.platforms.map((p, i) => {
                      const usable = isUsableUrl(p.url);
                      const inner = (
                        <motion.div
                          whileHover={usable ? { x: 3 } : {}}
                          className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg transition-all duration-200 ${
                            usable ? "hover:bg-white/5 cursor-pointer" : "opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <p className="text-xs font-medium text-white/85 truncate">{p.name}</p>
                          {usable
                            ? <ExternalLink size={12} className="text-white/25 group-hover:text-brand-cyan-light transition-colors shrink-0" />
                            : <AlertCircle size={12} className="text-white/15 shrink-0" />
                          }
                        </motion.div>
                      );
                      return usable
                        ? <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="group block">{inner}</a>
                        : <div key={i}>{inner}</div>;
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(roadmap.portfolio_recommendations?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Star size={13} className="text-yellow-400" />Portfolio Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {roadmap.portfolio_recommendations!.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                    <CheckCircle2 size={11} className="text-yellow-400 mt-0.5 shrink-0" />{tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {(roadmap.resume_improvement_tips?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText size={13} className="text-pink-400" />Resume Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {roadmap.resume_improvement_tips!.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                    <CheckCircle2 size={11} className="text-pink-400 mt-0.5 shrink-0" />{tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(roadmap.recommended_certifications?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Award size={13} className="text-brand-purple-light" />Recommended Certifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {roadmap.recommended_certifications!.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                    <Award size={11} className="text-brand-purple-light mt-0.5 shrink-0" />{c}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {(roadmap.interview_prep_milestones?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target size={13} className="text-emerald-400" />Interview Prep
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {roadmap.interview_prep_milestones!.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                    <CheckCircle2 size={11} className="text-emerald-400 mt-0.5 shrink-0" />{m}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RoadmapPage() {
  const [resumeText, setResumeText]           = useState(""); // Start empty instead of sample data
  const [targetRole, setTargetRole]           = useState("");
  const [loading, setLoading]                 = useState(false);
  const [roadmap, setRoadmap]                 = useState<CareerRoadmap | null>(null);
  const [source, setSource]                   = useState<string>("demo");
  const [youtubeAvailable, setYoutubeAvailable] = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  // Load from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('resumeAnalysisData');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.resumeText) {
          setResumeText(data.resumeText.slice(0, 500) + (data.resumeText.length > 500 ? '...' : ''));
        }
        if (data.jobDescription) {
          setTargetRole(data.jobDescription);
        }
      } catch (e) {
        console.warn('Failed to load resume data from session:', e);
      }
    }
  }, []);

  const handleGenerate = async () => {
    if (!resumeText.trim() || !targetRole.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, target_role: targetRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setRoadmap(data.roadmap);
      setSource(data._source ?? "demo");
      setYoutubeAvailable(!!data._youtube_available);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const hasPhases = (roadmap?.phases?.length ?? 0) > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-2 sm:px-0">

      {/* Page header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/40 to-emerald-600/20 flex items-center justify-center shrink-0">
            <Map size={18} className="text-emerald-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Career Roadmap Generator</h1>
        </div>
        <p className="text-sm text-white/40 ml-12">
          Personalized roadmap with YouTube tutorials, courses, docs, and practice resources — in your language.
        </p>
      </motion.div>

      {/* Config card */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
        <Card>
          <CardHeader><CardTitle>Configure Your Roadmap</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Target Role</label>
              <input
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-brand-purple/40 transition-colors"
                placeholder="e.g. Senior Full Stack Engineer, Data Scientist…"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Career Summary</label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={4}
                className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white/70 resize-none outline-none focus:border-brand-purple/40 transition-colors"
                placeholder="Brief summary of your background and experience..."
              />
            </div>
            <Button size="md" onClick={handleGenerate} loading={loading} className="w-full">
              {loading ? "Generating Your Roadmap…" : "Generate Career Roadmap"}
              {!loading && <ArrowRight size={16} />}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Error */}
      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <div className="flex items-start gap-2">
            <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </Card>
      )}

      {/* Results */}
      {roadmap && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Title row + source badges */}
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base sm:text-lg font-bold text-white">Roadmap to</h2>
            <Badge variant="purple" className="text-xs sm:text-sm">{roadmap.target_role}</Badge>
          </div>
          <SourceBanner source={source} youtubeAvailable={youtubeAvailable} />

          {/* Summary */}
          <RoadmapSummary roadmap={roadmap} />

          {/* Phase timeline */}
          {hasPhases && (
            <div>
              <div className="section-divider mb-5" />
              <h3 className="text-sm sm:text-base font-bold text-white mb-5 flex items-center gap-2">
                <BookOpen size={15} className="text-brand-purple-light" />
                Learning Phases &amp; Resources
              </h3>

              <div className="relative">
                {/* Vertical connector — positioned to match dot offset */}
                <div className="absolute left-[6px] sm:left-[10px] top-6 bottom-6 w-px bg-gradient-to-b from-brand-purple/50 via-brand-cyan/30 to-transparent pointer-events-none" />

                {/* pl-10 on mobile, pl-[52px] on sm+ to give room for the dot */}
                <div className="space-y-4 pl-10 sm:pl-[52px]">
                  {roadmap.phases!.map((phase, i) => (
                    <PhaseCard key={i} phase={phase} index={i} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bottom sections */}
          <BottomSections roadmap={roadmap} />
        </motion.div>
      )}
    </div>
  );
}
