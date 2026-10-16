"use client";

import { useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface JobCardSkeletonProps {
  readonly className?: string;
}

/**
 * Loading placeholder shaped like {@link JobCard} (avatar + title/company lines,
 * two meta rows, and a full-width CTA block). It is decorative and hidden from
 * assistive tech (`aria-hidden`); the browse page owns the single polite
 * "loading" announcement. Honors reduced-motion by disabling the shimmer.
 */
export function JobCardSkeleton({ className }: JobCardSkeletonProps) {
  const shouldReduceMotion = useReducedMotion();
  const shimmerStyle = shouldReduceMotion ? { animation: "none" } : undefined;

  return (
    <Card
      variant="flat"
      aria-hidden="true"
      aria-busy="true"
      className={cn("flex h-full flex-col gap-4 motion-reduce:transition-none", className)}
    >
      <div className="flex items-start gap-3">
        <div className="skeleton h-11 w-11 shrink-0 rounded-xl" style={shimmerStyle} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded-md" style={shimmerStyle} />
          <div className="skeleton h-3 w-1/2 rounded-md" style={shimmerStyle} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="skeleton h-3 w-2/3 rounded-md" style={shimmerStyle} />
        <div className="skeleton h-3 w-1/3 rounded-md" style={shimmerStyle} />
      </div>

      <div className="mt-auto pt-2">
        <div className="skeleton h-8 w-full rounded-xl" style={shimmerStyle} />
      </div>
    </Card>
  );
}
