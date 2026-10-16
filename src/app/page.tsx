"use client";
import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Zap, ChevronRight, Star, ArrowRight, CheckCircle2, Shield,
  BrainCircuit, Target, TrendingUp, FileText, Users, Award,
  BarChart3, BookOpen, Map, MessageSquare, Briefcase, Sparkles,
  Upload, Clock, GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Navbar } from "@/components/layout/Navbar";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { ProgressBar } from "@/components/ui/ProgressBar";

/* ── Animation Variants ──────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
} as const satisfies import("framer-motion").Variants;

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ── Statistics Data ─────────────────────────────────────── */
const stats = [
  { value: "50K+", label: "Resumes Analyzed" },
  { value: "92%", label: "ATS Pass Rate" },
  { value: "3.2x", label: "Interview Callbacks" },
  { value: "180+", label: "Countries Served" },
];

/* ── Features Data ───────────────────────────────────────── */
const features = [
  {
    icon: Target,
    title: "ATS Score Analysis",
    description: "Get a real-time compatibility score. Our AI checks formatting, keywords, and structure to make sure your resume passes every applicant tracking system.",
    color: "from-purple-500/20 to-purple-600/5",
    iconColor: "text-brand-purple-light",
    badge: "Core",
  },
  {
    icon: BrainCircuit,
    title: "AI-Powered Improvements",
    description: "Our AI provides specific, actionable suggestions to upgrade your bullet points, remove weak phrasing, and inject high-impact action verbs.",
    color: "from-cyan-500/20 to-cyan-600/5",
    iconColor: "text-brand-cyan-light",
    badge: "AI",
  },
  {
    icon: Briefcase,
    title: "Job Description Matcher",
    description: "Paste any job description and instantly see your match percentage, what keywords are missing, and a tailored action plan to close the gap.",
    color: "from-pink-500/20 to-pink-600/5",
    iconColor: "text-pink-400",
    badge: "Popular",
  },
  {
    icon: Map,
    title: "Career Roadmap Generator",
    description: "Get a personalized 6-month career transition plan with milestone-based learning phases, hands-on projects, and skills to master.",
    color: "from-emerald-500/20 to-emerald-600/5",
    iconColor: "text-emerald-400",
    badge: "Unique",
  },
  {
    icon: BookOpen,
    title: "Skill Gap & Courses",
    description: "Identify exactly which skills are missing for your dream role and get curated course recommendations from Udemy, Coursera, and Educative.",
    color: "from-yellow-500/20 to-yellow-600/5",
    iconColor: "text-yellow-400",
    badge: "Learning",
  },
  {
    icon: MessageSquare,
    title: "Interview Prep Engine",
    description: "Generate custom interview questions with STAR-method sample answers, tailored to your specific resume and target job description.",
    color: "from-indigo-500/20 to-indigo-600/5",
    iconColor: "text-indigo-400",
    badge: "Prep",
  },
];

/* ── Process Steps ───────────────────────────────────────── */
const steps = [
  { step: "01", title: "Upload Your Resume", desc: "Upload PDF or DOCX — our parser extracts every detail instantly.", icon: Upload },
  { step: "02", title: "AI Deep Analysis", desc: "AI analyzes ATS compatibility, tone, keywords, and structure.", icon: BrainCircuit },
  { step: "03", title: "Review Insights", desc: "View your score breakdown, strengths, weaknesses, and improvements.", icon: BarChart3 },
  { step: "04", title: "Apply & Succeed", desc: "Download an optimized resume and land interviews with confidence.", icon: Award },
];

/* ── Pricing Plans ───────────────────────────────────────── */
const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "Perfect for exploring CareerPilot AI capabilities.",
    features: ["3 Resume Analyses / month", "ATS Score", "Basic Suggestions", "Job Match (1 JD)"],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/month",
    description: "Everything you need to supercharge your job search.",
    features: [
      "Unlimited Analyses",
      "Full ATS Report",
      "AI Rewrites",
      "Unlimited Job Matching",
      "Career Roadmap",
      "Interview Prep",
      "Skill Gap + Courses",
      "PDF Export",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$49",
    period: "/month",
    description: "For teams, bootcamps, and career centers.",
    features: [
      "Everything in Pro",
      "Bulk Resume Analysis",
      "Admin Dashboard",
      "Analytics & Reports",
      "API Access",
      "Priority Support",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

/* ── FAQ ─────────────────────────────────────────────────── */
const faqs = [
  { q: "What file formats are supported?", a: "CareerPilot AI supports PDF and DOCX resume uploads. For best results, use a standard single-column PDF format." },
  { q: "How accurate is the ATS score?", a: "Our AI is trained on ATS patterns from the top 50 applicant tracking systems used by Fortune 500 companies. Scores are highly accurate." },
  { q: "Do I need an API key?", a: "No — CareerPilot AI includes a pre-configured AI backend powered by OpenRouter. If you are self-hosting, set your own OPENROUTER_API_KEY in .env.local." },
  { q: "Can I use it for any industry?", a: "Yes. CareerPilot AI works for all professional roles including Tech, Finance, Healthcare, Marketing, Design, and more." },
  { q: "Is my resume data secure?", a: "Absolutely. All files are processed in-memory and never stored permanently without your consent. Your data belongs to you." },
];

/* ── Testimonials ────────────────────────────────────────── */
const testimonials = [
  {
    name: "Priya Sharma",
    role: "Software Engineer @ Google",
    avatar: "PS",
    text: "CareerPilot AI helped me go from a 52 ATS score to 91. Three weeks later I had interviews at Google, Meta, and Amazon. This tool is unreal.",
    stars: 5,
  },
  {
    name: "Marcus Johnson",
    role: "Product Manager @ Stripe",
    avatar: "MJ",
    text: "The Job Matcher feature alone is worth it. It told me exactly which keywords I was missing and I tailored my resume in 20 minutes. Got a callback the next day.",
    stars: 5,
  },
  {
    name: "Aanya Kapoor",
    role: "Data Scientist @ Microsoft",
    avatar: "AK",
    text: "The career roadmap is incredible — it's like having a personal mentor who maps out exactly what to study and build. I followed it for 4 months and it worked.",
    stars: 5,
  },
];

/* ── Company Logos ───────────────────────────────────────── */
const companies = ["Google", "Microsoft", "Amazon", "Meta", "Stripe", "Airbnb", "Netflix", "Apple"];

/* ══════════════════════════════════════════════════════════ */
/*   LANDING PAGE COMPONENT                                   */
/* ══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="aurora-bg min-h-screen text-white">
      {/* Floating blobs */}
      <div className="blob blob-1 top-[-100px] left-[-100px]" />
      <div className="blob blob-2 top-[300px] right-[-50px]" />
      <div className="blob blob-3 bottom-[200px] left-[30%]" />

      <Navbar />

      {/* ── HERO ──────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-6 overflow-hidden">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Announcement Badge */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-purple/30 bg-brand-purple/10 text-brand-purple-light text-sm font-medium mb-8">
              <Sparkles size={14} className="text-yellow-400" />
              Powered by OpenRouter AI · Now Live
              <span className="badge-green py-0.5 px-2 rounded-full text-xs">New</span>
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6"
          >
            Your Resume,{" "}
            <span className="gradient-text">Supercharged</span>
            <br />
            by AI Intelligence
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Upload your resume and let AI analyze every detail — ATS compatibility,
            skill gaps, keyword optimization, career roadmaps, and tailored interview prep. All in seconds.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible" custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link href="/auth/select-role">
              <Button size="xl" className="group shadow-glow-purple">
                Get Started Free
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/#features">
              <Button variant="secondary" size="xl">
                See Features
              </Button>
            </Link>
          </motion.div>

          {/* Trust Line */}
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={4}
            className="text-xs text-white/25 flex items-center justify-center gap-2"
          >
            <Shield size={12} />
            No account required · Free forever plan · Your data stays private
          </motion.p>
        </motion.div>

        {/* Hero Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="relative z-10 max-w-5xl mx-auto mt-16 px-6"
        >
          <div className="glass-card gradient-border overflow-hidden">
            {/* Mock browser bar */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-white/2">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <div className="flex-1 mx-4 bg-white/5 rounded-full px-3 py-1 text-xs text-white/30">
                careerpilot.ai/dashboard
              </div>
            </div>

            {/* Mock Dashboard Content */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Score Overview */}
              <div className="md:col-span-1 glass-card !bg-white/2 p-5 flex flex-col items-center gap-4">
                <p className="text-xs text-white/40 uppercase tracking-widest">Overall ATS Score</p>
                <ScoreRing score={82} size={110} label="ATS" />
                <div className="w-full space-y-3">
                  <ProgressBar value={88} label="Formatting" height={5} />
                  <ProgressBar value={75} label="Keywords" height={5} />
                  <ProgressBar value={82} label="Experience" height={5} />
                </div>
              </div>

              {/* Skill Gap */}
              <div className="md:col-span-2 space-y-3">
                <div className="glass-card !bg-white/2 p-4">
                  <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Skill Gap Analysis</p>
                  <div className="flex flex-wrap gap-2">
                    {["Docker", "Kubernetes", "GraphQL", "Redis", "System Design"].map((s) => (
                      <span key={s} className="badge-red text-xs">{s}</span>
                    ))}
                    {["React", "Node.js", "TypeScript", "REST APIs"].map((s) => (
                      <span key={s} className="badge-green text-xs">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="glass-card !bg-white/2 p-4">
                  <p className="text-xs text-white/40 uppercase tracking-widest mb-3">AI Suggestions</p>
                  <div className="space-y-2">
                    {[
                      "Add 'Architected' instead of 'Built' for Senior roles",
                      "Missing cloud infrastructure keywords for DevOps roles",
                      "Quantify impact: add specific metrics to bullet points",
                    ].map((s, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                        <Sparkles size={12} className="text-yellow-400 mt-0.5 shrink-0" />
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── STATS ─────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className="text-center"
            >
              <div className="text-4xl font-black gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-white/40">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── COMPANY LOGOS ─────────────────────────────────── */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs text-white/25 uppercase tracking-widest mb-6">
            Used by professionals landing roles at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {companies.map((company) => (
              <span key={company} className="text-white/20 font-bold text-sm tracking-wide hover:text-white/40 transition-colors cursor-default">
                {company}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider mx-6" />

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp}>
              <Badge variant="purple" className="mb-4">Platform Features</Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black mb-4">
              Everything You Need to{" "}
              <span className="gradient-text">Land the Role</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/50 max-w-xl mx-auto">
              A complete AI-powered career intelligence platform — from raw resume to interview ready.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                custom={i}
                className="glass-card group cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon size={20} className={feature.iconColor} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                  <Badge variant="gray" className="text-[10px]">{feature.badge}</Badge>
                </div>
                <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp}>
              <Badge variant="cyan" className="mb-4">How It Works</Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black mb-4">
              From Upload to{" "}
              <span className="gradient-text-cyan">Offer Letter</span>
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-brand-purple/40 to-transparent" />
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="flex flex-col items-center text-center relative"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-purple/30 to-brand-indigo/20 border border-brand-purple/30 flex items-center justify-center mb-4 relative z-10">
                  <step.icon size={24} className="text-brand-purple-light" />
                </div>
                <span className="text-4xl font-black text-brand-purple/20 -mt-2 mb-1">{step.step}</span>
                <h3 className="text-sm font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider mx-6" />

      {/* ── ATS DEMO ──────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="glass-card gradient-border grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
          >
            <motion.div variants={fadeUp}>
              <Badge variant="purple" className="mb-4">Live ATS Demo</Badge>
              <h2 className="text-3xl font-black mb-4">
                See Your Score <span className="gradient-text-purple">Before They Do</span>
              </h2>
              <p className="text-white/50 text-sm mb-6 leading-relaxed">
                Our ATS engine checks 12 critical resume factors that recruiters' software evaluates in under 10 seconds.
                Know your score before submitting.
              </p>
              <div className="space-y-4">
                {[
                  { label: "Keyword Relevance", value: 82 },
                  { label: "Formatting Compatibility", value: 91 },
                  { label: "Impact Verb Usage", value: 67 },
                  { label: "Education Relevance", value: 88 },
                ].map((item) => (
                  <ProgressBar key={item.label} value={item.value} label={item.label} />
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-col items-center gap-4">
              <ScoreRing score={82} size={160} label="ATS Score" />
              <div className="flex gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">91</div>
                  <div className="text-xs text-white/40">Formatting</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">67</div>
                  <div className="text-xs text-white/40">Keywords</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-purple-light">88</div>
                  <div className="text-xs text-white/40">Education</div>
                </div>
              </div>
              <Link href="/auth/select-role">
                <Button size="md" className="mt-2">
                  Get My Free Score <ArrowRight size={16} />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp}><Badge variant="green" className="mb-4">Success Stories</Badge></motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl font-black mb-4">
              Real People, <span className="gradient-text">Real Results</span>
            </motion.h2>
          </motion.div>
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            {testimonials.map((t, i) => (
              <motion.div key={t.name} variants={fadeUp} custom={i} className="glass-card flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {[...Array(t.stars)].map((_, j) => (
                    <Star key={j} size={14} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-white/70 leading-relaxed flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-white/40">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp}><Badge variant="yellow" className="mb-4">Pricing</Badge></motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl font-black mb-4">
              Simple, <span className="gradient-text">Transparent Pricing</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/50">No hidden fees. Cancel anytime.</motion.p>
          </motion.div>
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start"
          >
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                custom={i}
                className={`glass-card relative ${plan.highlighted ? "gradient-border ring-1 ring-brand-purple/30" : ""}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="purple" className="shadow-glow-sm">Most Popular</Badge>
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="text-base font-semibold text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-black ${plan.highlighted ? "gradient-text" : "text-white"}`}>
                      {plan.price}
                    </span>
                    <span className="text-white/40 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-xs text-white/40 mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                      <CheckCircle2 size={14} className="text-brand-purple-light shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/select-role">
                  <Button
                    variant={plan.highlighted ? "primary" : "secondary"}
                    size="md"
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp}><Badge variant="gray" className="mb-4">FAQ</Badge></motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl font-black mb-4">
              Frequently Asked <span className="gradient-text">Questions</span>
            </motion.h2>
          </motion.div>
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="space-y-3"
          >
            {faqs.map((faq, i) => (
              <motion.div key={i} variants={fadeUp} custom={i} className="glass-card">
                <h3 className="text-sm font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card gradient-border py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-indigo flex items-center justify-center mx-auto mb-6 shadow-glow-purple">
              <Zap size={28} className="text-white" />
            </div>
            <h2 className="text-4xl font-black mb-4">
              Ready to Land Your <span className="gradient-text">Dream Job?</span>
            </h2>
            <p className="text-white/50 mb-8 max-w-md mx-auto">
              Join 50,000+ professionals who have used CareerPilot AI to transform their resumes and careers.
            </p>
            <Link href="/auth/select-role">
              <Button size="xl" className="shadow-glow-purple">
                Start Analyzing Free <ArrowRight size={18} />
              </Button>
            </Link>
            <p className="text-xs text-white/25 mt-4">No credit card required</p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-purple to-brand-indigo flex items-center justify-center">
                <Zap size={13} className="text-white" />
              </div>
              <span className="font-bold text-white">
                Career<span className="text-brand-purple-light">Pilot</span> AI
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/40">
              <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
              <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              <Link href="/admin" className="hover:text-white transition-colors">Admin</Link>
            </div>
          </div>
          <div className="section-divider mb-8" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/25">© 2025 CareerPilot AI. Final Year Engineering Project. All rights reserved.</p>
            <p className="text-xs text-white/20">Powered by Next.js 15 · OpenRouter AI · DeepSeek V3</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
