"use client";

import { useId } from "react";
import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { UnavailabilityIndicator } from "./UnavailabilityIndicator";
import type { CandidateProfileTimeline } from "@/features/recruiter-workspace/candidate-profile-projection";

export interface ApplicationTimelineProps {
  /** The source-backed timeline projection for this application. */
  timeline: CandidateProfileTimeline;
  className?: string;
}

function formatAppliedDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

/**
 * Renders the single source-backed "Applied" event derived only from the
 * application creation date. No other events are synthesized: the detail
 * endpoint exposes no extended status history (see the D4 markers elsewhere).
 */
export function ApplicationTimeline({ timeline, className }: ApplicationTimelineProps) {
  const headingId = useId();
  const applied = timeline.applied;

  return (
    <Card
      aria-labelledby={headingId}
      className={cn("space-y-4 motion-reduce:transition-none", className)}
    >
      <div className="flex items-center gap-2.5">
        <CalendarClock aria-hidden="true" size={18} strokeWidth={2} className="shrink-0 text-brand-cyan-light" />
        <h2 id={headingId} className="text-base font-semibold tracking-tight text-white">
          Application timeline
        </h2>
      </div>

      <ol className="relative space-y-4 border-l border-white/10 pl-5">
        <li className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[1.6rem] top-1 flex h-3 w-3 items-center justify-center rounded-full border border-brand-purple/50 bg-brand-purple/30"
          />
          <p className="text-sm font-semibold text-white/85">Applied</p>
          <div className="mt-1 min-w-0">
            {applied.available ? (
              <time dateTime={applied.iso} className="text-sm text-white/65">
                {formatAppliedDate(applied.timestamp)}
              </time>
            ) : (
              <UnavailabilityIndicator message="No application date was returned for this application." />
            )}
          </div>
        </li>
      </ol>
    </Card>
  );
}
