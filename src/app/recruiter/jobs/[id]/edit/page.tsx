"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { JobForm } from "@/components/recruiter/workspace/JobForm";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  WorkspacePageHeader,
  WorkspacePageShell,
} from "@/components/recruiter/workspace";
import { buttonVariants } from "@/components/ui/Button";
import {
  createJobFormStateFromPersistedJob,
} from "@/features/recruiter-workspace/job-form";
import { useRecruiterJobDetail } from "@/features/recruiter-workspace/use-job-detail";
import { isJobLifecycleStatus } from "@/features/recruiter-workspace/types";

export default function EditRecruiterJobPage() {
  const params = useParams<{ id?: string | string[] }>();
  const jobId = typeof params?.id === "string" ? params.id : "";
  const jobResource = useRecruiterJobDetail(jobId);
  const form = useMemo(
    () =>
      jobResource.job
        ? createJobFormStateFromPersistedJob(jobResource.job)
        : null,
    [jobResource.job]
  );

  const header = (
    <WorkspacePageHeader
      titleId="edit-job-heading"
      eyebrow="Recruiter workspace"
      title="Edit job posting"
      description="Persisted values are loaded from your recruiter-owned job before they can be edited."
      breadcrumbs={[
        { label: "Recruiter workspace", href: "/recruiter/dashboard" },
        { label: "Edit job" },
      ]}
      actions={
        jobResource.job ? (
          <Link
            href={`/recruiter/jobs/${encodeURIComponent(jobResource.job.id)}`}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <ExternalLink aria-hidden="true" size={16} strokeWidth={2} />
            View job
          </Link>
        ) : (
          <Link
            href="/recruiter/dashboard"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
            Dashboard
          </Link>
        )
      }
    />
  );

  if (jobResource.phase === "idle" || jobResource.phase === "loading" || jobResource.phase === "refreshing") {
    return (
      <WorkspacePageShell labelledBy="edit-job-heading" maxWidth="wide">
        {header}
        <LoadingSkeleton label="job editing form" variant="form" rows={8} />
      </WorkspacePageShell>
    );
  }

  if (jobResource.isNotFound) {
    return (
      <WorkspacePageShell labelledBy="edit-job-heading" maxWidth="compact">
        {header}
        <EmptyState
          title="Job not found"
          description="This job is unavailable or no longer belongs to your recruiter account."
          action={{ label: "Return to dashboard", href: "/recruiter/dashboard", variant: "secondary" }}
        />
      </WorkspacePageShell>
    );
  }

  if (jobResource.phase === "error" || !jobResource.job || !form) {
    return (
      <WorkspacePageShell labelledBy="edit-job-heading" maxWidth="compact">
        {header}
        <ErrorState
          title="Job editing could not be loaded"
          message={jobResource.errorMessage ?? "Unable to load this job for editing."}
          onRetry={jobResource.reload}
          retryLabel="Reload job"
        />
      </WorkspacePageShell>
    );
  }

  if (!isJobLifecycleStatus(jobResource.job.status)) {
    return (
      <WorkspacePageShell labelledBy="edit-job-heading" maxWidth="compact">
        {header}
        <ErrorState
          title="Unsupported job status"
          message="This job returned a status that cannot be safely edited through the current job contract."
        />
      </WorkspacePageShell>
    );
  }

  return (
    <WorkspacePageShell labelledBy="edit-job-heading" maxWidth="wide">
      {header}
      <JobForm
        mode="edit"
        jobId={jobResource.job.id}
        sourceStatus={jobResource.job.status}
        initialForm={form}
      />
    </WorkspacePageShell>
  );
}
