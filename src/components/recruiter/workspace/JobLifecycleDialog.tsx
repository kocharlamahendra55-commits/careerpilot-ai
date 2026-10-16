"use client";

import type { KeyboardEvent, RefObject } from "react";
import { useEffect, useId, useRef } from "react";
import { AlertTriangle, Archive, CheckCircle2, LoaderCircle, RefreshCw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { JobLifecycleAction, JobLifecycleState } from "@/features/recruiter-workspace/job-lifecycle";

export interface JobLifecycleDialogProps {
  readonly state: JobLifecycleState | null;
  readonly returnFocusRef: RefObject<HTMLElement | null>;
  /** Used only when a successful lifecycle result replaces the origin button. */
  readonly fallbackFocusRef: RefObject<HTMLHeadingElement | null>;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly onDismissUnavailable: () => void;
}

/**
 * Modal confirmation boundary for existing job PUT lifecycle writes. It never
 * receives a delete request: DELETE enters the explicit unavailable state from
 * the lifecycle reducer and is rendered as an explanatory dialog instead.
 */
export function JobLifecycleDialog({
  state,
  returnFocusRef,
  fallbackFocusRef,
  onConfirm,
  onCancel,
  onDismissUnavailable,
}: JobLifecycleDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const unavailableCloseButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const dialogPhase = state?.phase ?? null;
  const isOpen = dialogPhase === "confirming" || dialogPhase === "saving" || dialogPhase === "unavailable";

  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        restoreDialogFocus(returnFocusRef.current, fallbackFocusRef.current);
      }

      wasOpenRef.current = false;
      return;
    }

    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      const initialFocusTarget =
        dialogPhase === "confirming"
          ? cancelButtonRef.current
          : unavailableCloseButtonRef.current;
      (initialFocusTarget ?? dialogRef.current)?.focus();
    }
  }, [dialogPhase, fallbackFocusRef, isOpen, returnFocusRef]);

  if (!isOpen || state === null) {
    return null;
  }

  const isSaving = state.phase === "saving";
  const isUnavailable = state.phase === "unavailable";
  const confirmation = state.confirmation;
  const actionLabel = confirmation ? getLifecycleActionLabel(confirmation.action) : "Delete job";
  const title = isUnavailable
    ? "Delete job unavailable"
    : isSaving
      ? `${actionLabel} in progress`
      : `${actionLabel} this job?`;
  const description = isUnavailable
    ? state.unavailabilityMessage
    : confirmation
      ? `You are about to ${actionLabel.toLowerCase()} “${confirmation.jobTitle}”. The existing job service will be asked to return status ${confirmation.targetStatus}.`
      : "The job lifecycle request is being prepared.";

  function closeDialog() {
    if (isSaving) {
      return;
    }

    if (isUnavailable) {
      onDismissUnavailable();
      return;
    }

    onCancel();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = getFocusableElements(dialogRef.current);

    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div aria-hidden="true" className="absolute inset-0 bg-[#03040d]/80 backdrop-blur-sm motion-reduce:transition-none" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-white/12 bg-[#0b1024] p-5 shadow-2xl shadow-black/50 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <DialogIcon unavailable={isUnavailable} saving={isSaving} />
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-white">
              {title}
            </h2>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-white/65">
              {description}
            </p>
          </div>
          {!isSaving ? (
            <button
              type="button"
              onClick={closeDialog}
              aria-label="Close job lifecycle dialog"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-white/8 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]"
            >
              <X aria-hidden="true" size={18} strokeWidth={2} />
            </button>
          ) : null}
        </div>

        {isUnavailable ? (
          <div className="mt-6 flex justify-end">
            <Button
              ref={unavailableCloseButtonRef}
              type="button"
              variant="secondary"
              onClick={closeDialog}
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              ref={cancelButtonRef}
              type="button"
              variant="secondary"
              onClick={closeDialog}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={isSaving}
              disabled={isSaving || confirmation === null}
              onClick={onConfirm}
              className="w-full sm:w-auto"
            >
              {isSaving ? "Updating job" : actionLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function DialogIcon({ unavailable, saving }: { unavailable: boolean; saving: boolean }) {
  if (unavailable) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/25 bg-amber-300/10 text-amber-200">
        <AlertTriangle aria-hidden="true" size={20} strokeWidth={2} />
      </span>
    );
  }

  if (saving) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-purple/25 bg-brand-purple/10 text-brand-purple-light">
        <LoaderCircle aria-hidden="true" size={20} strokeWidth={2} className="animate-spin motion-reduce:animate-none" />
      </span>
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-200">
      <CheckCircle2 aria-hidden="true" size={20} strokeWidth={2} />
    </span>
  );
}

function getLifecycleActionLabel(action: JobLifecycleAction): string {
  switch (action) {
    case "PUBLISH":
      return "Publish";
    case "ARCHIVE":
      return "Close job";
    case "REOPEN":
      return "Reopen job";
    case "SAVE_AS_DRAFT":
      return "Save as draft";
    case "DELETE":
      return "Delete job";
  }
}

function restoreDialogFocus(
  returnTarget: HTMLElement | null,
  fallbackTarget: HTMLElement | null
): void {
  if (isConnectedAndFocusable(returnTarget)) {
    returnTarget.focus();
    return;
  }

  if (isConnectedAndVisible(fallbackTarget)) {
    fallbackTarget.focus();
  }
}

function isConnectedAndFocusable(element: HTMLElement | null): element is HTMLElement {
  return (
    isConnectedAndVisible(element) &&
    !element.matches(":disabled") &&
    element.tabIndex >= 0
  );
}

function isConnectedAndVisible(element: HTMLElement | null): element is HTMLElement {
  if (element === null || !element.isConnected || element.hidden) {
    return false;
  }

  const styles = window.getComputedStyle(element);
  return styles.display !== "none" && styles.visibility !== "hidden";
}

function getFocusableElements(container: HTMLDivElement | null): HTMLElement[] {
  if (container === null) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute("hidden"));
}
