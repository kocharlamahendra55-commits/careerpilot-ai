"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import {
  CandidateFilters,
  CandidateTable,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  WorkspacePageHeader,
  WorkspacePageShell,
  type CandidateDetailLaunchState,
} from "@/components/recruiter/workspace";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getCandidateDetailEntry } from "@/features/recruiter-workspace/candidate-detail-cache";
import {
  sortCandidatePage,
  type CandidateSort,
} from "@/features/recruiter-workspace/candidate-page-sort";
import {
  projectCandidateRows,
  type CandidateRow,
  type CandidateTextCell,
} from "@/features/recruiter-workspace/candidate-row-projection";
import { useRecruiterCandidateCollection } from "@/features/recruiter-workspace/use-candidate-collection";
import { useCandidateDetailCache } from "./layout";

const IDLE_LAUNCH_STATE: CandidateDetailLaunchState = { phase: "idle", message: null };

function candidateProfilePath(applicationId: string): string {
  return `/recruiter/candidates/${encodeURIComponent(applicationId)}`;
}

export default function RecruiterCandidatesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const isRecruiter = Boolean(user) && user?.role === "RECRUITER";
  const collectionEnabled = !authLoading && isRecruiter;

  const {
    phase,
    response,
    errorMessage,
    query,
    updateQuery,
    resetQuery,
    reload,
  } = useRecruiterCandidateCollection({ enabled: collectionEnabled });
  const { cache, getEntry, loadDetail } = useCandidateDetailCache();
  const [sort, setSort] = useState<CandidateSort | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<ReadonlyMap<string, string>>(
    () => new Map()
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login");
    }
  }, [authLoading, user]);  // Fixed: removed router from deps

  // A fresh authoritative collection already reflects any persisted status
  // change, so drop local overrides whenever a new response arrives (refresh,
  // filter, or page change) and prefer the server-authoritative status.
  useEffect(() => {
    setStatusOverrides(new Map());
  }, [response]);

  const applications = useMemo(() => response?.applications ?? [], [response]);
  const pagination = response?.pagination ?? null;

  const rows = useMemo(() => {
    const projected = projectCandidateRows(applications, cache);
    const withOverrides =
      statusOverrides.size === 0
        ? projected
        : projected.map((row): CandidateRow => {
            const override = statusOverrides.get(row.applicationId);
            if (override === undefined) {
              return row;
            }

            const status: CandidateTextCell = {
              available: true,
              text: override,
              comparable: override.trim().toLowerCase(),
            };

            return { ...row, status };
          });

    return sortCandidatePage(withOverrides, sort);
  }, [applications, cache, sort, statusOverrides]);

  const detailStates = useMemo(() => {
    const states = new Map<string, CandidateDetailLaunchState>();

    for (const row of rows) {
      const entry = getCandidateDetailEntry(cache, row.applicationId);

      if (entry === null || entry.status === "success") {
        states.set(row.applicationId, IDLE_LAUNCH_STATE);
      } else if (entry.status === "loading") {
        states.set(row.applicationId, { phase: "loading", message: null });
      } else {
        states.set(row.applicationId, { phase: "error", message: entry.errorMessage });
      }
    }

    return states;
  }, [rows, cache]);

  const handleViewCandidate = useCallback(
    async (applicationId: string) => {
      const entry = getEntry(applicationId);

      // Do not start a second request while one is in flight for this row.
      if (entry !== null && entry.status === "loading") {
        return;
      }

      // A prior same-ID success is reused; navigate without another request.
      if (entry !== null && entry.status === "success") {
        router.push(candidateProfilePath(applicationId));
        return;
      }

      const outcome = await loadDetail(applicationId);

      if (outcome.status === "success") {
        router.push(candidateProfilePath(applicationId));
      }
    },
    [getEntry, loadDetail, router]
  );

  const onViewCandidate = useCallback(
    (applicationId: string) => {
      void handleViewCandidate(applicationId);
    },
    [handleViewCandidate]
  );

  const header = (
    <WorkspacePageHeader
      titleId="candidates-heading"
      eyebrow="Recruiter workspace"
      title="Candidates"
      description="Review real applications for your recruiter-owned jobs. ATS and resume details load per candidate on request."
      breadcrumbs={[
        { label: "Recruiter workspace", href: "/recruiter/dashboard" },
        { label: "Candidates" },
      ]}
      actions={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void reload()}
          loading={phase === "refreshing"}
          disabled={phase === "loading" || !collectionEnabled}
          aria-label="Refresh the loaded candidate page"
        >
          {phase !== "refreshing" ? <RefreshCw aria-hidden="true" size={16} strokeWidth={2} /> : null}
          {phase === "refreshing" ? "Refreshing" : "Refresh"}
        </Button>
      }
    />
  );

  if (authLoading || !user) {
    return (
      <WorkspacePageShell labelledBy="candidates-heading" maxWidth="wide">
        {header}
        <LoadingSkeleton label="candidate list" variant="table" rows={6} />
      </WorkspacePageShell>
    );
  }

  if (!isRecruiter) {
    return (
      <WorkspacePageShell labelledBy="candidates-heading" maxWidth="compact">
        {header}
        <ErrorState
          title="Recruiter access is required"
          message="Only recruiter accounts can review candidate applications."
        />
      </WorkspacePageShell>
    );
  }

  if ((phase === "idle" || phase === "loading") && response === null) {
    return (
      <WorkspacePageShell labelledBy="candidates-heading" maxWidth="wide">
        {header}
        <LoadingSkeleton label="candidate list" variant="table" rows={6} />
      </WorkspacePageShell>
    );
  }

  if (phase === "error" && response === null) {
    return (
      <WorkspacePageShell labelledBy="candidates-heading" maxWidth="compact">
        {header}
        <ErrorState
          title="Candidates could not be loaded"
          message={errorMessage ?? "Unable to load candidates."}
          onRetry={reload}
          retryLabel="Reload candidates"
          retryAriaLabel="Retry loading recruiter candidates"
        />
      </WorkspacePageShell>
    );
  }

  const hasActiveFilters = Boolean(
    query.search.trim() || query.status !== null || query.jobId !== null
  );

  return (
    <WorkspacePageShell labelledBy="candidates-heading" maxWidth="wide">
      {header}

      {phase === "refreshing" ? (
        <p role="status" aria-live="polite" className="text-sm text-brand-cyan-light">
          Refreshing the loaded candidate pageâ€¦
        </p>
      ) : null}

      <CandidateFilters
        query={query}
        pagination={pagination}
        sort={sort}
        onSearchChange={(search) => updateQuery({ type: "set-search", search })}
        onStatusChange={(status) => updateQuery({ type: "set-status", status })}
        onJobIdChange={(jobId) => updateQuery({ type: "set-job-id", jobId })}
        onPageChange={(page) => updateQuery({ type: "set-page", page })}
        onSortChange={setSort}
        onReset={resetQuery}
      />

      {phase === "error" ? (
        <ErrorState
          title="The latest candidate refresh failed"
          message={errorMessage ?? "Unable to refresh candidates."}
          onRetry={reload}
          retryLabel="Retry refresh"
          retryAriaLabel="Retry refreshing recruiter candidates"
        />
      ) : null}

      {applications.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="No candidates match these filters"
            description="Change or reset the search, status, or job filters to see applications returned by the application service."
            action={{ label: "Reset filters", onClick: resetQuery, variant: "secondary" }}
          />
        ) : (
          <EmptyState
            title="No applications yet"
            description="Applications for your recruiter-owned jobs will appear here as candidates apply. Publish and manage roles to start receiving applications."
            action={{ label: "Manage jobs", href: "/recruiter/jobs", variant: "primary" }}
          />
        )
      ) : (
        <CandidateTable
          rows={rows}
          detailStates={detailStates}
          onViewCandidate={onViewCandidate}
          onStatusUpdated={(applicationId, newStatus) =>
            setStatusOverrides((prev) => {
              const next = new Map(prev);
              next.set(applicationId, newStatus);
              return next;
            })
          }
          sort={sort}
        />
      )}
    </WorkspacePageShell>
  );
}

