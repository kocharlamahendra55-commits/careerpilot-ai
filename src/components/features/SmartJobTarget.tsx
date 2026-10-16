"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ChevronDown, ChevronUp, Loader2, Zap, Building2,
  MapPin, Briefcase, Clock, DollarSign, Code, CheckCircle2, AlertCircle, X
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export interface JobTargetMode {
  type: "quick" | "custom" | "build" | "suggest";
  value: string;
}

interface SmartJobTargetProps {
  onTargetSelect: (target: string) => void;
  resumeText?: string;
  initialValue?: string;
}

interface RoleSuggestion {
  role: string;
  reason: string;
  skills: string[];
  confidence: "high" | "medium";
}

const QUICK_SELECT_ROLES = [
  "Software Engineer",
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Python Developer",
  "Java Developer",
  "Data Analyst",
  "Data Scientist",
  "Data Engineer",
  "AI Engineer",
  "Generative AI Engineer",
  "Machine Learning Engineer",
  "MLOps Engineer",
  "DevOps Engineer",
  "Cloud Engineer",
  "Cybersecurity Engineer",
  "UI/UX Designer",
];

const EXPERIENCE_LEVELS = ["Intern", "Entry Level", "Mid Level", "Senior", "Lead/Principal", "Executive"];
const WORK_MODES = ["On-site", "Remote", "Hybrid"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"];
const INDUSTRIES = [
  "Technology/SaaS",
  "Finance/Banking",
  "Healthcare",
  "E-commerce/Retail",
  "Education/EdTech",
  "Gaming",
  "Consulting",
  "Manufacturing",
  "Government/Public Sector",
  "Startup",
  "Enterprise",
];

export default function SmartJobTarget({ onTargetSelect, resumeText, initialValue }: SmartJobTargetProps) {
  const [mode, setMode] = useState<"quick" | "custom" | "build" | "suggest">("quick");
  const [selectedRole, setSelectedRole] = useState(initialValue || "");
  const [customJD, setCustomJD] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Build mode fields
  const [targetRole, setTargetRole] = useState("");
  const [expLevel, setExpLevel] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [industry, setIndustry] = useState("");
  const [primarySkills, setPrimarySkills] = useState("");
  const [mustHaveSkills, setMustHaveSkills] = useState("");
  const [niceToHaveSkills, setNiceToHaveSkills] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedJD, setGeneratedJD] = useState("");

  // AI Suggestions
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<RoleSuggestion[]>([]);
  const [suggestionsError, setSuggestionsError] = useState("");

  // Load AI suggestions if resume is available
  useEffect(() => {
    if (resumeText && resumeText.length > 100 && suggestions.length === 0) {
      loadAISuggestions();
    }
  }, [resumeText]);

  const loadAISuggestions = async () => {
    if (!resumeText) return;
    
    setLoadingSuggestions(true);
    setSuggestionsError("");
    
    try {
      const res = await fetch("/api/job-target/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: resumeText.slice(0, 3000) }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to load suggestions");
      }
      
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error("AI suggestions error:", err);
      setSuggestionsError("Could not load AI suggestions");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleQuickSelect = (role: string) => {
    setSelectedRole(role);
    setMode("quick");
    onTargetSelect(role);
  };

  const handleCustomJD = (value: string) => {
    setCustomJD(value);
    if (value.trim()) {
      onTargetSelect(value.trim());
    }
  };

  const handleGenerateJD = async () => {
    if (!targetRole) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/job-target/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: targetRole,
          experienceLevel: expLevel,
          workMode,
          location,
          employmentType,
          industry,
          primarySkills,
          mustHaveSkills,
          niceToHaveSkills,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate job description");
      }

      const data = await res.json();
      setGeneratedJD(data.jobDescription);
      onTargetSelect(data.jobDescription);
    } catch (err) {
      console.error("Generate JD error:", err);
      alert("Failed to generate job description. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleUseSuggestion = (suggestion: RoleSuggestion) => {
    setSelectedRole(suggestion.role);
    setMode("quick");
    onTargetSelect(suggestion.role);
  };

  const currentTarget = 
    mode === "custom" && customJD.trim() ? customJD.trim() :
    mode === "build" && generatedJD ? "AI-Generated: " + targetRole :
    mode === "suggest" && selectedRole ? selectedRole :
    mode === "quick" && selectedRole ? selectedRole :
    "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Smart Job Target</CardTitle>
        <p className="text-sm text-white/40 mt-1">
          Choose how you want to define the job you're targeting
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {resumeText && resumeText.length > 100 && (
            <button
              onClick={() => setMode("suggest")}
              className={`p-3 rounded-lg text-sm font-medium transition-all border ${
                mode === "suggest"
                  ? "bg-brand-purple text-white border-brand-purple"
                  : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
              }`}
            >
              <Sparkles size={14} className="mx-auto mb-1" />
              AI Suggestions
            </button>
          )}
          <button
            onClick={() => setMode("quick")}
            className={`p-3 rounded-lg text-sm font-medium transition-all border ${
              mode === "quick"
                ? "bg-brand-purple text-white border-brand-purple"
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
            }`}
          >
            <Zap size={14} className="mx-auto mb-1" />
            Quick Select
          </button>
          <button
            onClick={() => setMode("build")}
            className={`p-3 rounded-lg text-sm font-medium transition-all border ${
              mode === "build"
                ? "bg-brand-purple text-white border-brand-purple"
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
            }`}
          >
            <Building2 size={14} className="mx-auto mb-1" />
            Build Target
          </button>
          <button
            onClick={() => setMode("custom")}
            className={`p-3 rounded-lg text-sm font-medium transition-all border ${
              mode === "custom"
                ? "bg-brand-purple text-white border-brand-purple"
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
            }`}
          >
            <Code size={14} className="mx-auto mb-1" />
            Paste JD
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* AI Suggestions Mode */}
          {mode === "suggest" && (
            <motion.div
              key="suggest"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {loadingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-brand-purple-light mr-2" size={20} />
                  <span className="text-sm text-white/50">Analyzing your resume...</span>
                </div>
              ) : suggestionsError ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{suggestionsError}</p>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                  <p className="text-sm text-white/50">No suggestions available. Upload a resume first.</p>
                </div>
              ) : (
                suggestions.map((sug, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-4 bg-white/3 border border-white/10 rounded-lg hover:border-brand-purple/30 hover:bg-white/5 transition-all cursor-pointer"
                    onClick={() => handleUseSuggestion(sug)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white">{sug.role}</h4>
                      <Badge variant={sug.confidence === "high" ? "green" : "cyan"} className="text-xs">
                        {sug.confidence === "high" ? "Strong Fit" : "Good Fit"}
                      </Badge>
                    </div>
                    <p className="text-sm text-white/60 mb-3">{sug.reason}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {sug.skills.slice(0, 5).map((skill, i) => (
                        <Badge key={i} variant="gray" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* Quick Select Mode */}
          {mode === "quick" && (
            <motion.div
              key="quick"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                Select a Role
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_SELECT_ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => handleQuickSelect(role)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      selectedRole === role
                        ? "bg-brand-purple text-white border-brand-purple"
                        : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Build Mode */}
          {mode === "build" && (
            <motion.div
              key="build"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Target Role - Required */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                  Target Role *
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g., Senior Full Stack Developer"
                  className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-purple/50 focus:bg-white/5 transition-all"
                />
              </div>

              {/* Core Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                    Experience Level
                  </label>
                  <select
                    value={expLevel}
                    onChange={(e) => setExpLevel(e.target.value)}
                    className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-purple/50 focus:bg-white/5 transition-all"
                  >
                    <option value="">Select level...</option>
                    {EXPERIENCE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl} className="bg-gray-900">{lvl}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                    Work Mode
                  </label>
                  <select
                    value={workMode}
                    onChange={(e) => setWorkMode(e.target.value)}
                    className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-purple/50 focus:bg-white/5 transition-all"
                  >
                    <option value="">Select mode...</option>
                    {WORK_MODES.map((wm) => (
                      <option key={wm} value={wm} className="bg-gray-900">{wm}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Advanced Fields Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-brand-purple-light hover:text-brand-purple transition-colors"
              >
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showAdvanced ? "Hide" : "Show"} Advanced Options
              </button>

              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                        Location
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g., San Francisco, Remote"
                        className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-purple/50 focus:bg-white/5 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                        Employment Type
                      </label>
                      <select
                        value={employmentType}
                        onChange={(e) => setEmploymentType(e.target.value)}
                        className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-purple/50 focus:bg-white/5 transition-all"
                      >
                        <option value="">Select type...</option>
                        {EMPLOYMENT_TYPES.map((et) => (
                          <option key={et} value={et} className="bg-gray-900">{et}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                      Industry
                    </label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-brand-purple/50 focus:bg-white/5 transition-all"
                    >
                      <option value="">Select industry...</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind} value={ind} className="bg-gray-900">{ind}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                      Primary Skills (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={primarySkills}
                      onChange={(e) => setPrimarySkills(e.target.value)}
                      placeholder="e.g., React, Node.js, TypeScript"
                      className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-purple/50 focus:bg-white/5 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                      Must-have Skills (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={mustHaveSkills}
                      onChange={(e) => setMustHaveSkills(e.target.value)}
                      placeholder="e.g., 5+ years experience, AWS, Docker"
                      className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-purple/50 focus:bg-white/5 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                      Nice-to-have Skills (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={niceToHaveSkills}
                      onChange={(e) => setNiceToHaveSkills(e.target.value)}
                      placeholder="e.g., GraphQL, Kubernetes, Python"
                      className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-purple/50 focus:bg-white/5 transition-all"
                    />
                  </div>
                </motion.div>
              )}

              <Button
                onClick={handleGenerateJD}
                disabled={!targetRole || generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Job Description with AI
                  </>
                )}
              </Button>

              {generatedJD && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <p className="text-sm font-medium text-emerald-400">AI-Generated Job Description</p>
                    </div>
                    <Badge variant="cyan" className="text-xs">AI Generated</Badge>
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed mt-2">
                    {generatedJD.slice(0, 200)}...
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Custom JD Mode */}
          {mode === "custom" && (
            <motion.div
              key="custom"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">
                Paste Full Job Description
              </label>
              <textarea
                value={customJD}
                onChange={(e) => handleCustomJD(e.target.value)}
                placeholder="Paste the complete job description from the company..."
                rows={8}
                className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-purple/50 focus:bg-white/5 transition-all resize-none"
              />
              <p className="text-xs text-white/30 mt-2">
                This provides the most accurate analysis when you have the actual job posting
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Target Display */}
        {currentTarget && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
          >
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span className="text-emerald-400 text-sm font-medium flex-1">
              Target: {currentTarget.length > 100 ? currentTarget.slice(0, 100) + "..." : currentTarget}
            </span>
          </motion.div>
        )}

        {/* Warning if no target */}
        {!currentTarget && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl"
          >
            <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-amber-400 text-sm">
              Please define your target job to enable resume upload and analysis
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
