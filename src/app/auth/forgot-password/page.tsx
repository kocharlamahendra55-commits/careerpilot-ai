"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { BrainCircuit, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        // Even on error, show success to prevent email enumeration
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Password reset request failed:', error);
      // Show success even on network error to prevent enumeration
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-brand-purple/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-indigo flex items-center justify-center shadow-glow mb-4">
              <BrainCircuit size={22} className="text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-white/40 text-sm mt-1">
            {submitted ? "Check your inbox" : "Enter your registered email address"}
          </p>
        </div>

        <div className="glass-card p-8 rounded-2xl border border-white/8">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-6 gap-4 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Reset Link Sent!</p>
                <p className="text-white/40 text-sm mt-1">
                  If <span className="text-white/60">{email}</span> is registered, you&apos;ll receive a reset link shortly.
                </p>
              </div>
              <Link
                href="/auth/login"
                className="mt-2 flex items-center gap-2 text-brand-purple-light hover:underline text-sm"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-purple/50 transition-colors"
                  />
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-brand-purple hover:bg-brand-purple/80 rounded-xl text-white font-semibold text-sm transition-all shadow-glow-sm"
              >
                Send Reset Link
              </button>

              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="flex items-center justify-center gap-1.5 text-sm text-white/40 hover:text-white/60 transition-colors"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
