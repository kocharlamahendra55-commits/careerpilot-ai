"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HiringFunnelData {
  applied: number;
  shortlisted: number;
  interview: number;
  offered: number;
  hired: number;
  rejected: number;
}

export interface HiringFunnelProps {
  funnel: HiringFunnelData;
  loading?: boolean;
}

type RealStageKey = "applied" | "shortlisted" | "interview" | "offered" | "hired";

type FunnelStage =
  | {
      kind: "tracked";
      key: RealStageKey;
      label: string;
      accentClass: string;
      fillClass: string;
    }
  | {
      kind: "untracked";
      key: "screened";
      label: string;
    };

const FUNNEL_STAGES: readonly FunnelStage[] = [
  {
    kind: "tracked",
    key: "applied",
    label: "Applied",
    accentClass: "bg-violet-400 shadow-lg shadow-violet-500/30",
    fillClass: "from-violet-500 via-purple-500 to-fuchsia-400",
  },
  {
    kind: "untracked",
    key: "screened",
    label: "Screened",
  },
  {
    kind: "tracked",
    key: "shortlisted",
    label: "Shortlisted",
    accentClass: "bg-cyan-400 shadow-lg shadow-cyan-500/30",
    fillClass: "from-cyan-500 via-sky-500 to-blue-400",
  },
  {
    kind: "tracked",
    key: "interview",
    label: "Interview",
    accentClass: "bg-blue-400 shadow-lg shadow-blue-500/30",
    fillClass: "from-blue-500 via-indigo-500 to-violet-400",
  },
  {
    kind: "tracked",
    key: "offered",
    label: "Offer",
    accentClass: "bg-amber-400 shadow-lg shadow-amber-500/30",
    fillClass: "from-amber-500 via-orange-500 to-rose-400",
  },
  {
    kind: "tracked",
    key: "hired",
    label: "Hired",
    accentClass: "bg-emerald-400 shadow-lg shadow-emerald-500/30",
    fillClass: "from-emerald-500 via-teal-500 to-cyan-400",
  },
];

const SKELETON_WIDTHS = ["w-24", "w-28", "w-20", "w-24", "w-20", "w-24"] as const;
const candidateNumberFormatter = new Intl.NumberFormat("en-US");

function getBarWidth(count: number, appliedBaseline: number): number {
  return Math.min(Math.max((count / appliedBaseline) * 100, 0), 100);
}

function getConversionPercent(count: number, applied: number): number {
  return applied > 0 ? Math.round((count / applied) * 100) : 0;
}

function FunnelConnector() {
  return (
    <div className="flex h-5 items-center gap-2 pl-4 sm:pl-5" aria-hidden="true">
      <span className="h-px w-5 bg-gradient-to-r from-white/5 to-white/20" />
      <ArrowDown size={14} className="shrink-0 text-white/35" strokeWidth={1.75} />
      <span className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
    </div>
  );
}

function HiringFunnelSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading hiring funnel"
      className="w-full space-y-1.5"
    >
      {SKELETON_WIDTHS.map((labelWidth, index) => (
        <div
          key={index}
          className="rounded-xl border border-white/5 bg-white/[0.025] px-3.5 py-3.5 sm:px-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div className={cn("skeleton h-4", labelWidth)} />
            <div className="skeleton h-5 w-12" />
          </div>
          <div className="skeleton mt-3 h-2.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function HiringFunnel({ funnel, loading = false }: HiringFunnelProps) {
  const shouldReduceMotion = useReducedMotion();

  if (loading) {
    return <HiringFunnelSkeleton />;
  }

  // A non-zero baseline keeps zero-count funnels from producing NaN or Infinity.
  const appliedBaseline = Math.max(funnel.applied, 1);

  return (
    <section aria-label="Hiring pipeline" className="w-full">
      <div className="space-y-1.5">
        {FUNNEL_STAGES.map((stage, index) => {
          const isLastStage = index === FUNNEL_STAGES.length - 1;

          if (stage.kind === "untracked") {
            return (
              <div key={stage.key}>
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: shouldReduceMotion ? 0 : 0.32,
                    delay: shouldReduceMotion ? 0 : index * 0.06,
                    ease: "easeOut",
                  }}
                  className="rounded-xl border border-dashed border-white/10 bg-white/[0.018] px-3.5 py-3.5 sm:px-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/25 bg-white/10" />
                      <span className="text-sm font-medium text-white/65">{stage.label}</span>
                    </div>
                    <div
                      className="flex shrink-0 items-center gap-2 text-sm"
                      aria-label="Screened candidates are not tracked by the current API"
                    >
                      <span aria-hidden="true" className="font-semibold text-white/65">
                        —
                      </span>
                      <span
                        aria-hidden="true"
                        className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/45"
                      >
                        Not tracked
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-dashed border-white/10 bg-white/[0.025]" />
                </motion.div>
                {!isLastStage && <FunnelConnector />}
              </div>
            );
          }

          const count = funnel[stage.key];
          const barWidth = getBarWidth(count, appliedBaseline);
          const conversionPercent = getConversionPercent(count, funnel.applied);
          const formattedCount = candidateNumberFormatter.format(count);

          return (
            <div key={stage.key}>
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.32,
                  delay: shouldReduceMotion ? 0 : index * 0.06,
                  ease: "easeOut",
                }}
                className="rounded-xl border border-white/6 bg-white/[0.025] px-3.5 py-3.5 sm:px-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2.5 pt-0.5">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", stage.accentClass)} />
                    <span className="text-sm font-medium text-white/85">{stage.label}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className="block text-sm font-semibold tabular-nums text-white/90"
                      aria-label={`${formattedCount} candidates at ${stage.label} stage`}
                    >
                      {formattedCount}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-medium tabular-nums text-white/45">
                      {conversionPercent}% of Applied
                    </span>
                  </div>
                </div>

                <div
                  role="progressbar"
                  aria-label={`${stage.label} progress: ${conversionPercent}% of applied candidates`}
                  aria-valuemin={0}
                  aria-valuemax={appliedBaseline}
                  aria-valuenow={Math.min(Math.max(count, 0), appliedBaseline)}
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[0.055] ring-1 ring-inset ring-white/[0.045]"
                >
                  <motion.div
                    initial={
                      shouldReduceMotion
                        ? { width: `${barWidth}%`, opacity: 1 }
                        : { width: "0%", opacity: 0.55 }
                    }
                    animate={{ width: `${barWidth}%`, opacity: 1 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.72,
                      delay: shouldReduceMotion ? 0 : index * 0.06 + 0.1,
                      ease: "easeOut",
                    }}
                    className={cn("h-full rounded-full bg-gradient-to-r", stage.fillClass)}
                  />
                </div>
              </motion.div>
              {!isLastStage && <FunnelConnector />}
            </div>
          );
        })}
      </div>

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.28,
          delay: shouldReduceMotion ? 0 : FUNNEL_STAGES.length * 0.06,
          ease: "easeOut",
        }}
        className="mt-4 flex items-center justify-between border-t border-white/6 pt-3 text-sm"
      >
        <span className="text-white/45">Rejected candidates:</span>
        <span
          className="font-medium tabular-nums text-white/55"
          aria-label={`${candidateNumberFormatter.format(funnel.rejected)} rejected candidates`}
        >
          {candidateNumberFormatter.format(funnel.rejected)}
        </span>
      </motion.div>
    </section>
  );
}
