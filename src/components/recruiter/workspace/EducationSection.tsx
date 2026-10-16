"use client";

import { useId } from "react";
import { GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { UnavailabilityIndicator } from "./UnavailabilityIndicator";
import type { CandidateProfileEducation } from "@/features/recruiter-workspace/candidate-profile-projection";

export interface EducationSectionProps {
  /** The source-backed education projection for this application. */
  education: CandidateProfileEducation;
  className?: string;
}

/**
 * Renders the candidate's source-backed education. Each field is shown only
 * when the detail response provided it; an absent college or degree shows its
 * own unavailability marker instead of a fabricated value.
 */
export function EducationSection({ education, className }: EducationSectionProps) {
  const headingId = useId();

  return (
    <Card
      aria-labelledby={headingId}
      className={cn("space-y-4 motion-reduce:transition-none", className)}
    >
      <div className="flex items-center gap-2.5">
        <GraduationCap aria-hidden="true" size={18} strokeWidth={2} className="shrink-0 text-brand-cyan-light" />
        <h2 id={headingId} className="text-base font-semibold tracking-tight text-white">
          Education
        </h2>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-[0.12em] text-white/40">College</dt>
          <dd className="mt-1.5 min-w-0">
            {education.college.available ? (
              <span className="break-words text-sm text-white/80">{education.college.text}</span>
            ) : (
              <UnavailabilityIndicator message="No college was returned for this candidate." />
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-[0.12em] text-white/40">Degree</dt>
          <dd className="mt-1.5 min-w-0">
            {education.degree.available ? (
              <span className="break-words text-sm text-white/80">{education.degree.text}</span>
            ) : (
              <UnavailabilityIndicator message="No degree was returned for this candidate." />
            )}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
