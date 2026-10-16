"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Eye, EyeOff, Zap, Loader2, CheckCircle2, GraduationCap } from "lucide-react";

export default function StudentSignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) return setError("Full name is required.");
    if (!email.trim()) return setError("Email is required.");
    if (!password) return setError("Password is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "STUDENT",
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 1500);
    } catch (err) {
      setError("Cannot connect to server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050816] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-brand-purple/8 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-purple to-brand-indigo flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-white font-bold">
              Career<span className="text-brand-purple-light">Pilot</span>
            </span>
          </Link>
        </div>

        <div className="glass-card p-8 rounded-2xl border border-white/8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-7">
            <div className="w-10 h-10 rounded-xl bg-brand-purple/15 border border-brand-purple/25 flex items-center justify-center text-xl">
              👨‍🎓
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Student Registration</h1>
              <p className="text-xs text-white/40 mt-0.5">Start your AI-powered career journey</p>
            </div>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-10 gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Account Created!</p>
                <p className="text-white/40 text-sm mt-1">Redirecting to login...</p>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="John Doe"
                  autoComplete="name"
                  className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-purple/50 focus:bg-white/5 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  autoComplete="email"
                  className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-purple/50 focus:bg-white/5 transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-purple/50 focus:bg-white/5 transition-all"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-purple/50 focus:bg-white/5 transition-all"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {/* Password match indicator */}
                {confirmPassword && (
                  <p className={`text-xs mt-1.5 ${password === confirmPassword ? "text-emerald-400" : "text-red-400"}`}>
                    {password === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                >
                  <span className="text-red-400 text-xs mt-0.5">⚠</span>
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-purple hover:bg-brand-purple/80 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-glow-sm mt-2"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Creating Account...</>
                ) : (
                  "Create Account"
                )}
              </button>

              <p className="text-center text-sm text-white/30 pt-1">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-brand-purple-light hover:underline font-medium">
                  Sign In
                </Link>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-white/20 mt-4">
          You can add more profile details after signing in
        </p>
      </motion.div>
    </div>
  );
}
