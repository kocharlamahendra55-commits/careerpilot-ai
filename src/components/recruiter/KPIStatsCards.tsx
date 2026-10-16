"use client";

import type { JSX } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  FileText,
  Star,
  type LucideIcon,
} from "lucide-react";
import { Card } from "../ui/Card";
import { StatsCard } from "../ui/StatsCard";
import type { HiringFunnelData } from "./HiringFunnel";

export interface RecruiterKpiData {
  activeJobs: number;
  draftJobs?: number | null;
  funnel: HiringFunnelData;
  applicationsTrend?: { value: number; label: string };
}

export interface KPIStatsCardsProps {
  data: RecruiterKpiData;
  loading?: boolean;
}

type KpiCardDefinition = {
  id: string;
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  animated?: boolean;
  trend?: { value: number; label: string };
};

const KPI_LABELS = [
  "Active Jobs",
  "Draft Jobs",
  "Applications",
  "Shortlisted",
  "Interviews",
  "Hired",
] as const;

function getApplicationTotal(funnel: HiringFunnelData): number {
  return (
    funnel.applied +
    funnel.shortlisted +
    funnel.interview +
    funnel.offered +
    funnel.hired +
    funnel.rejected
  );
}

function KPIStatsCardsSkeleton({
  shouldReduceMotion,
}: {
  shouldReduceMotion: boolean | null;
}): JSX.Element {
  return (
    <section
      aria-busy="true"
      aria-label="Loading recruitment key performance indicators"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {KPI_LABELS.map((label, index) => (
        <motion.div
          key={label}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.3,
            delay: shouldReduceMotion ? 0 : index * 0.05,
            ease: "easeOut",
          }}
        >
          <Card
            aria-busy="true"
            aria-label={`Loading ${label} statistic`}
            role="group"
            variant="stat"
          >
            <div aria-hidden="true" className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton mt-3 h-9 w-20" />
                <div className="skeleton mt-2 h-3 w-36" />
              </div>
              <div className="skeleton h-10 w-10 shrink-0 rounded-xl" />
            </div>
          </Card>
        </motion.div>
      ))}
    </section>
  );
}

export function KPIStatsCards({
  data,
  loading = false,
}: KPIStatsCardsProps): JSX.Element {
  const shouldReduceMotion = useReducedMotion();

  if (loading) {
    return <KPIStatsCardsSkeleton shouldReduceMotion={shouldReduceMotion} />;
  }

  const hasDraftJobs = data.draftJobs !== null && data.draftJobs !== undefined;
  const cards: readonly KpiCardDefinition[] = [
    {
      id: "active-jobs",
      title: "Active Jobs",
      value: data.activeJobs,
      description: "Open roles currently accepting candidates",
      icon: Briefcase,
      iconColor: "text-violet-300",
    },
    {
      id: "draft-jobs",
      title: "Draft Jobs",
      value: data.draftJobs ?? "—",
      description: hasDraftJobs
        ? "Jobs not yet published"
        : "Not reported by dashboard API",
      icon: Briefcase,
      iconColor: "text-purple-300",
      animated: hasDraftJobs,
    },
    {
      id: "applications",
      title: "Applications",
      value: getApplicationTotal(data.funnel),
      description: "Across all application statuses",
      icon: FileText,
      iconColor: "text-cyan-300",
      ...(data.applicationsTrend ? { trend: data.applicationsTrend } : {}),
    },
    {
      id: "shortlisted",
      title: "Shortlisted",
      value: data.funnel.shortlisted,
      description: "Candidates selected for review",
      icon: Star,
      iconColor: "text-sky-300",
    },
    {
      id: "interviews",
      title: "Interviews",
      value: data.funnel.interview,
      description: "In interview stage",
      icon: CalendarDays,
      iconColor: "text-amber-300",
    },
    {
      id: "hired",
      title: "Hired",
      value: data.funnel.hired,
      description: "Candidates hired",
      icon: BadgeCheck,
      iconColor: "text-emerald-300",
    },
  ];

  return (
    <section
      aria-label="Recruitment key performance indicators"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.3,
            delay: shouldReduceMotion ? 0 : index * 0.05,
            ease: "easeOut",
          }}
        >
          <StatsCard
            animated={card.animated}
            description={card.description}
            icon={card.icon}
            iconColor={card.iconColor}
            title={card.title}
            value={card.value}
            {...(card.trend ? { trend: card.trend } : {})}
          />
        </motion.div>
      ))}
    </section>
  );
}
