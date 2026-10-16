"use client";

import type { KeyboardEvent, RefObject } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  HelpCircle,
  LoaderCircle,
  Send,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  APPLICATION_STATUS_UPDATE_FAILURE_MESSAGE,
  getActionTargetStatus,
  getStatusActionUnavailableReason,
  getValidActionsForStatus,
  performApplicationStatusUpdate,
  type ApplicationStatusAction,
} from "@/features/recruiter-workspace/application-status";
import { StatusBadge } from "./StatusBadge";
import { UnavailabilityIndicator } from "./UnavailabilityIndicator";
import { useWorkspaceToast } from "./WorkspaceToast";

/**
 * Re-export the single source of truth for the action union so existing
 * consumers (and the workspace barrel) keep importing it from this module.
 */
export type { ApplicationStatusAction };

/**
 * Dormant future integration seam (historical Integration Dependency D1).
 *
 * Retained only for backward compatibility with the workspace barrel export.
 * The enabled mode below performs status updates through the approved request
 * boundary (`performApplicationStatusUpdate`), so this adapter is never read.
 */
export interface ApprovedApplicationStatusMutationAdapter {
  updateStatus: (
    applicationId: string,
    action: ApplicationStatusAction
  ) => Promise<{ application: { status: string } }>;
}

interface StatusActionDescriptor {
  readonly action: ApplicationStatusAction;
  readonly label: string;
  readonly Icon: LucideIcon;
}

/** The exact five actions required by the design, in a stable presentation order. */
const STATUS_ACTIONS: readonly StatusActionDescriptor[] = [
  { action: "SHORTLIST", label: "Shortlist", Icon: CircleDot },
  { action: "REJECT", label: "Reject", Icon: XCircle },
  { action: "MOVE_TO_INTERVIEW", label: "Move to Interview", Icon: ArrowRight },
  { action: "OFFER", label: "Offer", Icon: Send },
  { action: "HIRE", label: "Hire", Icon: CheckCircle2 },
] as const;

/** The exact D1 explanation surfaced in the disabled (safe-default) presentation. */
export const APPLICATION_STATUS_D1_FEEDBACK =
  "Status updates are unavailable because the current recruiter application service exposes no approved status-mutation operation (D1).";

export interface ApplicationStatusActionsProps {
  /** The exact source-backed application status, shown via the shared StatusBadge. */
  status: string;
  /** Accessible candidate label (full name, otherwise email, otherwise a fallback). */
  candidateLabel: string;
  /**
   * Enables live status updates for this specific application. When absent (or
   * blank), the component renders the disabled safe-default presentation and
   * performs no network, write, or mutation calls.
   */
  applicationId?: string;
  /** Called with the new source-backed status after a successful update. */
  onStatusUpdated?: (newStatus: string) => void;
  /**
   * Dormant future integration seam retained for backward compatibility. It is
   * intentionally not read and enabling updates does not depend on it.
   */
  mutationAdapter?: ApprovedApplicationStatusMutationAdapter;
  className?: string;
}

/**
 * Application status actions for a source-backed application.
 *
 * - Without `applicationId`: renders the unchanged disabled safe default with a
 *   D1 explanation and performs zero requests (backward compatible).
 * - With `applicationId`: enables only the valid transitions from the current
 *   status, confirms each change in an accessible modal dialog, and performs the
 *   single approved status `PATCH` through the shared request boundary.
 */
export function ApplicationStatusActions({
  status,
  candidateLabel,
  applicationId,
  onStatusUpdated,
  className,
}: ApplicationStatusActionsProps) {
  const normalizedApplicationId = applicationId?.trim() ?? "";

  if (normalizedApplicationId.length === 0) {
    return (
      <DisabledApplicationStatusActions
        status={status}
        candidateLabel={candidateLabel}
        className={className}
      />
    );
  }

  return (
    <EnabledApplicationStatusActions
      applicationId={normalizedApplicationId}
      status={status}
      candidateLabel={candidateLabel}
      onStatusUpdated={onStatusUpdated}
      className={className}
    />
  );
}

/**
 * The unchanged disabled presentation (historical D1 gate). Every action is
 * rendered disabled/non-selectable with a visible "Unavailable" marker and an
 * accessible note explaining the missing integration dependency.
 */
function DisabledApplicationStatusActions({
  status,
  candidateLabel,
  className,
}: {
  status: string;
  candidateLabel: string;
  className?: string;
}) {
  const headingId = useId();
  const feedbackId = useId();
  const resolvedCandidateLabel = candidateLabel.trim() || "candidate unavailable";
  const hasSourceStatus = status.trim().length > 0;

  return (
    <Card
      aria-labelledby={headingId}
      className={cn("space-y-5 motion-reduce:transition-none", className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 id={headingId} className="text-base font-semibold tracking-tight text-white">
            Application status
          </h3>
          <p className="mt-1 text-sm leading-6 text-white/60">
            Hiring decision actions for{" "}
            <span className="font-medium text-white/80">{resolvedCandidateLabel}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-white/40">
            Current
          </span>
          {hasSourceStatus ? (
            <StatusBadge status={status} />
          ) : (
            <UnavailabilityIndicator message="No source-backed status was provided for this application." />
          )}
        </div>
      </div>

      <div
        role="group"
        aria-labelledby={headingId}
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {STATUS_ACTIONS.map(({ action, label, Icon }) => (
          <Button
            key={action}
            type="button"
            variant="secondary"
            disabled
            aria-disabled="true"
            aria-describedby={feedbackId}
            aria-label={`${label} — unavailable`}
            className="w-full justify-start gap-2.5 text-left"
          >
            <Icon aria-hidden="true" size={16} strokeWidth={2} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="shrink-0 rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">
              Unavailable
            </span>
          </Button>
        ))}
      </div>

      <div
        id={feedbackId}
        role="note"
        aria-label="Application status update availability"
        className="flex items-start gap-2.5 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-3.5 py-3 text-sm leading-6 text-amber-100/90"
      >
        <ShieldAlert
          aria-hidden="true"
          size={17}
          strokeWidth={2}
          className="mt-0.5 shrink-0 text-amber-200"
        />
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-amber-100">Status updates are integration-gated (D1)</p>
          <p className="text-amber-100/85">{APPLICATION_STATUS_D1_FEEDBACK}</p>
        </div>
      </div>
    </Card>
  );
}

/**
 * The enabled presentation. Only server-valid transitions are actionable; other
 * actions render disabled with a short neutral reason. Confirming an action runs
 * the single approved status `PATCH`, announces success via the scoped toast,
 * and reflects the returned status locally without mutating source data on
 * failure.
 */
function EnabledApplicationStatusActions({
  applicationId,
  status,
  candidateLabel,
  onStatusUpdated,
  className,
}: {
  applicationId: string;
  status: string;
  candidateLabel: string;
  onStatusUpdated?: (newStatus: string) => void;
  className?: string;
}) {
  const headingId = useId();
  const helperId = useId();
  const { showToast } = useWorkspaceToast();

  const [displayStatus, setDisplayStatus] = useState(status);
  const [pendingAction, setPendingAction] = useState<ApplicationStatusAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const resolvedCandidateLabel = candidateLabel.trim() || "this candidate";
  const hasSourceStatus = displayStatus.trim().length > 0;
  const validActions = getValidActionsForStatus(displayStatus);

  // Re-sync to the authoritative source status whenever the prop changes. A
  // successful local update writes only local state, so this never clobbers it
  // (the parent prop stays unchanged until it reloads with the new value).
  useEffect(() => {
    setDisplayStatus(status);
  }, [status]);

  const openConfirm = useCallback(
    (action: ApplicationStatusAction, trigger: HTMLButtonElement) => {
      triggerRef.current = trigger;
      setErrorMessage(null);
      setPendingAction(action);
    },
    []
  );

  const closeConfirm = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    setPendingAction(null);
    setErrorMessage(null);
  }, [isSubmitting]);

  const handleConfirm = useCallback(async () => {
    if (pendingAction === null || isSubmitting) {
      return;
    }

    const action = pendingAction;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { status: newStatus } = await performApplicationStatusUpdate(applicationId, action);
      setDisplayStatus(newStatus);
      setIsSubmitting(false);
      setPendingAction(null);
      showToast({
        title: "Application status updated",
        description: `${resolvedCandidateLabel} is now ${newStatus}.`,
        variant: "success",
      });
      onStatusUpdated?.(newStatus);
    } catch (error) {
      setIsSubmitting(false);
      setErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : APPLICATION_STATUS_UPDATE_FAILURE_MESSAGE
      );
    }
  }, [applicationId, isSubmitting, onStatusUpdated, pendingAction, resolvedCandidateLabel, showToast]);

  return (
    <>
      <Card
        aria-labelledby={headingId}
        aria-describedby={helperId}
        className={cn("space-y-5 motion-reduce:transition-none", className)}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3
              ref={headingRef}
              id={headingId}
              tabIndex={-1}
              className="text-base font-semibold tracking-tight text-white focus:outline-none"
            >
              Application status
            </h3>
            <p className="mt-1 text-sm leading-6 text-white/60">
              Hiring decision actions for{" "}
              <span className="font-medium text-white/80">{resolvedCandidateLabel}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-white/40">
              Current
            </span>
            {hasSourceStatus ? (
              <StatusBadge status={displayStatus} />
            ) : (
              <UnavailabilityIndicator message="No source-backed status was provided for this application." />
            )}
          </div>
        </div>

        <div
          role="group"
          aria-labelledby={headingId}
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {STATUS_ACTIONS.map(({ action, label, Icon }) => {
            const isEnabled = validActions.includes(action);

            if (isEnabled) {
              return (
                <Button
                  key={action}
                  type="button"
                  variant="secondary"
                  onClick={(event) => openConfirm(action, event.currentTarget)}
                  disabled={isSubmitting}
                  aria-haspopup="dialog"
                  className="w-full justify-start gap-2.5 text-left"
                >
                  <Icon aria-hidden="true" size={16} strokeWidth={2} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                </Button>
              );
            }

            const reason =
              getStatusActionUnavailableReason(displayStatus, action) ??
              "Not available from the current status.";

            return (
              <Button
                key={action}
                type="button"
                variant="secondary"
                disabled
                aria-disabled="true"
                aria-label={`${label} — ${reason}`}
                title={reason}
                className="w-full justify-start gap-2.5 text-left"
              >
                <Icon aria-hidden="true" size={16} strokeWidth={2} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <span className="shrink-0 rounded-md border border-white/12 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                  Unavailable
                </span>
              </Button>
            );
          })}
        </div>

        <p id={helperId} className="text-sm leading-6 text-white/55">
          Only valid transitions from the current status are enabled. You&rsquo;ll confirm each
          change before it&rsquo;s applied.
        </p>
      </Card>

      <ApplicationStatusConfirmDialog
        action={pendingAction}
        targetStatus={pendingAction === null ? null : getActionTargetStatus(pendingAction)}
        candidateLabel={resolvedCandidateLabel}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        returnFocusRef={triggerRef}
        fallbackFocusRef={headingRef}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </>
  );
}

interface ApplicationStatusConfirmDialogProps {
  readonly action: ApplicationStatusAction | null;
  readonly targetStatus: string | null;
  readonly candidateLabel: string;
  readonly isSubmitting: boolean;
  readonly errorMessage: string | null;
  readonly returnFocusRef: RefObject<HTMLButtonElement | null>;
  /** Used when a completed update disables/removes the triggering button. */
  readonly fallbackFocusRef: RefObject<HTMLHeadingElement | null>;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * Accessible confirmation modal modeled on `JobLifecycleDialog`: role=dialog,
 * aria-modal, labelled + described, focus trapped, initial focus on Cancel (never
 * Confirm), Escape cancels, and focus returns to the triggering button (or the
 * heading fallback) on close.
 */
function ApplicationStatusConfirmDialog({
  action,
  targetStatus,
  candidateLabel,
  isSubmitting,
  errorMessage,
  returnFocusRef,
  fallbackFocusRef,
  onConfirm,
  onCancel,
}: ApplicationStatusConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const isOpen = action !== null;

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
      (cancelButtonRef.current ?? dialogRef.current)?.focus();
    }
  }, [isOpen, returnFocusRef, fallbackFocusRef]);

  if (!isOpen || action === null) {
    return null;
  }

  const actionLabel = getActionLabel(action);
  const title = `${actionLabel} this candidate?`;
  const description = `You are about to ${actionLabel.toLowerCase()} ${candidateLabel}. Their application status will change to ${targetStatus ?? ""}.`;
  const hasError = errorMessage !== null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!isSubmitting) {
        onCancel();
      }
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
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[#03040d]/80 backdrop-blur-sm motion-reduce:transition-none"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={hasError ? `${descriptionId} ${errorId}` : descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-white/12 bg-[#0b1024] p-5 shadow-2xl shadow-black/50 sm:p-6"
      >
        <div className="flex items-start gap-3">
          <DialogIcon submitting={isSubmitting} error={hasError} />
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-white">
              {title}
            </h2>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-white/65">
              {description}
            </p>
          </div>
          {!isSubmitting ? (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close status confirmation dialog"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-white/8 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]"
            >
              <X aria-hidden="true" size={18} strokeWidth={2} />
            </button>
          ) : null}
        </div>

        {hasError ? (
          <div
            id={errorId}
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/[0.08] px-3.5 py-3 text-sm leading-6 text-red-100"
          >
            <AlertTriangle
              aria-hidden="true"
              size={17}
              strokeWidth={2}
              className="mt-0.5 shrink-0 text-red-300"
            />
            <div className="min-w-0 space-y-0.5">
              <p className="font-semibold text-red-100">Update failed</p>
              <p className="text-red-100/85">{errorMessage}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            onClick={onConfirm}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Updating" : hasError ? "Try again" : actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DialogIcon({ submitting, error }: { submitting: boolean; error: boolean }) {
  if (error) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-200">
        <AlertTriangle aria-hidden="true" size={20} strokeWidth={2} />
      </span>
    );
  }

  if (submitting) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-purple/25 bg-brand-purple/10 text-brand-purple-light">
        <LoaderCircle
          aria-hidden="true"
          size={20}
          strokeWidth={2}
          className="animate-spin motion-reduce:animate-none"
        />
      </span>
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-purple/25 bg-brand-purple/10 text-brand-purple-light">
      <HelpCircle aria-hidden="true" size={20} strokeWidth={2} />
    </span>
  );
}

function getActionLabel(action: ApplicationStatusAction): string {
  return STATUS_ACTIONS.find((descriptor) => descriptor.action === action)?.label ?? "Update";
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
