"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowRight, CheckCircle2, RefreshCw, Send } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ResumeSelector } from "@/components/student/jobs/ResumeSelector";
import { useAnalyzedResumes } from "@/features/student-jobs/use-analyzed-resumes";
import { submitApplication } from "@/features/student-jobs/apply";

export interface ApplyPanelProps {
  readonly jobId: string;
  /** Used only for accessible labels/copy. */
  readonly jobTitle?: string;
  /** Authoritative server-sourced application state for this job. */
  readonly hasApplied: boolean;
  /**
   * Called after a successful apply OR a 409 "already applied". The parent flips
   * `hasApplied` to true (source of truth) and updates the applied-store.
   */
  readonly onApplied: () => void;
  readonly className?: string;
}

/**
 * Apply experience for a single job.
 *
 * - Already applied → success state + a disabled apply control (no request is
 *   possible; duplicate prevention relies on this plus the server's 409).
 * - Otherwise → an Apply button reveals the {@link ResumeSelector} and a
 *   "Submit application" confirm. While submitting, all controls are disabled to
 *   prevent duplicate posts. On success (or 409) the parent is notified; other
 *   failures render a retryable `role="alert"`. Applying is disabled entirely
 *   when there are no analyzed resumes (the selector prompts an upload instead).
 */
export function ApplyPanel({
  jobId,
  jobTitle,
  hasApplied,
  onApplied,
  className,
}: ApplyPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const {
    phase: resumesPhase,
    analyzedResumes,
    errorMessage: resumesError,
    reload: reloadResumes,
  } = useAnalyzedResumes();

  const [revealed, setRevealed] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Defensive local mirror of success so the confirmation shows even if the
  // parent is slow to flip `hasApplied`.
  const [justApplied, setJustApplied] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Keep a valid preselection (most recent first) as the resume list resolves.
  useEffect(() => {
    if (analyzedResumes.length === 0) {
      if (selectedResumeId !== null) {
        setSelectedResumeId(null);
      }
      return;
    }
    const stillPresent = analyzedResumes.some((resume) => resume.id === selectedResumeId);
    if (!stillPresent) {
      setSelectedResumeId(analyzedResumes[0].id);
    }
  }, [analyzedResumes, selectedResumeId]);

  const applied = hasApplied || justApplied;
  const canApply = analyzedResumes.length > 0;
  const isLoadingResumes = resumesPhase === "loading" && analyzedResumes.length === 0;

  const handleSubmit = useCallback(async () => {
    if (submitting || applied || selectedResumeId === null) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const result = await submitApplication(jobId, selectedResumeId);
    if (!isMountedRef.current) {
      return;
    }

    if (result.ok || result.alreadyApplied === true) {
      // Treat "already applied" (409) as success from the student's perspective.
      setJustApplied(true);
      setRevealed(false);
      setSubmitting(false);
      onApplied();
      return;
    }

    setSubmitError(result.message);
    setSubmitting(false);
  }, [applied, jobId, onApplied, selectedResumeId, submitting]);

  const revealVariants = shouldReduceMotion
    ? undefined
    : {
        hidden: { opacity: 0, height: 0 },
        visible: { opacity: 1, height: "auto" as const },
      };

  if (applied) {
    return (
      <section aria-label="Application status" className={className}>
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-5">
          <Badge variant="green" className="w-fit">
            <CheckCircle2 aria-hidden="true" size={12} />
            Already applied
          </Badge>
          <p className="text-sm leading-6 text-white/70">
            You&apos;ve submitted your application{jobTitle ? ` for ${jobTitle}` : ""}. The recruiter
            will review it and reach out if there&apos;s a match.
          </p>
          <Button
            type="button"
            variant="success"
            disabled
            aria-disabled="true"
            className="w-full sm:w-auto"
          >
            <CheckCircle2 aria-hidden="true" size={16} strokeWidth={2} />
            Application submitted
          </Button>
        </div>
      </section>
    );
  }

  if (isLoadingResumes) {
    return (
      <section aria-label="Apply to this job" className={className}>
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/60"
        >
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/15 border-t-brand-purple-light motion-reduce:animate-none"
          />
          Checking your resumes&hellip;
        </div>
      </section>
    );
  }

  if (resumesPhase === "error") {
    return (
      <section aria-label="Apply to this job" className={className}>
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-red-400/25 bg-red-500/[0.06] p-5 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle aria-hidden="true" size={15} className="shrink-0 text-red-300" />
            {resumesError ?? "We couldn't load your resumes."}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={reloadResumes}
            className="shrink-0"
          >
            <RefreshCw aria-hidden="true" size={14} strokeWidth={2} />
            Retry
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Apply to this job" className={className}>
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        {!canApply ? (
          <>
            <ResumeSelector resumes={analyzedResumes} selectedId={null} onSelect={noop} />
            <Button type="button" variant="primary" disabled aria-disabled="true" className="w-full sm:w-auto">
              Apply now
              <ArrowRight aria-hidden="true" size={15} strokeWidth={2} />
            </Button>
          </>
        ) : !revealed ? (
          <>
            <p className="text-sm leading-6 text-white/60">
              Apply with one of your analyzed resumes. You can review your choice before submitting.
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={() => setRevealed(true)}
              className="w-full sm:w-auto"
            >
              Apply now
              <ArrowRight aria-hidden="true" size={15} strokeWidth={2} />
            </Button>
          </>
        ) : (
          <AnimatePresence initial={!shouldReduceMotion}>
            <motion.div
              key="apply-form"
              variants={revealVariants}
              initial={revealVariants ? "hidden" : false}
              animate={revealVariants ? "visible" : false}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col gap-4 overflow-hidden"
            >
              <ResumeSelector
                resumes={analyzedResumes}
                selectedId={selectedResumeId}
                onSelect={setSelectedResumeId}
                disabled={submitting}
              />

              {submitError ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/[0.06] px-3 py-2.5 text-sm text-white/75"
                >
                  <AlertTriangle aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-red-300" />
                  <span>{submitError}</span>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={submitting || selectedResumeId === null}
                  className="w-full sm:w-auto"
                >
                  {submitting ? (
                    "Submitting\u2026"
                  ) : (
                    <>
                      <Send aria-hidden="true" size={15} strokeWidth={2} />
                      Submit application
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setRevealed(false);
                    setSubmitError(null);
                  }}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}

function noop() {
  // Intentionally empty: the disabled/empty selector never emits a selection.
}
