"use client";

import { Building2, CheckCircle2, Database } from "lucide-react";
import { UnavailabilityIndicator } from "./UnavailabilityIndicator";
import { cn } from "@/lib/utils";

export type FieldPersistenceNoticeKind =
  | "company"
  | "local-only"
  | "supported-fields";

export interface FieldPersistenceNoticeProps {
  kind: FieldPersistenceNoticeKind;
  /** A human-readable field name used for a field-level D2 disclosure. */
  fieldLabel?: string;
  /** Allows save feedback to reuse the exact disclosure planned by the form model. */
  message?: string;
  className?: string;
}

const SUPPORTED_FIELDS_MESSAGE =
  "Only Job title, description, location, salary, required skills (stored as requirements), and status are saved by the current job service.";

/**
 * Makes the source/persistence boundary visible at the field where it matters.
 * It never represents a D2 value as a source-backed saved value.
 */
export function FieldPersistenceNotice({
  kind,
  fieldLabel,
  message,
  className,
}: FieldPersistenceNoticeProps) {
  if (kind === "local-only") {
    const label = fieldLabel?.trim() || "This field";

    return (
      <UnavailabilityIndicator
        dependency="D2"
        message={
          message ??
          `${label} is shown in this form but is not stored by the current job service.`
        }
        className={cn("w-full", className)}
      />
    );
  }

  if (kind === "company") {
    return (
      <aside
        role="note"
        aria-label="Company persistence information"
        className={cn(
          "flex items-start gap-2 rounded-xl border border-brand-cyan/20 bg-brand-cyan/[0.07] px-3 py-2.5 text-xs leading-5 text-cyan-50/85",
          className
        )}
      >
        <Building2
          aria-hidden="true"
          size={16}
          strokeWidth={2}
          className="mt-0.5 shrink-0 text-brand-cyan-light"
        />
        <span>
          <span className="font-semibold text-cyan-50">Profile-derived company.</span>{" "}
          {message ??
            "Company is derived from your recruiter profile and is not sent from this form."}
        </span>
      </aside>
    );
  }

  return (
    <aside
      role="note"
      aria-label="Persisted job fields"
      className={cn(
        "flex items-start gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.07] px-3 py-2.5 text-xs leading-5 text-emerald-50/85",
        className
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
        <CheckCircle2 aria-hidden="true" size={14} strokeWidth={2.1} />
      </span>
      <span>
        <span className="font-semibold text-emerald-50">What is saved.</span>{" "}
        {message ?? SUPPORTED_FIELDS_MESSAGE}
      </span>
      <Database aria-hidden="true" size={15} strokeWidth={1.9} className="ml-auto mt-0.5 shrink-0 text-emerald-200/80" />
    </aside>
  );
}

export const FIELD_PERSISTENCE_SUPPORTED_FIELDS_MESSAGE = SUPPORTED_FIELDS_MESSAGE;
