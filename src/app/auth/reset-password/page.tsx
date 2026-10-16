"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { BrainCircuit, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setError("Invalid reset link. Please request a new password reset.");
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token, 
          password, 
          confirmPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login?message=Password reset successfully');
        }, 3000);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (error) {
      console.error('Password reset failed:', error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    };
    
    score = Object.values(checks).filter(Boolean).length;
    
    return { score, checks };
  };

  const { score, checks } = getPasswordStrength(password);

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
            {success ? "Password updated successfully" : "Enter your new password"}
          </p>
        </div>

        <div className="glass-card p-8 rounded-2xl border border-white/8">
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-6 gap-4 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Password Reset Successful!</p>
                <p className="text-white/40 text-sm mt-1">
                  Your password has been updated. Redirecting to login...
                </p>
              </div>
              <Link
                href="/auth/login"
                className="mt-2 flex items-center gap-2 text-brand-purple-light hover:underline text-sm"
              >
                Continue to Sign In
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2"
                >
                  <AlertCircle size={16} className="text-red-400" />
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    required
                    disabled={!token || loading}
                    className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 pl-11 pr-11 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-purple/50 transition-colors disabled:opacity-50"
                  />
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/40 transition-colors"
                    disabled={!token || loading}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            score >= i
                              ? score === 4
                                ? "bg-emerald-400"
                                : score >= 3
                                ? "bg-yellow-400"
                                : "bg-red-400"
                              : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-white/40 space-y-0.5">
                      <div className={checks.length ? "text-emerald-400" : ""}>
                        ✓ At least 8 characters
                      </div>
                      <div className={checks.uppercase ? "text-emerald-400" : ""}>
                        ✓ One uppercase letter
                      </div>
                      <div className={checks.lowercase ? "text-emerald-400" : ""}>
                        ✓ One lowercase letter  
                      </div>
                      <div className={checks.number ? "text-emerald-400" : ""}>
                        ✓ One number
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    required
                    disabled={!token || loading}
                    className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 pl-11 pr-11 text-sm text-white placeholder:text-white/20 outline-none focus:border-brand-purple/50 transition-colors disabled:opacity-50"
                  />
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/40 transition-colors"
                    disabled={!token || loading}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!token || loading || password !== confirmPassword || score < 4}
                className="w-full py-3 bg-brand-purple hover:bg-brand-purple/80 disabled:bg-white/10 disabled:text-white/40 rounded-xl text-white font-semibold text-sm transition-all shadow-glow-sm"
              >
                {loading ? "Resetting..." : "Reset Password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050816] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}