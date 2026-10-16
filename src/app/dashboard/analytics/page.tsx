"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, Target, FileText, Users,
  Zap, Award, Clock, ArrowUp, ArrowDown
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatsCard } from "@/components/ui/StatsCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

/* ── Demo data ── */
const scoreHistory = [
  { week: "W1", score: 52, avg: 60 },
  { week: "W2", score: 58, avg: 61 },
  { week: "W3", score: 63, avg: 62 },
  { week: "W4", score: 67, avg: 63 },
  { week: "W5", score: 71, avg: 64 },
  { week: "W6", score: 76, avg: 65 },
  { week: "W7", score: 82, avg: 66 },
];

const categoryScores = [
  { category: "Formatting", score: 88 },
  { category: "Keywords", score: 75 },
  { category: "Impact", score: 82 },
  { category: "Depth", score: 79 },
  { category: "Clarity", score: 85 },
  { category: "ATS Compat.", score: 80 },
];

const radarData = [
  { subject: "Technical", A: 85 },
  { subject: "Leadership", A: 65 },
  { subject: "Communication", A: 78 },
  { subject: "Problem Solving", A: 90 },
  { subject: "Collaboration", A: 72 },
  { subject: "Innovation", A: 68 },
];

const jobMatchData = [
  { role: "Senior React Dev", match: 91, color: "#7C3AED" },
  { role: "Full Stack Eng.", match: 85, color: "#06B6D4" },
  { role: "Frontend Lead", match: 79, color: "#10B981" },
  { role: "Software Architect", match: 68, color: "#F59E0B" },
  { role: "DevOps Engineer", match: 45, color: "#EF4444" },
];

const pieData = [
  { name: "Strong Match", value: 35, color: "#10B981" },
  { name: "Moderate Match", value: 45, color: "#F59E0B" },
  { name: "Low Match", value: 20, color: "#EF4444" },
];

const insights = [
  { icon: "📈", text: "Your ATS score improved by +30 points over 7 weeks", color: "text-emerald-400" },
  { icon: "🎯", text: "You are in the top 23% of candidates for React roles", color: "text-brand-purple-light" },
  { icon: "⚡", text: "Adding Docker keywords could boost your score by ~8 points", color: "text-yellow-400" },
  { icon: "🏆", text: "Latest resume beats 68% of applicants for target JD", color: "text-brand-cyan-light" },
];

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="glass px-3 py-2 rounded-xl border border-brand-purple/30 text-xs">
        <p className="text-white/50 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ totalResumes: 0, avgAtsScore: 0, totalAnalyses: 0 });
  const [resumes, setResumes] = useState<Array<{ id: string; filename: string; analysis?: { atsScore: number } | null; createdAt: string }>>([]);

  useEffect(() => {
    fetch("/api/dashboard/stats").then(r => r.json()).then(d => {
      if (d.stats) setStats(d.stats);
    }).catch(() => {});
    fetch("/api/resumes").then(r => r.json()).then(d => {
      if (d.resumes) setResumes(d.resumes);
    }).catch(() => {});
  }, []);

  const latestScore = resumes[0]?.analysis?.atsScore ?? stats.avgAtsScore ?? 82;
  const resumeCount = stats.totalResumes || resumes.length;

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" as const } }),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-cyan/40 to-brand-cyan/10 flex items-center justify-center">
            <BarChart3 size={18} className="text-brand-cyan-light" />
          </div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
        </div>
        <p className="text-sm text-white/40">Track your resume performance and career progress over time</p>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial="hidden" animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { title: "Latest Score", value: latestScore, suffix: "", icon: TrendingUp, color: "text-emerald-400", trend: { value: resumeCount > 0 ? latestScore - 50 : 0, label: "vs baseline" } },
          { title: "Resumes Analyzed", value: resumeCount, suffix: "", icon: FileText, color: "text-brand-purple-light", description: "Total uploaded" },
          { title: "Best Job Match", value: 91, suffix: "%", icon: Target, color: "text-brand-cyan-light", description: "Senior React Dev" },
          { title: "Score Percentile", value: 77, suffix: "th", icon: Award, color: "text-yellow-400", description: "Top quartile" },
        ].map((stat, i) => (
          <motion.div key={stat.title} variants={fadeUp} custom={i}>
            <StatsCard
              title={stat.title}
              value={stat.value}
              suffix={stat.suffix}
              icon={stat.icon}
              iconColor={stat.color}
              trend={stat.trend}
              description={stat.description}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Score Over Time + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>ATS Score Over Time</CardTitle>
              <div className="flex gap-3">
                <span className="flex items-center gap-1.5 text-xs text-white/40">
                  <span className="w-2 h-2 rounded-full bg-brand-purple" />Your Score
                </span>
                <span className="flex items-center gap-1.5 text-xs text-white/40">
                  <span className="w-2 h-2 rounded-full bg-brand-cyan/60" />Industry Avg
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scoreHistory} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="myScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="avgScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[40, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="avg" name="Avg" stroke="#06B6D4" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#avgScore)" dot={false} />
                    <Area type="monotone" dataKey="score" name="You" stroke="#7C3AED" strokeWidth={2.5} fill="url(#myScore)" dot={{ fill: "#A78BFA", r: 4 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Radar Chart */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
          <Card className="h-full">
            <CardHeader><CardTitle>Skill Profile</CardTitle><Badge variant="purple">AI</Badge></CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} />
                    <Radar name="Skills" dataKey="A" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip contentStyle={{ background: "rgba(5,8,22,0.95)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "10px", fontSize: "12px" }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Category Breakdown + Job Match + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Category Scores */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Category Score Breakdown</CardTitle><Badge variant="cyan">Latest Resume</Badge></CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryScores} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="category" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: "rgba(5,8,22,0.95)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "10px", fontSize: "12px" }} />
                    <Bar dataKey="score" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie chart */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
          <Card>
            <CardHeader><CardTitle>Match Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "rgba(5,8,22,0.95)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "10px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-white/50">{d.name}</span>
                    </div>
                    <span className="text-white/70 font-semibold">{d.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Job Match Table */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}>
        <Card>
          <CardHeader><CardTitle>🎯 Job Role Match Analysis</CardTitle><Badge variant="purple">Top Matches</Badge></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {jobMatchData.map((job, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-32 text-sm text-white/60 truncate shrink-0">{job.role}</div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${job.match}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: job.color }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold w-10 text-right" style={{ color: job.color }}>{job.match}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Insights */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}>
        <Card>
          <CardHeader><CardTitle>💡 AI Insights</CardTitle><Badge variant="yellow">Personalized</Badge></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {insights.map((insight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/2 border border-white/5"
                >
                  <span className="text-lg">{insight.icon}</span>
                  <p className={`text-sm leading-relaxed ${insight.color}`}>{insight.text}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
