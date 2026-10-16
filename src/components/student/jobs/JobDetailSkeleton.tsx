"use client";

import { useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface JobDetailSkeletonProps {
  readonly className?: string;
}

/**
 * Loading placeholder shaped like the job-detail page: a header block (avatar +
 * title/company + meta rows), a description block, a requirements chip row, and
 * an apply block. Decorative and hidden from assistive tech; the page owns the
 * single polite "loading" announcement. Honors reduced-motion (no shimmer).
 */
export function JobDetailSkeleton({ className }: JobDetailSkeletonProps) {
  const shouldReduceMotion = useReducedMotion();
  const shimmer = shouldReduceMotion ? { animation: "none" } : undefined;

  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading job"
      className={cn("space-y-6", className)}
    >
      {/* Header */}
      <Card aria-hidden="true" className="motion-reduce:transition-none">
        <div className="flex items-start gap-4">
          <div className="skeleton h-14 w-14 shrink-0 rounded-2xl" style={shimmer} />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="skeleton h-6 w-2/3 rounded-md" style={shimmer} />
            <div className="skeleton h-4 w-2/5 rounded-md" style={shimmer} />
            <div className="flex flex-wrap gap-3 pt-1">
              <div className="skeleton h-4 w-28 rounded-md" style={shimmer} />
              <div className="skeleton h-4 w-24 rounded-md" style={shimmer} />
              <div className="skeleton h-4 w-20 rounded-md" style={shimmer} />
            </div>
          </div>
        </div>
      </Card>

      {/* Description */}
      <Card aria-hidden="true" className="motion-reduce:transition-none">
        <div className="space-y-3">
          <div className="skeleton h-5 w-40 rounded-md" style={shimmer} />
          <div className="skeleton h-4 w-full rounded-md" style={shimmer} />
          <div className="skeleton h-4 w-full rounded-md" style={shimmer} />
          <div className="skeleton h-4 w-11/12 rounded-md" style={shimmer} />
          <div className="skeleton h-4 w-3/4 rounded-md" style={shimmer} />
        </div>
      </Card>

      {/* Requirements */}
      <Card aria-hidden="true" className="motion-reduce:transition-none">
        <div className="space-y-3">
          <div className="skeleton h-5 w-36 rounded-md" style={shimmer} />
          <div className="flex flex-wrap gap-2">
            <div className="skeleton h-6 w-20 rounded-md" style={shimmer} />
            <div className="skeleton h-6 w-24 rounded-md" style={shimmer} />
            <div className="skeleton h-6 w-16 rounded-md" style={shimmer} />
            <div className="skeleton h-6 w-24 rounded-md" style={shimmer} />
          </div>
        </div>
      </Card>

      {/* Apply */}
      <Card aria-hidden="true" className="motion-reduce:transition-none">
        <div className="space-y-3">
          <div className="skeleton h-4 w-2/3 rounded-md" style={shimmer} />
          <div className="skeleton h-10 w-40 rounded-xl" style={shimmer} />
        </div>
      </Card>

      <span className="sr-only">Loading job</span>
    </section>
  );
}
