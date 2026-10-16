"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Upload, CheckCircle2, AlertCircle, Clock,
  Trash2, Eye, Download, ChevronRight, BarChart3, Sparkles
} from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatFileSize } from "@/lib/utils";

/* ── Resume item type ── */
type ResumeItem = {
  id: string;
  filename: string;
  fileSize: number;
  status: string;
  createdAt: string;
  analysis: {
    ats_score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    score_breakdown: Record<string, number>;
    hidden_skills: string[];
    keyword_optimizer_suggestions: string[];
    grammar_tone_feedback: string[];
  } | null;
};

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 55) return "text-yellow-400";
  return "text-red-400";
}

export default function ResumesPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/resumes")
      .then(r => r.json())
      .then(data => {
        if (data.resumes && data.resumes.length > 0) {
          // Normalize real data to the local shape
          const real: ResumeItem[] = data.resumes.map((r: {
            id: string; filename: string; fileSize: number;
            status: string; createdAt: string;
            analysis?: { atsScore: number; summary: string } | null;
          }) => ({
            id: r.id,
            filename: r.filename,
            fileSize: r.fileSize || 0,
            status: r.status,
            createdAt: r.createdAt,
            analysis: r.analysis ? {
              ats_score: r.analysis.atsScore,
              summary: r.analysis.summary || "",
              strengths: [],
              weaknesses: [],
              score_breakdown: {},
              hidden_skills: [],
              keyword_optimizer_suggestions: [],
              grammar_tone_feedback: [],
            } : null,
          }));
          setResumes(real);
          setSelected(real[0]?.id ?? null);
        }
        // If no resumes, leave the list empty — empty state UI handles it
      })
      .catch(() => { /* leave empty */ })
      .finally(() => setLoading(false));
  }, []);

  const selectedResume = resumes.find((r) => r.id === selected) ?? null;


  const handleDelete = (id: string) => {
    setDeleting(id);
    setTimeout(() => {
      setResumes((prev) => prev.filter((r) => r.id !== id));
      if (selected === id) setSelected(resumes.find((r) => r.id !== id)?.id ?? null);
      setDeleting(null);
    }, 600);
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" as const } }),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-purple/40 to-brand-indigo/20 flex items-center justify-center">
              <FileText size={18} className="text-brand-purple-light" />
            </div>
            <h1 className="text-2xl font-bold text-white">My Resumes</h1>
          </div>
          <p className="text-sm text-white/40">All your uploaded and analyzed resumes</p>
        </div>
        <Link href="/dashboard/upload">
          <Button size="md" className="gap-2">
            <Upload size={15} /> Upload New
          </Button>
        </Link>
      </motion.div>

      {resumes.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center mb-4">
            <FileText size={28} className="text-white/20" />
          </div>
          <h3 className="text-lg font-semibold text-white/60 mb-2">No Resumes Yet</h3>
          <p className="text-sm text-white/30 mb-6">Upload your first resume to get an AI-powered analysis</p>
          <Link href="/dashboard/upload"><Button>Upload Resume</Button></Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Resume List */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="lg:col-span-1 space-y-2">
            {resumes.map((resume, i) => (
              <motion.div
                key={resume.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: deleting === resume.id ? 0 : 1, x: 0, scale: deleting === resume.id ? 0.95 : 1 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                onClick={() => setSelected(resume.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  selected === resume.id
                    ? "bg-brand-purple/15 border-brand-purple/40"
                    : "bg-white/2 border-white/5 hover:border-white/10 hover:bg-white/4"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-purple/15 border border-brand-purple/20 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-brand-purple-light" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/85 truncate">{resume.filename}</p>
                    <p className="text-xs text-white/30 mt-0.5">
                      {formatFileSize(resume.fileSize)} · {formatRelative(resume.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {resume.analysis ? (
                      <>
                        <span className={`text-sm font-bold ${scoreColor(resume.analysis.ats_score)}`}>
                          {resume.analysis.ats_score}
                        </span>
                        <CheckCircle2 size={12} className="text-emerald-400/60" />
                      </>
                    ) : (
                      <Clock size={12} className="text-white/30" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Resume Detail */}
          <AnimatePresence mode="wait">
            {selectedResume && (
              <motion.div
                key={selectedResume.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="lg:col-span-2 space-y-4"
              >
                {/* Score Overview */}
                <Card variant="glow" className="p-7 sm:p-8">
                  <div className="flex flex-col sm:flex-row items-center gap-7">
                    <ScoreRing score={selectedResume.analysis?.ats_score ?? 0} size={136} label="ATS Score" />
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2 mb-2.5 flex-wrap">
                        <Badge variant="green" dot>Analyzed</Badge>
                        <Badge variant="gray">{selectedResume.filename}</Badge>
                      </div>
                      <p className="text-sm text-white/55 leading-relaxed max-w-xl">{selectedResume.analysis?.summary ?? "Analysis pending."}</p>
                      <div className="flex justify-center sm:justify-start gap-2 mt-4">
                        <Button size="sm" variant="secondary" onClick={() => handleDelete(selectedResume.id)} className="gap-1.5 text-red-400 border-red-500/20 hover:bg-red-500/10">
                          <Trash2 size={13} /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Score Breakdown */}
                <Card>
                  <CardHeader><CardTitle>Score Breakdown</CardTitle><Badge variant="purple"><BarChart3 size={10} /> Detailed</Badge></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(selectedResume.analysis?.score_breakdown ?? {}).map(([key, val]) => (
                        <ProgressBar key={key} value={Number(val)} label={key.charAt(0).toUpperCase() + key.slice(1)} />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <Card>
                    <CardHeader><CardTitle>💪 Strengths</CardTitle><Badge variant="green">{selectedResume.analysis?.strengths.length ?? 0}</Badge></CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {(selectedResume.analysis?.strengths ?? []).map((s, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-white/70 leading-relaxed">
                            <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" /><span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Weaknesses */}
                  <Card>
                    <CardHeader><CardTitle>⚠️ Weaknesses</CardTitle><Badge variant="red">{selectedResume.analysis?.weaknesses.length ?? 0}</Badge></CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {(selectedResume.analysis?.weaknesses ?? []).map((w, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-sm text-white/70 leading-relaxed p-2.5 -m-2.5 rounded-lg bg-red-500/[0.04] border border-red-500/10"
                          >
                            <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" /><span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Hidden Skills */}
                <Card>
                  <CardHeader><CardTitle>🔍 Hidden Skills</CardTitle><Badge variant="cyan"><Sparkles size={10} /> AI Detected</Badge></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2.5">
                      {(selectedResume.analysis?.hidden_skills ?? []).map((s, i) => (
                        <Badge key={i} variant="cyan">{s}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Keyword Suggestions */}
                <Card>
                  <CardHeader><CardTitle>🔑 Keyword Optimizer</CardTitle><Badge variant="yellow">ATS Boost</Badge></CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {(selectedResume.analysis?.keyword_optimizer_suggestions ?? []).map((k, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-white/70 leading-relaxed">
                          <ChevronRight size={14} className="text-yellow-400 mt-0.5 shrink-0" /><span>{k}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
