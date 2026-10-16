"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle2, Zap, ArrowRight } from "lucide-react";

const ROLES = [
  {
    emoji: "👨‍🎓",
    title: "Student / Job Seeker",
    description: "Find your dream job with AI-powered resume analysis",
    features: [
      "Upload Resume",
      "ATS Score",
      "Skill Gap Analysis",
      "Career Roadmap",
      "Interview Preparation",
      "AI Job Matching",
    ],
    href: "/auth/student-signup",
    color: "brand-purple",
    gradient: "from-brand-purple/20 to-brand-indigo/10",
    border: "border-brand-purple/30",
    glow: "shadow-[0_0_40px_rgba(124,58,237,0.15)]",
  },
  {
    emoji: "🏢",
    title: "Recruiter",
    description: "Find the best candidates with AI-powered screening",
    features: [
      "Post Jobs",
      "AI Resume Screening",
      "Candidate Ranking",
      "Manage Applications",
      "Hire Candidates",
    ],
    href: "/auth/recruiter-signup",
    color: "brand-cyan",
    gradient: "from-brand-cyan/20 to-brand-cyan/5",
    border: "border-brand-cyan/30",
    glow: "shadow-[0_0_40px_rgba(6,182,212,0.15)]",
  },
];

export default function SelectRolePage() {
  return (
    <div className="min-h-screen bg-[#050816] flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-brand-purple/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-brand-cyan/6 rounded-full blur-3xl pointer-events-none" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-2 mb-10"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-purple to-brand-indigo flex items-center justify-center shadow-glow-sm">
          <Zap size={16} className="text-white" />
        </div>
        <span className="text-white font-bold text-lg">
          Career<span className="text-brand-purple-light">Pilot</span>
        </span>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
          AI Resume{" "}
          <span className="bg-gradient-to-r from-brand-purple-light to-brand-cyan-light bg-clip-text text-transparent">
            Person
          </span>
        </h1>
        <p className="text-white/50 text-lg">Build your career with AI.</p>

        <div className="mt-8 mb-2">
          <h2 className="text-xl font-bold text-white">Create Account</h2>
          <p className="text-white/40 text-sm mt-1">Choose your account type.</p>
        </div>
      </motion.div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {ROLES.map((role, i) => (
          <motion.div
            key={role.title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
          >
            <Link href={role.href}>
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`relative bg-gradient-to-br ${role.gradient} border ${role.border} rounded-2xl p-8 cursor-pointer transition-all duration-300 ${role.glow} hover:${role.glow} group`}
              >
                {/* Emoji + Title */}
                <div className="mb-6">
                  <div className="text-5xl mb-4">{role.emoji}</div>
                  <h3 className="text-xl font-bold text-white mb-1">{role.title}</h3>
                  <p className="text-sm text-white/40">{role.description}</p>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-8">
                  {role.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-white/65">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Button */}
                <div
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    i === 0
                      ? "bg-brand-purple hover:bg-brand-purple/80 text-white"
                      : "bg-brand-cyan/20 hover:bg-brand-cyan/30 border border-brand-cyan/40 text-brand-cyan-light"
                  }`}
                >
                  Continue
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Sign in link */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-sm text-white/30"
      >
        Already have an account?{" "}
        <Link href="/auth/login" className="text-brand-purple-light hover:underline">
          Sign In
        </Link>
      </motion.p>
    </div>
  );
}
