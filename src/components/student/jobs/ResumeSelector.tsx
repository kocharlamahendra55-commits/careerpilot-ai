"use client";

import { useId } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Upload } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { AnalyzedResume } from "@/features/student-jobs/use-analyzed-resumes";

export interface ResumeSelectorProps {
  readonly resumes: readonly AnalyzedResume[];
  /** The currently selected resume id, or null when none is chosen yet. */
  readonly selectedId: string | null;
  readonly onSelect: (resumeId: string) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

/**
 * Presentational chooser of ANALYZED resumes rendered as an accessible native
 * radio group (arrow-key navigable, single tab stop). Each option shows the
 * filename, a relative "analyzed" date, and the ATS score when present.
 *
 * When there are no analyzed resumes it renders a clear call to action linking
 * to `/dashboard/upload`; the parent ({@link "./ApplyPanel"}) reads the same
 * empty list to disable submission, so applying is not possible in that state.
 */
export function ResumeSelector({
  resumes,
  selectedId,
  onSelect,
  disabled = false,
  className,
}: ResumeSelectorProps) {
  const groupId = useId();
  const labelId = `${groupId}-label`;

  if (resumes.length === 0) {
    return (
      <div
        role="status"
        className={cn(
          "flex flex-col items-start gap-3 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-4",
          className
        )}
      >
        <p className="text-sm leading-6 text-white/60">
          You don&apos;t have an analyzed resume yet. Upload a resume and run the AI analysis to
          apply for this role.
        </p>
        <Link
          href="/dashboard/upload"
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          <Upload aria-hidden="true" size={14} strokeWidth={2} />
          Upload &amp; analyze a resume
        </Link>
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className={cn("flex flex-col gap-2", className)}
    >
      <p id={labelId} className="text-xs font-medium uppercase tracking-[0.12em] text-white/45">
        Choose a resume
      </p>

      {resumes.map((resume) => {
        const checked = resume.id === selectedId;
        return (
          <label
            key={resume.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-colors",
              checked
                ? "border-brand-purple/45 bg-brand-purple/12"
                : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <input
              type="radio"
              name={groupId}
              value={resume.id}
              checked={checked}
              disabled={disabled}
              onChange={() => onSelect(resume.id)}
              className="sr-only"
            />

            <span
              aria-hidden="true"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                checked
                  ? "border-brand-purple/40 bg-brand-purple/20 text-brand-purple-light"
                  : "border-white/10 bg-white/5 text-white/40"
              )}
            >
              {checked ? <CheckCircle2 size={16} /> : <FileText size={16} />}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white/85">
                {resume.filename}
              </span>
              <span className="mt-0.5 block text-xs text-white/40">
                Analyzed {formatRelativeDate(resume.createdAt)}
              </span>
            </span>

            {resume.atsScore !== null ? (
              <Badge variant={atsBadgeVariant(resume.atsScore)} className="shrink-0">
                ATS {Math.round(resume.atsScore)}
              </Badge>
            ) : null}
          </label>
        );
      })}
    </div>
  );
}

function atsBadgeVariant(score: number): "green" | "yellow" | "red" {
  if (score >= 75) return "green";
  if (score >= 55) return "yellow";
  return "red";
}
