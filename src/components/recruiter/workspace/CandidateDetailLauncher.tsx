"use client";

import { useId } from "react";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type CandidateDetailLaunchPhase = "idle" | "loading" | "error";

/**
 * Row-local feedback for a single candidate's detail fetch. It is derived from
 * the scoped detail cache entry for that same application ID; it never reflects
 * another row's request.
 */
export interface CandidateDetailLaunchState {
  readonly phase: CandidateDetailLaunchPhase;
  readonly message: string | null;
}

export interface CandidateDetailLauncherProps {
  readonly applicationId: string;
  /** Accessible candidate label (source-backed full name, email, or a fallback). */
  readonly candidateLabel: string;
  readonly state: CandidateDetailLaunchState;
  /** Starts exactly one detail fetch for this application before navigation. */
  readonly onView: (applicationId: string) => void;
  readonly className?: string;
}

/**
 * Presentation-only launcher for one candidate row. Activating it asks the page
 * to start a single detail GET for this application ID; it shows row-local
 * loading and error feedback and never fans a request out across other rows.
 */
export function CandidateDetailLauncher({
  applicationId,
  candidateLabel,
  state,
  onView,
  className,
}: CandidateDetailLauncherProps) {
  const feedbackId = useId();
  const isLoading = state.phase === "loading";
  const isError = state.phase === "error";
  const label = candidateLabel.trim() || "this candidate";

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Button
        type="button"
        variant={isError ? "secondary" : "outline"}
        size="sm"
        onClick={() => onView(applicationId)}
        loading={isLoading}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-describedby={isError ? feedbackId : undefined}
        aria-label={
          isError
            ? `Retry loading the profile for ${label}`
            : `View the profile for ${label}`
        }
        className="w-full justify-center sm:w-auto"
      >
        {!isLoading ? (
          isError ? (
            <RefreshCw aria-hidden="true" size={15} strokeWidth={2} />
          ) : (
            <ExternalLink aria-hidden="true" size={15} strokeWidth={2} />
          )
        ) : null}
        {isLoading ? "Loading profile" : isError ? "Retry profile" : "View profile"}
      </Button>

      {isError ? (
        <p
          id={feedbackId}
          role="alert"
          className="flex items-start gap-1.5 text-xs leading-5 text-red-300"
        >
          <AlertTriangle aria-hidden="true" size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span className="min-w-0">
            {state.message ?? "Unable to load this candidate's details."}
          </span>
        </p>
      ) : null}
    </div>
  );
}
