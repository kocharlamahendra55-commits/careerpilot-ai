"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Pencil, RefreshCw } from "lucide-react";
import { JobPreview } from "@/components/recruiter/workspace/JobPreview";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  StatusBadge,
  UnavailabilityIndicator,
  WorkspacePageHeader,
  WorkspacePageShell,
} from "@/components/recruiter/workspace";
import { buttonVariants } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { createJobFormStateFromPersistedJob } from "@/features/recruiter-workspace/job-form";
import { useRecruiterJobDetail } from "@/features/recruiter-workspace/use-job-detail";
import { isJobLifecycleStatus } from "@/features/recruiter-workspace/types";

export default function RecruiterJobDetailPage() {
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
      titleId="job-detail-heading"
      eyebrow="Recruiter workspace"
      title="Job posting"
      description="A source-backed view of this recruiter-owned job record."
      breadcrumbs={[
        { label: "Recruiter workspace", href: "/recruiter/dashboard" },
        { label: "Job posting" },
      ]}
      actions={
        jobResource.job ? (
          <Link
            href={`/recruiter/jobs/${encodeURIComponent(jobResource.job.id)}/edit`}
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            <Pencil aria-hidden="true" size={16} strokeWidth={2} />
            Edit job
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
      <WorkspacePageShell labelledBy="job-detail-heading" maxWidth="wide">
        {header}
        <LoadingSkeleton label="job detail" variant="profile" rows={5} />
      </WorkspacePageShell>
    );
  }

  if (jobResource.isNotFound) {
    return (
      <WorkspacePageShell labelledBy="job-detail-heading" maxWidth="compact">
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
      <WorkspacePageShell labelledBy="job-detail-heading" maxWidth="compact">
        {header}
        <ErrorState
          title="Job detail could not be loaded"
          message={jobResource.errorMessage ?? "Unable to load this job."}
          onRetry={jobResource.reload}
          retryLabel="Reload job"
          retryAriaLabel="Reload this job"
        />
      </WorkspacePageShell>
    );
  }

  if (!isJobLifecycleStatus(jobResource.job.status)) {
    return (
      <WorkspacePageShell labelledBy="job-detail-heading" maxWidth="compact">
        {header}
        <ErrorState
          title="Unsupported job status"
          message="This source record returned a status that cannot be safely represented by the current job workspace."
        />
      </WorkspacePageShell>
    );
  }

  const job = jobResource.job;

  return (
    <WorkspacePageShell labelledBy="job-detail-heading" maxWidth="wide">
      {header}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <JobPreview
          form={form}
          title="Source-backed posting"
          description="Values shown below come from the existing recruiter job detail service."
        />

        <Card className="h-fit">
          <CardHeader className="items-start gap-3">
            <div>
              <CardTitle>Record details</CardTitle>
              <p className="mt-1.5 text-sm leading-6 text-white/50">
                Read-only metadata from the current job record.
              </p>
            </div>
            <StatusBadge status={job.status} className="ml-auto shrink-0" />
          </CardHeader>
          <CardContent>
            <dl className="space-y-4 text-sm">
              <DetailValue label="Company">
                {job.company.trim() ? (
                  <span className="break-words text-white/80">{job.company}</span>
                ) : (
                  <UnavailabilityIndicator message="Company was not returned for this job." dependency="D2" />
                )}
              </DetailValue>
              <DetailValue label="Created">
                <SourceDate value={job.createdAt} />
              </DetailValue>
              <DetailValue label="Last updated">
                <SourceDate value={job.updatedAt} />
              </DetailValue>
              <DetailValue label="Record ID">
                <code className="break-all rounded bg-black/20 px-1.5 py-1 text-xs text-white/65">
                  {job.id}
                </code>
              </DetailValue>
            </dl>

            <Link
              href={`/recruiter/jobs/${encodeURIComponent(job.id)}/edit`}
              className={buttonVariants({ variant: "outline", size: "md" }) + " mt-6 w-full"}
            >
              <Pencil aria-hidden="true" size={16} strokeWidth={2} />
              Edit this job
            </Link>
            <button
              type="button"
              onClick={() => void jobResource.reload()}
              className={buttonVariants({ variant: "ghost", size: "sm" }) + " mt-2 w-full"}
            >
              <RefreshCw aria-hidden="true" size={15} strokeWidth={2} />
              Refresh source record
            </button>
          </CardContent>
        </Card>
      </div>
    </WorkspacePageShell>
  );
}

function DetailValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-[0.12em] text-white/40">{label}</dt>
      <dd className="mt-1.5 min-w-0">{children}</dd>
    </div>
  );
}

function SourceDate({ value }: { value: string }) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return <UnavailabilityIndicator message="A valid timestamp was not returned for this record." />;
  }

  const formatted = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));

  return (
    <time dateTime={value} className="inline-flex items-center gap-1.5 text-white/80">
      <CalendarDays aria-hidden="true" size={15} className="text-brand-cyan-light" />
      {formatted}
    </time>
  );
}
