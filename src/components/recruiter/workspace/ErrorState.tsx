"use client";

import { useId } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  /** A safe, user-facing error message supplied by the request boundary. */
  message?: string;
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  retryAriaLabel?: string;
  isRetrying?: boolean;
  className?: string;
}

/**
 * Failure presentation for a request or supported mutation. A retry control is
 * rendered only when the consuming route can safely repeat the same request.
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  retryAriaLabel,
  isRetrying = false,
  className,
}: ErrorStateProps) {
  const titleId = useId();
  const safeMessage = message?.trim() || "Unable to complete this request. Please try again.";

  return (
    <Card
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      aria-labelledby={titleId}
      className={cn(
        "border-red-400/25 bg-red-500/[0.06] text-center motion-reduce:transition-none",
        className
      )}
    >
      <div className="mx-auto flex max-w-xl flex-col items-center px-1 py-2 sm:px-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-300/25 bg-red-500/10 text-red-200">
          <AlertTriangle aria-hidden="true" size={22} strokeWidth={1.9} />
        </span>
        <h2 id={titleId} className="mt-5 text-lg font-semibold tracking-tight text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/70">{safeMessage}</p>

        {onRetry ? (
          <Button
            type="button"
            variant="secondary"
            loading={isRetrying}
            disabled={isRetrying}
            onClick={onRetry}
            aria-label={retryAriaLabel ?? retryLabel}
            className="mt-6 max-w-full whitespace-normal"
          >
            {!isRetrying ? <RefreshCw aria-hidden="true" size={16} strokeWidth={2} /> : null}
            {isRetrying ? "Retrying" : retryLabel}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
