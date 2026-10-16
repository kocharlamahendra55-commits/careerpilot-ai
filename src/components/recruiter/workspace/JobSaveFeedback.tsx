"use client";

import { CheckCircle2, LoaderCircle, Save, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { type JobSaveDisclosurePlan } from "@/features/recruiter-workspace/job-form";
import { type MutationState } from "@/features/recruiter-workspace/resource-state";
import { type SupportedJobWriteField } from "@/features/recruiter-workspace/types";
import { cn } from "@/lib/utils";
import { ErrorState } from "./ErrorState";
import { FieldPersistenceNotice } from "./FieldPersistenceNotice";

export interface JobSaveFeedbackProps {
  mutation: MutationState;
  disclosures: JobSaveDisclosurePlan;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

const FIELD_LABELS: Readonly<Record<SupportedJobWriteField, string>> = {
  title: "Job title",
  description: "Description",
  location: "Location",
  salary: "Salary",
  requirements: "Required skills",
  status: "Status",
};

/**
 * Save feedback that only attributes persistence to fields supplied by the
 * successful job response. D2 disclosure appears before any success message.
 */
export function JobSaveFeedback({
  mutation,
  disclosures,
  onRetry,
  isRetrying = false,
  className,
}: JobSaveFeedbackProps) {
  if (mutation.phase === "idle") {
    return null;
  }

  if (mutation.phase === "error") {
    return (
      <ErrorState
        title={`${mutation.action} failed`}
        message={mutation.message}
        onRetry={onRetry}
        isRetrying={isRetrying}
        retryLabel="Retry save"
        retryAriaLabel={`Retry ${mutation.action.toLowerCase()}`}
        className={className}
      />
    );
  }

  if (mutation.phase === "validating") {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={cn(
          "flex items-start gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[0.08] px-3 py-3 text-sm leading-6 text-amber-50",
          className
        )}
      >
        <ShieldAlert aria-hidden="true" size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
        <span>{mutation.message}</span>
      </div>
    );
  }

  if (mutation.phase === "saving") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          "flex items-center gap-2 rounded-xl border border-brand-purple/25 bg-brand-purple/[0.09] px-3 py-3 text-sm text-brand-purple-light",
          className
        )}
      >
        <LoaderCircle aria-hidden="true" size={18} strokeWidth={2} className="shrink-0 animate-spin motion-reduce:animate-none" />
        <span>{mutation.action}…</span>
      </div>
    );
  }

  const returnedFieldLabels = mutation.returnedFields.map(
    (field) => FIELD_LABELS[field]
  );
  const returnedFieldText = joinLabels(returnedFieldLabels);

  return (
    <div className={cn("space-y-3", className)}>
      {disclosures.localOnly ? (
        <FieldPersistenceNotice
          kind="local-only"
          message={disclosures.localOnly.message}
        />
      ) : null}
      <Card
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="border-emerald-300/25 bg-emerald-400/[0.07]"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
            <CheckCircle2 aria-hidden="true" size={19} strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-50">
              <Save aria-hidden="true" size={15} strokeWidth={2} />
              {mutation.action} completed
            </p>
            <p className="mt-1 text-sm leading-6 text-emerald-50/80">
              {returnedFieldText
                ? `The job service returned saved values for ${returnedFieldText}.`
                : "The job service confirmed the action, but did not return supported fields to display."}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function joinLabels(labels: readonly string[]): string {
  if (labels.length === 0) {
    return "";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}
