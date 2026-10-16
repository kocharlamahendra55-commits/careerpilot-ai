"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, LayoutDashboard, Upload, FileText, Briefcase,
  Map, BookOpen, MessageSquare, Settings, ChevronLeft,
  ChevronRight, Shield, BarChart3, Bell, User, LogOut, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";

const navSections = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Upload Resume", href: "/dashboard/upload", icon: Upload, badge: "New" },
      { label: "My Resumes", href: "/dashboard/resumes", icon: FileText },
    ],
  },
  {
    label: "Jobs",
    items: [
      { label: "Browse Jobs", href: "/dashboard/jobs", icon: Search },
    ],
  },
  {
    label: "AI Tools",
    items: [
      { label: "Job Matcher", href: "/dashboard/job-match", icon: Briefcase },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Admin Panel", href: "/admin", icon: Shield },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  defaultCollapsed?: boolean;
}

export function Sidebar({ defaultCollapsed = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "ADMIN";

  // Only ADMIN users see the "Admin Panel" (/admin) item; all other links stay visible.
  const visibleSections = navSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.href !== "/admin" || isAdmin),
  }));

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);


  return (
    <motion.aside
      animate={{ width: collapsed ? 70 : 240 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="glass-sidebar h-screen sticky top-0 flex flex-col overflow-hidden shrink-0 z-30"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-purple to-brand-indigo flex items-center justify-center shrink-0 shadow-glow-sm">
          <Zap size={15} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="font-bold text-white whitespace-nowrap overflow-hidden"
            >
              Career<span className="text-brand-purple-light">Pilot</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {visibleSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold px-3 mb-2">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ x: collapsed ? 0 : 2 }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group relative",
                        active
                          ? "bg-brand-purple/20 border border-brand-purple/30 text-white"
                          : "text-white/50 hover:bg-white/5 hover:text-white/80"
                      )}
                    >
                      {active && (
                        <motion.div
                          layoutId="active-indicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-purple rounded-r-full"
                        />
                      )}
                      <item.icon
                        size={18}
                        className={cn(
                          "shrink-0 transition-colors",
                          active ? "text-brand-purple-light" : "text-white/40 group-hover:text-white/70"
                        )}
                      />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-sm font-medium whitespace-nowrap flex-1"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {!collapsed && item.badge && (
                        <Badge variant="purple" className="text-[10px] py-0.5 px-1.5">
                          {item.badge}
                        </Badge>
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile + collapse toggle */}
      <div className="border-t border-white/5 p-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center shrink-0">
              <User size={14} className="text-white" />
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-medium text-white/80 truncate">{user?.name || "User"}</p>
              <p className="text-xs text-white/30 truncate">{user?.email || ""}</p>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              aria-label="Sign out"
              className="shrink-0 p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
