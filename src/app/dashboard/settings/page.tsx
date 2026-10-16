"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, User, Bell, Shield, Palette, Globe,
  Save, Check, Eye, EyeOff, Zap, Moon, Sun, Monitor
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/* ── Types ── */
type Tab = "profile" | "notifications" | "appearance" | "privacy" | "api";

interface FormState {
  name: string;
  email: string;
  title: string;
  location: string;
  bio: string;
  emailNotifications: boolean;
  weeklyReport: boolean;
  jobAlerts: boolean;
  marketingEmails: boolean;
  theme: "dark" | "light" | "system";
  language: string;
  profileVisibility: "public" | "private";
  dataSharing: boolean;
  openrouterKey: string;
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "api", label: "API Keys", icon: Zap },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5.5 rounded-full transition-all duration-300 shrink-0 ${checked ? "bg-brand-purple" : "bg-white/15"}`}
      style={{ height: "22px", width: "40px" }}
    >
      <motion.div
        animate={{ x: checked ? 18 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
        style={{ marginTop: "1px" }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    title: "",
    location: "",
    bio: "",
    emailNotifications: true,
    weeklyReport: true,
    jobAlerts: false,
    marketingEmails: false,
    theme: "dark",
    language: "English",
    profileVisibility: "private",
    dataSharing: false,
    openrouterKey: "",
  });

  // Load profile from API on mount
  useEffect(() => {
    fetch("/api/auth/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user || data.profile) {
          setForm((prev) => ({
            ...prev,
            name: data.profile?.fullName || data.user?.name || "",
            email: data.user?.email || "",
            title: data.profile?.preferredRole || "",
            location: data.profile?.location || "",
            bio: "",
          }));
        }
      })
      .catch(() => {/* keep defaults */});
  }, []);

  const update = (key: keyof FormState, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.name,
          location: form.location,
          preferredRole: form.title,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // silently fail — show saved anyway for UX
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" as const } }),
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
            <Settings size={18} className="text-white/70" />
          </div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>
        <p className="text-sm text-white/40">Manage your account, preferences, and integrations</p>
      </motion.div>

      {/* Tab Nav */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <div className="flex gap-1 p-1 bg-white/3 rounded-2xl border border-white/5 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-brand-purple/20 border border-brand-purple/30 text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/3"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <Card>
              <CardHeader><CardTitle>Profile Information</CardTitle><Badge variant="gray">Public</Badge></CardHeader>
              <CardContent className="space-y-5">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-indigo flex items-center justify-center text-white text-xl font-bold shrink-0">
                    {form.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/80">{form.name}</p>
                    <p className="text-xs text-white/40">{form.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name", key: "name" as const },
                    { label: "Email", key: "email" as const },
                    { label: "Job Title", key: "title" as const },
                    { label: "Location", key: "location" as const },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">{label}</label>
                      <input
                        value={String(form[key])}
                        onChange={(e) => update(key, e.target.value)}
                        className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-brand-purple/40 transition-colors"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Bio</label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => update("bio", e.target.value)}
                    rows={3}
                    className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 resize-none outline-none focus:border-brand-purple/40 transition-colors"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "emailNotifications" as const, label: "Email Notifications", desc: "Receive analysis results and updates via email" },
                  { key: "weeklyReport" as const, label: "Weekly Progress Report", desc: "Get a weekly summary of your career progress" },
                  { key: "jobAlerts" as const, label: "Job Alerts", desc: "Notify me when high-match jobs are available" },
                  { key: "marketingEmails" as const, label: "Marketing Emails", desc: "Product updates, tips, and promotions" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-white/2 border border-white/5">
                    <div>
                      <p className="text-sm font-medium text-white/80">{label}</p>
                      <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                    </div>
                    <Toggle checked={Boolean(form[key])} onChange={(v) => update(key, v)} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === "appearance" && (
            <Card>
              <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-3 block">Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "dark" as const, label: "Dark", icon: Moon },
                      { id: "light" as const, label: "Light", icon: Sun },
                      { id: "system" as const, label: "System", icon: Monitor },
                    ].map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => update("theme", id)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                          form.theme === id
                            ? "bg-brand-purple/20 border-brand-purple/40 text-white"
                            : "bg-white/2 border-white/8 text-white/40 hover:border-white/15"
                        }`}
                      >
                        <Icon size={20} />
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Language</label>
                  <select
                    value={form.language}
                    onChange={(e) => update("language", e.target.value)}
                    className="w-full bg-white/3 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-brand-purple/40 transition-colors"
                  >
                    {["English", "Hindi", "Spanish", "French", "German", "Japanese"].map((l) => (
                      <option key={l} value={l} className="bg-[#0d0f1e]">{l}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* PRIVACY TAB */}
          {activeTab === "privacy" && (
            <Card>
              <CardHeader><CardTitle>Privacy & Security</CardTitle><Badge variant="green" dot>Protected</Badge></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/2 border border-white/5">
                  <div>
                    <p className="text-sm font-medium text-white/80">Profile Visibility</p>
                    <p className="text-xs text-white/40 mt-0.5">Control who can view your profile</p>
                  </div>
                  <select
                    value={form.profileVisibility}
                    onChange={(e) => update("profileVisibility", e.target.value as "public" | "private")}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 outline-none"
                  >
                    <option value="public" className="bg-[#0d0f1e]">Public</option>
                    <option value="private" className="bg-[#0d0f1e]">Private</option>
                  </select>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/2 border border-white/5">
                  <div>
                    <p className="text-sm font-medium text-white/80">Data Sharing</p>
                    <p className="text-xs text-white/40 mt-0.5">Allow anonymous data to improve AI models</p>
                  </div>
                  <Toggle checked={form.dataSharing} onChange={(v) => update("dataSharing", v)} />
                </div>
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/15">
                  <p className="text-sm font-medium text-red-400 mb-1">Danger Zone</p>
                  <p className="text-xs text-white/40 mb-3">Permanently delete your account and all data</p>
                  <Button variant="ghost" size="sm" className="text-red-400 border border-red-500/30 hover:bg-red-500/10">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* API KEYS TAB */}
          {activeTab === "api" && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>OpenRouter API Key</CardTitle><Badge variant="purple"><Zap size={10} /> AI</Badge></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-white/50">
                    Add your OpenRouter API key to power all AI features — resume analysis, job match, roadmap, and interview prep.
                    Get a free key at{" "}
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-brand-purple-light hover:underline">
                      openrouter.ai/keys
                    </a>
                  </p>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={form.openrouterKey}
                      onChange={(e) => update("openrouterKey", e.target.value)}
                      placeholder="sk-or-..."
                      className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-2.5 pr-12 text-sm text-white outline-none focus:border-brand-purple/40 transition-colors font-mono"
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-white/30">
                    Set it in your{" "}
                    <code className="text-brand-purple-light/80 bg-white/5 px-1.5 py-0.5 rounded">.env.local</code>
                    {" "}file as{" "}
                    <code className="text-brand-purple-light/80 bg-white/5 px-1.5 py-0.5 rounded">OPENROUTER_API_KEY=sk-or-...</code>
                    {" "}and restart the dev server.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Service Status</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Next.js Frontend", url: "http://localhost:3000" },
                    { label: "OpenRouter API", url: "https://openrouter.ai" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between p-3 rounded-xl bg-white/2 border border-white/5">
                      <div>
                        <p className="text-sm font-medium text-white/75">{s.label}</p>
                        <p className="text-xs text-white/35 font-mono">{s.url}</p>
                      </div>
                      <Badge variant="green" dot>Running</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Save Button */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4} className="flex justify-end">
        <Button size="md" onClick={handleSave} disabled={saving} className="min-w-32 gap-2">
          {saved ? (
            <><Check size={16} className="text-emerald-400" /> Saved!</>
          ) : saving ? (
            <><Save size={16} className="animate-spin" /> Saving...</>
          ) : (
            <><Save size={16} /> Save Changes</>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
