"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, LogOut, LayoutDashboard, Briefcase, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { label: "Jobs", href: "/recruiter/jobs", icon: Briefcase },
  { label: "Candidates", href: "/recruiter/candidates", icon: Users },
];

export function RecruiterHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/recruiter/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <header className="border-b border-white/6 bg-[#050816]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-purple to-brand-indigo flex items-center justify-center">
            <BrainCircuit size={15} className="text-white" />
          </div>
          <span className="text-white font-bold">Career<span className="text-brand-purple-light">Pilot</span></span>
          <span className="text-white/20 mx-1">|</span>
          <span className="text-sm text-white/50">Recruiter Portal</span>
        </div>

        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-200",
                  active
                    ? "bg-brand-purple/20 border border-brand-purple/30 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white/80"
                )}
              >
                <item.icon
                  size={14}
                  className={active ? "text-brand-purple-light" : "text-white/40"}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-white/40">
            {user?.profile && "companyName" in (user.profile as Record<string, string>)
              ? (user.profile as Record<string, string>).companyName
              : user?.email}
          </span>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-white/30 hover:text-red-400 transition-colors">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
