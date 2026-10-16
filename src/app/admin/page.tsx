"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield, Users, FileText, BarChart3, Activity,
  TrendingUp, AlertCircle, CheckCircle2, Clock
} from "lucide-react";
import { StatsCard } from "@/components/ui/StatsCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from "recharts";

const monthlyData = [
  { month: "Jan", resumes: 120, users: 45 },
  { month: "Feb", resumes: 190, users: 72 },
  { month: "Mar", resumes: 240, users: 95 },
  { month: "Apr", resumes: 310, users: 130 },
  { month: "May", resumes: 480, users: 198 },
  { month: "Jun", resumes: 620, users: 254 },
  { month: "Jul", resumes: 780, users: 312 },
];

const pieData = [
  { name: "Analyzed", value: 78, color: "#7C3AED" },
  { name: "Processing", value: 12, color: "#06B6D4" },
  { name: "Failed", value: 10, color: "#EF4444" },
];

const recentLogs = [
  { user: "john.doe@email.com", action: "Resume Analyzed", score: 82, time: "2m ago", status: "success" },
  { user: "sarah.k@email.com", action: "Job Match Run", score: 74, time: "5m ago", status: "success" },
  { user: "alex.j@email.com", action: "Resume Upload", score: null, time: "8m ago", status: "processing" },
  { user: "priya.s@email.com", action: "Roadmap Generated", score: null, time: "12m ago", status: "success" },
  { user: "unknown@email.com", action: "Analysis Failed", score: null, time: "20m ago", status: "error" },
];

export default function AdminPage() {
  const [stats, setStats] = useState({ totalUsers: 0, totalResumes: 0, avgAtsScore: 0, totalAnalyses: 0, apiCalls: 0 });
  const [resumeStatus, setResumeStatus] = useState({ analyzed: 0, processing: 0, failed: 0 });

  useEffect(() => {
    fetch("/api/dashboard/stats").then(r => r.json()).then(d => {
      if (d.stats) setStats(d.stats);
      if (d.resumeStatus) setResumeStatus(d.resumeStatus);
    }).catch(() => {});
  }, []);

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
  };

  const totalResumes = stats.totalResumes || 0;
  const analyzedPct = totalResumes > 0 ? Math.round(resumeStatus.analyzed / totalResumes * 100) : 78;
  const processingPct = totalResumes > 0 ? Math.round(resumeStatus.processing / totalResumes * 100) : 12;
  const failedPct = totalResumes > 0 ? Math.round(resumeStatus.failed / totalResumes * 100) : 10;
  const dynamicPieData = [
    { name: "Analyzed", value: analyzedPct, color: "#7C3AED" },
    { name: "Processing", value: processingPct, color: "#06B6D4" },
    { name: "Failed", value: failedPct || 0, color: "#EF4444" },
  ];


  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/40 to-orange-500/20 flex items-center justify-center">
            <Shield size={18} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-sm text-white/40">System overview and user management</p>
          </div>
        </div>
        <Badge variant="red" dot className="mt-2">Admin Access</Badge>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial="hidden" animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={fadeUp} custom={0}>
          <StatsCard title="Total Users" value={stats.totalUsers || 0} icon={Users} iconColor="text-brand-purple-light" description="Registered users" />
        </motion.div>
        <motion.div variants={fadeUp} custom={1}>
          <StatsCard title="Total Resumes" value={stats.totalResumes || 0} icon={FileText} iconColor="text-brand-cyan-light" description="Uploaded" />
        </motion.div>
        <motion.div variants={fadeUp} custom={2}>
          <StatsCard title="Avg ATS Score" value={stats.avgAtsScore || 0} suffix="%" icon={TrendingUp} iconColor="text-emerald-400" description="Average score" />
        </motion.div>
        <motion.div variants={fadeUp} custom={3}>
          <StatsCard title="Analyses Run" value={stats.totalAnalyses || 0} icon={Activity} iconColor="text-pink-400" description="Total" />
        </motion.div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar chart */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Growth</CardTitle>
              <div className="flex gap-3">
                <span className="flex items-center gap-1.5 text-xs text-white/40"><span className="w-2 h-2 rounded-full bg-brand-purple" />Resumes</span>
                <span className="flex items-center gap-1.5 text-xs text-white/40"><span className="w-2 h-2 rounded-full bg-brand-cyan" />Users</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "rgba(5,8,22,0.95)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "10px" }} labelStyle={{ color: "rgba(255,255,255,0.5)" }} />
                    <Bar dataKey="resumes" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="users" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie chart */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
          <Card>
            <CardHeader><CardTitle>Resume Status</CardTitle></CardHeader>
            <CardContent>
              <div className="h-40 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dynamicPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {dynamicPieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "rgba(5,8,22,0.95)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "10px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {dynamicPieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span className="text-white/50">{item.name}</span>
                    </div>
                    <span className="text-white/70 font-semibold">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Activity Log */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity Log</CardTitle>
            <Badge variant="gray">Live</Badge>
          </CardHeader>
          <CardContent>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Score</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <td className="text-sm text-white/70">{log.user}</td>
                    <td className="text-sm text-white/50">{log.action}</td>
                    <td className="text-sm font-semibold">
                      {log.score ? (
                        <span className={log.score >= 75 ? "text-emerald-400" : "text-yellow-400"}>{log.score}</span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                    <td className="text-xs text-white/30 flex items-center gap-1">
                      <Clock size={11} /> {log.time}
                    </td>
                    <td>
                      {log.status === "success" && <Badge variant="green" dot>Done</Badge>}
                      {log.status === "processing" && <Badge variant="yellow" dot>Processing</Badge>}
                      {log.status === "error" && <Badge variant="red" dot>Failed</Badge>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
