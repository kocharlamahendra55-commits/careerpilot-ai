"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Plus, RefreshCw } from "lucide-react";
import {
  ErrorState,
  EmptyState,
  JobLifecycleDialog,
  LoadingSkeleton,
  ManageJobsControls,
  ManageJobsTable,
  StatusBadge,
  WorkspacePageHeader,
  WorkspacePageShell,
} from "@/components/recruiter/workspace";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  beginJobLifecycleRequest,
  cancelJobLifecycleConfirmation,
  createJobLifecycleState,
  requestJobLifecycleConfirmation,
  resolveJobLifecycleFailure,
  resolveJobLifecycleSuccess,
  type JobLifecycleAction,
  type JobLifecycleState,
} from "@/features/recruiter-workspace/job-lifecycle";
import { getRecruiterJobFromResponse, readWorkspaceJsonSafely } from "@/features/recruiter-workspace/job-response";
import {
  createManageJobsTransformState,
  reduceManageJobsTransformState,
  transformManageJobs,
  type ManageJobsTransformAction,
  type ManageJobsTransformState,
} from "@/features/recruiter-workspace/manage-jobs-transform";
import { serializeWorkspaceRequest } from "@/features/recruiter-workspace/request-intents";
import type { RecruiterJob } from "@/features/recruiter-workspace/types";
import { useRecruiterJobCollection } from "@/features/recruiter-workspace/use-job-collection";

export default function ManageRecruiterJobsPage() {
  const {
    phase,
    jobs,
    errorMessage,
    reload,
    reconcileLifecycleResult,
  } = useRecruiterJobCollection();
  const [controls, setControls] = useState<ManageJobsTransformState>(() =>
    createManageJobsTransformState()
  );
  const [lifecycle, setLifecycle] = useState<JobLifecycleState | null>(null);
  const lifecycleRef = useRef<JobLifecycleState | null>(null);
  const lifecycleTriggerRef = useRef<HTMLElement | null>(null);
  const lifecycleFocusFallbackRef = useRef<HTMLHeadingElement | null>(null);

  const commitLifecycle = useCallback((next: JobLifecycleState | null) => {
    lifecycleRef.current = next;
    setLifecycle(next);
  }, []);

  const updateControls = useCallback((action: ManageJobsTransformAction) => {
    setControls((current) => reduceManageJobsTransformState(current, action));
  }, []);

  const transformed = useMemo(
    () => transformManageJobs(jobs ?? [], controls),
    [controls, jobs]
  );

  useEffect(() => {
    if (transformed.page !== controls.page) {
      updateControls({ type: "set-page", page: transformed.page });
    }
  }, [controls.page, transformed.page, updateControls]);

  const requestLifecycleAction = useCallback(
    (job: RecruiterJob, action: JobLifecycleAction, trigger: HTMLButtonElement) => {
      lifecycleTriggerRef.current = trigger;
      const next = requestJobLifecycleConfirmation(createJobLifecycleState(job), action);
      commitLifecycle(next);
    },
    [commitLifecycle]
  );

  const cancelLifecycle = useCallback(() => {
    const current = lifecycleRef.current;

    if (current?.phase === "confirming") {
      commitLifecycle(cancelJobLifecycleConfirmation(current));
      return;
    }

    commitLifecycle(null);
  }, [commitLifecycle]);

  const dismissUnavailableLifecycle = useCallback(() => {
    commitLifecycle(null);
  }, [commitLifecycle]);

  const confirmLifecycle = useCallback(async () => {
    const current = lifecycleRef.current;

    if (current === null) {
      return;
    }

    const saving = beginJobLifecycleRequest(current);

    if (saving === current || saving.request === null) {
      if (saving !== current) {
        commitLifecycle(saving);
      }
      return;
    }

    commitLifecycle(saving);
    const requestToken = saving.requestToken;

    try {
      const fetchRequest = serializeWorkspaceRequest(saving.request);
      const response = await fetch(fetchRequest.url, fetchRequest.init);
      const body = await readWorkspaceJsonSafely(response);
      const active = lifecycleRef.current;

      if (active === null) {
        return;
      }

      if (!response.ok) {
        const failed = resolveJobLifecycleFailure(
          active,
          requestToken,
          body,
          "Unable to update this job lifecycle."
        );

        if (failed !== active) {
          commitLifecycle(failed);
        }
        return;
      }

      const job = getRecruiterJobFromResponse(body);

      if (job === null) {
        const failed = resolveJobLifecycleFailure(
          active,
          requestToken,
          { error: "The job service returned an incomplete lifecycle result." },
          "Unable to update this job lifecycle."
        );

        if (failed !== active) {
          commitLifecycle(failed);
        }
        return;
      }

      const resolved = resolveJobLifecycleSuccess(active, requestToken, { job });

      if (resolved === active) {
        return;
      }

      commitLifecycle(resolved);

      if (resolved.phase === "success") {
        // First reconcile the returned source record. Reload then advances the
        // collection token, preventing an older GET from clobbering this change.
        reconcileLifecycleResult(resolved);
        void reload();
      }
    } catch {
      const active = lifecycleRef.current;

      if (active === null) {
        return;
      }

      const failed = resolveJobLifecycleFailure(
        active,
        requestToken,
        null,
        "Unable to update this job lifecycle. Check your connection and try again."
      );

      if (failed !== active) {
        commitLifecycle(failed);
      }
    }
  }, [commitLifecycle, reconcileLifecycleResult, reload]);

  const retryLifecycle = useCallback(() => {
    const current = lifecycleRef.current;

    if (
      current === null ||
      current.phase !== "error" ||
      current.action === null ||
      current.action === "DELETE"
    ) {
      return;
    }

    commitLifecycle(
      requestJobLifecycleConfirmation(
        createJobLifecycleState(current.sourceJob),
        current.action
      )
    );
  }, [commitLifecycle]);

  const resetControls = useCallback(() => {
    setControls(createManageJobsTransformState());
  }, []);

  const header = (
    <WorkspacePageHeader
      titleId="manage-jobs-heading"
      eyebrow="Recruiter workspace"
      title="Manage jobs"
      description="Search, organize, and update the lifecycle of your recruiter-owned job postings."
      breadcrumbs={[
        { label: "Recruiter workspace", href: "/recruiter/dashboard" },
        { label: "Manage jobs" },
      ]}
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void reload()}
            loading={phase === "refreshing"}
            disabled={phase === "loading"}
            aria-label="Refresh loaded jobs"
          >
            {phase !== "refreshing" ? <RefreshCw aria-hidden="true" size={16} strokeWidth={2} /> : null}
            {phase === "refreshing" ? "Refreshing" : "Refresh"}
          </Button>
          <Link href="/recruiter/jobs/new" className={buttonVariants({ variant: "primary", size: "sm" })}>
            <Plus aria-hidden="true" size={16} strokeWidth={2} />
            Create job
          </Link>
        </>
      }
    />
  );

  if ((phase === "idle" || phase === "loading") && jobs === null) {
    return (
      <WorkspacePageShell labelledBy="manage-jobs-heading" maxWidth="wide">
        {header}
        <LoadingSkeleton label="jobs table" variant="table" rows={6} />
      </WorkspacePageShell>
    );
  }

  if (phase === "error" && jobs === null) {
    return (
      <WorkspacePageShell labelledBy="manage-jobs-heading" maxWidth="compact">
        {header}
        <ErrorState
          title="Jobs could not be loaded"
          message={errorMessage ?? "Unable to load jobs."}
          onRetry={reload}
          retryLabel="Reload jobs"
          retryAriaLabel="Retry loading recruiter jobs"
        />
      </WorkspacePageShell>
    );
  }

  const sourceJobs = jobs ?? [];
  const lifecyclePendingJobId = lifecycle?.phase === "saving" ? lifecycle.sourceJob.id : null;

  return (
    <WorkspacePageShell labelledBy="manage-jobs-heading" maxWidth="wide">
      {header}

      {phase === "refreshing" ? (
        <p role="status" aria-live="polite" className="text-sm text-brand-cyan-light">
          Refreshing the loaded job collection…
        </p>
      ) : null}

      <ManageJobsControls
        controls={controls}
        totalMatches={transformed.totalMatches}
        page={transformed.page}
        totalPages={transformed.totalPages}
        onSearchChange={(search) => updateControls({ type: "set-search", search })}
        onStatusFilterChange={(statusFilter) =>
          updateControls({ type: "set-status-filter", statusFilter })
        }
        onSortChange={(sort) => updateControls({ type: "set-sort", sort })}
        onPageChange={(page) => updateControls({ type: "set-page", page })}
        onReset={resetControls}
        lifecycleFocusFallbackRef={lifecycleFocusFallbackRef}
      />

      {phase === "error" ? (
        <ErrorState
          title="The latest job refresh failed"
          message={errorMessage ?? "Unable to refresh jobs."}
          onRetry={reload}
          retryLabel="Retry refresh"
          retryAriaLabel="Retry refreshing recruiter jobs"
        />
      ) : null}

      <LifecycleFeedback
        state={lifecycle}
        onRetry={retryLifecycle}
        onDismiss={() => commitLifecycle(null)}
      />

      {sourceJobs.length === 0 ? (
        <EmptyState
          title="No job postings yet"
          description="Your recruiter job collection has no source-backed records yet. Create a job to begin managing its lifecycle here."
          action={{ label: "Create job", href: "/recruiter/jobs/new", variant: "primary" }}
        />
      ) : transformed.totalMatches === 0 ? (
        <EmptyState
          title="No loaded jobs match these controls"
          description="Change or reset the local search, status filter, or sorting controls to see the fetched job collection."
          action={{ label: "Reset controls", onClick: resetControls, variant: "secondary" }}
        />
      ) : (
        <ManageJobsTable
          jobs={transformed.visibleJobs}
          lifecyclePendingJobId={lifecyclePendingJobId}
          onLifecycleAction={requestLifecycleAction}
        />
      )}

      <JobLifecycleDialog
        state={lifecycle}
        returnFocusRef={lifecycleTriggerRef}
        fallbackFocusRef={lifecycleFocusFallbackRef}
        onConfirm={confirmLifecycle}
        onCancel={cancelLifecycle}
        onDismissUnavailable={dismissUnavailableLifecycle}
      />
    </WorkspacePageShell>
  );
}

function LifecycleFeedback({
  state,
  onRetry,
  onDismiss,
}: {
  state: JobLifecycleState | null;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  if (state === null || state.phase === "idle" || state.phase === "confirming" || state.phase === "saving" || state.phase === "unavailable") {
    return null;
  }

  if (state.phase === "error") {
    const action = getLifecycleFeedbackLabel(state.action);

    return (
      <ErrorState
        title={`${action} failed`}
        message={state.errorMessage ?? "Unable to update this job lifecycle."}
        onRetry={onRetry}
        retryLabel="Review and retry"
        retryAriaLabel={`Review and retry ${action.toLowerCase()}`}
      />
    );
  }

  return (
    <Card
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="border-emerald-300/25 bg-emerald-400/[0.07]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-200">
            <CheckCircle2 aria-hidden="true" size={20} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-50">Job lifecycle updated</p>
            <p className="mt-1 text-sm leading-6 text-emerald-50/80">
              The job service returned status <span className="font-semibold">{state.sourceJob.status}</span> for {state.sourceJob.title || "this job"}.
            </p>
            <StatusBadge status={state.sourceJob.status} className="mt-3" />
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss} className="shrink-0 text-emerald-100/80 hover:text-emerald-50">
          Dismiss
        </Button>
      </div>
    </Card>
  );
}

function getLifecycleFeedbackLabel(action: JobLifecycleAction | null): string {
  switch (action) {
    case "PUBLISH":
      return "Publish job";
    case "ARCHIVE":
      return "Close job";
    case "REOPEN":
      return "Reopen job";
    case "SAVE_AS_DRAFT":
      return "Save draft";
    default:
      return "Job lifecycle update";
  }
}
