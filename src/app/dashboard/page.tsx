"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText, Upload, TrendingUp, Target, Zap, ArrowRight,
  Clock, CheckCircle2, AlertCircle, BarChart3, Sparkles,
  BrainCircuit, BookOpen, Briefcase, Users, LogOut, Activity,
} from "lucide-react";
import { StatsCard } from "@/components/ui/StatsCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { formatRelativeDate, formatFileSize } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/AuthContext";

/* ── Types ── */
interface DashboardStats {
  totalUsers: number;
  totalResumes: number;
  avgAtsScore: number;
  totalAnalyses: number;
  apiCalls: number;
}
interface ResumeRecord {
  id: string;
  filename: string;
  fileSize: number;
  status: string;
  createdAt: string;
  analysis?: { atsScore: number; summary: string } | null;
}
interface ActivityRecord {
  id: string;
  action: string;
  details: string;
  userName: string;
  createdAt: string;
}
interface ScorePoint { score: number; date: string }

/* ── Empty State Component ── */
function EmptyState({ icon: Icon, title, desc, actionLabel, actionHref }: {
  icon: React.ElementType; title: string; desc: string;
  actionLabel?: string; actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center mb-4">
        <Icon size={26} className="text-white/15" />
      </div>
      <h3 className="text-white/50 font-semibold mb-1.5">{title}</h3>
      <p className="text-white/25 text-sm max-w-xs leading-relaxed">{desc}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <button className="mt-5 flex items-center gap-1.5 px-4 py-2 bg-brand-purple/20 border border-brand-purple/30 rounded-xl text-brand-purple-light text-sm hover:bg-brand-purple/30 transition-colors">
            <Upload size={13} /> {actionLabel}
          </button>
        </Link>
      )}
    </div>
  );
}

/* ── Score color ── */
function scoreColor(s: number) {
  if (s >= 80) return "text-emerald-400";
  if (s >= 60) return "text-yellow-400";
  return "text-red-400";
}

/* ── Status badge ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    ANALYZED: { label: "Analyzed", className: "badge-green" },
    PROCESSING: { label: "Processing", className: "badge-yellow" },
    FAILED: { label: "Failed", className: "badge-red" },
  };
  const s = map[status] || { label: status, className: "" };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}>{s.label}</span>;
}

/* ── Action label mapping ── */
function actionLabel(action: string) {
  const map: Record<string, string> = {
    REGISTER: "New user registered",
    LOGIN: "User logged in",
    ANALYZE: "Resume analyzed",
    JOB_MATCH: "Job match performed",
    ROADMAP: "Career roadmap generated",
    SKILL_GAP: "Skill gap analyzed",
  };
  return map[action] || action;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [scoreHistory, setScoreHistory] = useState<ScorePoint[]>([]);
  const [resumeStatus, setResumeStatus] = useState({ analyzed: 0, processing: 0, failed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, resumesRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/resumes"),
        ]);
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
          setActivity(data.recentActivity || []);
          setScoreHistory(data.scoreHistory || []);
          setResumeStatus(data.resumeStatus || { analyzed: 0, processing: 0, failed: 0 });
        }
        if (resumesRes.ok) {
          const data = await resumesRes.json();
          setResumes(data.resumes || []);
        }
      } catch {
        // Keep zeroed state on error
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const displayStats = stats ?? { totalUsers: 0, totalResumes: 0, avgAtsScore: 0, totalAnalyses: 0, apiCalls: 0 };
  const hasResumes = resumes.length > 0;
  const hasActivity = activity.length > 0;
  const hasScores = scoreHistory.length > 0;

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-[28px] font-bold text-white tracking-tight"
          >
            {user ? `Welcome back, ${user.name?.split(" ")[0] || "there"} 👋` : "Dashboard"}
          </motion.h1>
          <p className="text-white/40 text-sm mt-1.5">
            {hasResumes
              ? `You have ${resumes.length} resume${resumes.length !== 1 ? "s" : ""} analyzed`
              : "Upload your first resume to get started"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/upload">
            <Button size="sm" className="flex items-center gap-1.5">
              <Upload size={14} /> Upload Resume
            </Button>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/30 hover:text-red-400 transition-colors border border-white/6 hover:border-red-500/20"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {[
          { title: "Total Users", value: loading ? "—" : displayStats.totalUsers.toString(), icon: Users },
          { title: "Total Resumes", value: loading ? "—" : displayStats.totalResumes.toString(), icon: FileText },
          { title: "Avg ATS Score", value: loading ? "—" : `${displayStats.avgAtsScore}%`, icon: Target },
          { title: "API Calls", value: loading ? "—" : displayStats.apiCalls.toString(), icon: Zap },
        ].map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <StatsCard title={s.title} value={s.value} icon={s.icon} />
          </motion.div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={16} className="text-brand-purple-light" />
                ATS Score History
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {hasScores ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={scoreHistory.map((s, idx) => ({
                    date: new Date(s.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
                    score: s.score,
                  }))}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" stroke="#ffffff30" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} stroke="#ffffff30" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                      labelStyle={{ color: "#ffffff60" }}
                      itemStyle={{ color: "#a78bfa" }}
                    />
                    <Area type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2} fill="url(#scoreGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="No analytics available"
                  desc="Upload your first resume to start seeing ATS score trends and analytics"
                  actionLabel="Upload Resume"
                  actionHref="/dashboard/upload"
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Resume Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={16} className="text-brand-cyan-light" />
                Resume Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {displayStats.totalResumes > 0 ? (
                <div className="space-y-4">
                  {[
                    { label: "Analyzed", count: resumeStatus.analyzed, color: "bg-emerald-500" },
                    { label: "Processing", count: resumeStatus.processing, color: "bg-yellow-500" },
                    { label: "Failed", count: resumeStatus.failed, color: "bg-red-500" },
                  ].map(({ label, count, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-white/50">{label}</span>
                        <span className="text-white/70 font-medium">{count}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} rounded-full transition-all duration-700`}
                          style={{ width: displayStats.totalResumes ? `${(count / displayStats.totalResumes) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 border-t border-white/6">
                    <div className="text-center">
                      <ScoreRing score={displayStats.avgAtsScore} size={90} />
                      <p className="text-xs text-white/30 mt-2">Average ATS Score</p>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No resumes yet"
                  desc="Resume status will appear here once you upload your first resume"
                  actionLabel="Upload Now"
                  actionHref="/dashboard/upload"
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Recent Resumes ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText size={16} className="text-brand-purple-light" />
                My Resumes
              </CardTitle>
              {hasResumes && (
                <Link href="/dashboard/resumes">
                  <button className="text-xs text-brand-purple-light hover:underline flex items-center gap-1">
                    View All <ArrowRight size={12} />
                  </button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin" />
              </div>
            ) : hasResumes ? (
              <div className="space-y-3">
                {resumes.slice(0, 5).map((resume) => (
                  <div
                    key={resume.id}
                    className="flex items-center justify-between p-4 sm:p-4.5 rounded-xl bg-white/2 border border-white/5 hover:border-brand-purple/25 hover:bg-white/3 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center shrink-0">
                        <FileText size={15} className="text-brand-purple-light" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white/80 font-medium truncate">{resume.filename}</p>
                        <p className="text-xs text-white/30 mt-0.5">
                          {formatFileSize(resume.fileSize)} · {formatRelativeDate(resume.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {resume.analysis && (
                        <span className={`text-sm font-bold ${scoreColor(resume.analysis.atsScore)}`}>
                          {resume.analysis.atsScore}%
                        </span>
                      )}
                      <StatusBadge status={resume.status} />
                      <Link href="/dashboard/resumes">
                        <ArrowRight size={14} className="text-white/20 group-hover:text-brand-purple-light transition-colors" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No resume uploaded yet"
                desc="Upload your first resume to get ATS scores, skill gap analysis, career roadmaps, and interview preparation"
                actionLabel="Upload Your First Resume"
                actionHref="/dashboard/upload"
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Workflow CTA + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles size={16} className="text-yellow-400" />
                AI Workflow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {[
                  { step: "1", label: "Upload Resume", href: "/dashboard/upload", done: hasResumes, icon: Upload },
                  { step: "2", label: "ATS Analysis", href: "/dashboard/resumes", done: displayStats.totalAnalyses > 0, icon: Target },
                  { step: "3", label: "Job Intelligence Dashboard", href: "/dashboard/job-match", done: false, icon: Briefcase, description: "All-in-one analysis with job matching, skill gap, and interview prep" },
                  { step: "4", label: "Career Roadmap", href: "/dashboard/roadmap", done: false, icon: TrendingUp },
                ].map(({ step, label, href, done, icon: Icon, description }) => (
                  <Link key={step} href={href}>
                    <div className={`flex items-start gap-3 p-3 rounded-xl transition-colors duration-200 cursor-pointer group ${done ? "bg-emerald-500/5 border border-emerald-500/15 hover:border-emerald-500/25" : "hover:bg-white/3 border border-transparent hover:border-white/6"}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${done ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/30"}`}>
                        {done ? <CheckCircle2 size={14} /> : step}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon size={14} className={done ? "text-emerald-400" : "text-white/30"} />
                          <span className={`text-sm ${done ? "text-emerald-300" : "text-white/50 group-hover:text-white/70"} transition-colors`}>{label}</span>
                        </div>
                        {description && (
                          <p className="text-xs text-white/30 mt-1 ml-5">{description}</p>
                        )}
                      </div>
                      <ArrowRight size={12} className="ml-auto text-white/15 group-hover:text-white/30 transition-colors shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity size={16} className="text-brand-cyan-light" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin" />
                </div>
              ) : hasActivity ? (
                <div className="space-y-3">
                  {activity.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/2 border border-white/4 hover:border-white/8 hover:bg-white/3 transition-colors duration-200">
                      <div className="w-7 h-7 rounded-full bg-brand-purple/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock size={12} className="text-brand-purple-light" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white/70 truncate">{actionLabel(item.action)}</p>
                        <p className="text-xs text-white/30 mt-0.5">{formatRelativeDate(item.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Activity}
                  title="No activity yet"
                  desc="Your actions will be recorded here as you use CareerPilot"
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
