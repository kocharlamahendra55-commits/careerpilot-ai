"use client";

import type { HTMLAttributes } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UnavailabilityIndicatorProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Explains why the value or action is not available from current source data. */
  message?: string;
  /** Optional Integration Dependency identifier, such as D1 or D3. */
  dependency?: string;
}

/**
 * Clearly distinguishes unavailable source data or blocked integrations from a
 * source-backed value. It intentionally never renders a plausible replacement.
 */
export function UnavailabilityIndicator({
  message = "This value is not provided by the current source data.",
  dependency,
  className,
  "aria-label": ariaLabel,
  ...props
}: UnavailabilityIndicatorProps) {
  const displayMessage = message.trim() || "This value is not provided by the current source data.";
  const accessibleLabel = ["Unavailable", displayMessage, dependency ? `Dependency ${dependency}` : null]
    .filter(Boolean)
    .join(". ");

  return (
    <span
      {...props}
      role="note"
      aria-label={ariaLabel ?? accessibleLabel}
      className={cn(
        "inline-flex max-w-full items-start gap-1.5 rounded-md border border-dashed border-amber-300/35 bg-amber-300/[0.08] px-2 py-1 text-left text-xs leading-5 text-amber-100/90",
        className
      )}
    >
      <Info aria-hidden="true" size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
      <span className="min-w-0">
        <span className="font-semibold text-amber-100">Unavailable</span>
        <span className="text-amber-100/85"> — {displayMessage}</span>
        {dependency ? (
          <span className="ml-1 whitespace-nowrap font-semibold text-amber-100">({dependency})</span>
        ) : null}
      </span>
    </span>
  );
}
