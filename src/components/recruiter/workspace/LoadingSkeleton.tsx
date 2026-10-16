"use client";

import type { ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export type LoadingSkeletonVariant = "card" | "form" | "list" | "profile" | "table";

export interface LoadingSkeletonProps {
  /** The region being loaded, for example "jobs table" or "candidate profile". */
  label: string;
  variant?: LoadingSkeletonVariant;
  rows?: number;
  className?: string;
}

function SkeletonBlock({
  className,
  reduceMotion,
}: {
  className: string;
  reduceMotion: boolean | null;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton", className)}
      style={reduceMotion ? { animation: "none" } : undefined}
    />
  );
}

function SkeletonRows({ count, reduceMotion }: { count: number; reduceMotion: boolean | null }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBlock
          key={index}
          reduceMotion={reduceMotion}
          className="h-12 w-full rounded-xl"
        />
      ))}
    </div>
  );
}

/**
 * Region-shaped loading placeholder. The global skeleton styling supplies the
 * dark-mode shimmer; reduced-motion users receive the same layout without shimmer.
 */
export function LoadingSkeleton({
  label,
  variant = "card",
  rows = 3,
  className,
}: LoadingSkeletonProps) {
  const shouldReduceMotion = useReducedMotion();
  const requestedRows = Number.isFinite(rows) ? Math.floor(rows) : 3;
  const rowCount = Math.min(Math.max(requestedRows, 1), 8);
  const loadingName = `Loading ${label}`;

  let content: ReactNode;

  switch (variant) {
    case "form":
      content = (
        <div className="space-y-5">
          <SkeletonBlock reduceMotion={shouldReduceMotion} className="h-6 w-44" />
          {Array.from({ length: rowCount }, (_, index) => (
            <div key={index} className="space-y-2">
              <SkeletonBlock reduceMotion={shouldReduceMotion} className="h-3 w-28" />
              <SkeletonBlock
                reduceMotion={shouldReduceMotion}
                className={cn("w-full rounded-xl", index === rowCount - 1 ? "h-28" : "h-11")}
              />
            </div>
          ))}
        </div>
      );
      break;
    case "profile":
      content = (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <SkeletonBlock reduceMotion={shouldReduceMotion} className="h-14 w-14 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBlock reduceMotion={shouldReduceMotion} className="h-5 w-48 max-w-full" />
              <SkeletonBlock reduceMotion={shouldReduceMotion} className="h-3 w-32" />
            </div>
          </div>
          <SkeletonRows count={rowCount} reduceMotion={shouldReduceMotion} />
        </div>
      );
      break;
    case "table":
      content = (
        <div className="space-y-3">
          <div className="hidden grid-cols-6 gap-3 sm:grid">
            {Array.from({ length: 6 }, (_, index) => (
              <SkeletonBlock key={index} reduceMotion={shouldReduceMotion} className="h-3 w-full" />
            ))}
          </div>
          <SkeletonRows count={rowCount} reduceMotion={shouldReduceMotion} />
        </div>
      );
      break;
    case "list":
      content = <SkeletonRows count={rowCount} reduceMotion={shouldReduceMotion} />;
      break;
    case "card":
    default:
      content = (
        <div className="space-y-4">
          <SkeletonBlock reduceMotion={shouldReduceMotion} className="h-6 w-2/5 max-w-full" />
          <SkeletonBlock reduceMotion={shouldReduceMotion} className="h-4 w-full" />
          <SkeletonBlock reduceMotion={shouldReduceMotion} className="h-4 w-4/5 max-w-full" />
          <SkeletonBlock reduceMotion={shouldReduceMotion} className="h-28 w-full rounded-xl" />
        </div>
      );
  }

  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={loadingName}
      className={cn("w-full", className)}
    >
      <Card variant="flat" aria-hidden="true" className="motion-reduce:transition-none">
        {content}
      </Card>
      <span className="sr-only">{loadingName}</span>
    </section>
  );
}
