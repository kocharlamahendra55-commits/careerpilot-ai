"use client";

import { useId } from "react";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { UnavailabilityIndicator } from "./UnavailabilityIndicator";
import type { CandidateProfileResumeSection } from "@/features/recruiter-workspace/candidate-profile-projection";

export interface ResumeSectionProps {
  /** The source-backed resume projection for this application. */
  resume: CandidateProfileResumeSection;
  className?: string;
}

/**
 * Renders the source-backed resume. A missing resume becomes a scoped Empty
 * State; a present resume shows the exact filename and its original text as
 * escaped plain text (no HTML interpretation, never `dangerouslySetInnerHTML`).
 */
export function ResumeSection({ resume, className }: ResumeSectionProps) {
  const headingId = useId();

  if (resume.status === "empty") {
    return (
      <section aria-labelledby={headingId} className={cn("w-full", className)}>
        <h2 id={headingId} className="sr-only">
          Resume
        </h2>
        <EmptyState
          icon={FileText}
          title="No resume on file"
          description="This application did not include a resume, so there is no resume content to display."
        />
      </section>
    );
  }

  return (
    <Card
      aria-labelledby={headingId}
      className={cn("space-y-4 motion-reduce:transition-none", className)}
    >
      <div className="flex items-center gap-2.5">
        <FileText aria-hidden="true" size={18} strokeWidth={2} className="shrink-0 text-brand-cyan-light" />
        <h2 id={headingId} className="text-base font-semibold tracking-tight text-white">
          Resume
        </h2>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/40">Filename</p>
        <div className="mt-1.5 min-w-0">
          {resume.filename.available ? (
            <span className="break-words text-sm text-white/80">{resume.filename.text}</span>
          ) : (
            <UnavailabilityIndicator message="No resume filename was returned for this application." />
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/40">Original text</p>
        <div className="mt-1.5 min-w-0">
          {resume.originalText.available ? (
            <pre
              tabIndex={0}
              role="region"
              aria-label="Resume original text"
              className="max-h-96 w-full overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/25 p-3.5 font-sans text-sm leading-6 text-white/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]"
            >
              {resume.originalText.text}
            </pre>
          ) : (
            <UnavailabilityIndicator message="The original resume text was not returned for this application." />
          )}
        </div>
      </div>
    </Card>
  );
}
