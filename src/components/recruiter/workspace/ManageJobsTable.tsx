"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import {
  Archive,
  CalendarDays,
  ExternalLink,
  Pencil,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { JobLifecycleAction } from "@/features/recruiter-workspace/job-lifecycle";
import type { RecruiterJob } from "@/features/recruiter-workspace/types";
import { StatusBadge } from "./StatusBadge";
import { UnavailabilityIndicator } from "./UnavailabilityIndicator";

export interface ManageJobsTableProps {
  readonly jobs: readonly RecruiterJob[];
  readonly lifecyclePendingJobId?: string | null;
  readonly onLifecycleAction: (
    job: RecruiterJob,
    action: JobLifecycleAction,
    trigger: HTMLButtonElement
  ) => void;
}

interface LifecycleControl {
  readonly action: Exclude<JobLifecycleAction, "DELETE">;
  readonly label: string;
  readonly variant: "secondary" | "success";
}

const SOURCE_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Renders only the visible page supplied by the pure Manage Jobs transform.
 * Desktop uses a semantic table; mobile retains all row labels and actions in
 * stacked source-backed cards rather than hiding table information.
 */
export function ManageJobsTable({
  jobs,
  lifecyclePendingJobId = null,
  onLifecycleAction,
}: ManageJobsTableProps) {
  return (
    <section aria-labelledby="manage-jobs-table-heading" className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="manage-jobs-table-heading" className="text-base font-semibold text-white/90 sm:text-lg">
            Job postings
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Status, application metrics, and timestamps reflect the loaded job source data.
          </p>
        </div>
      </div>

      <Card className="hidden overflow-hidden p-3 sm:p-4 md:block">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[64rem]" aria-describedby="manage-jobs-table-heading">
            <caption className="sr-only">
              Recruiter job postings with source-backed status, application metrics, dates, and actions.
            </caption>
            <thead>
              <tr>
                <th scope="col">Job</th>
                <th scope="col">Status</th>
                <th scope="col">Applications</th>
                <th scope="col">Created</th>
                <th scope="col">Updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="min-w-64 align-top">
                    <JobIdentity job={job} />
                  </td>
                  <td className="align-top">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="min-w-40 align-top">
                    <ApplicationMetric job={job} />
                  </td>
                  <td className="min-w-36 align-top">
                    <SourceDate value={job.createdAt} label="creation date" />
                  </td>
                  <td className="min-w-36 align-top">
                    <SourceDate value={job.updatedAt} label="last updated date" />
                  </td>
                  <td className="min-w-72 align-top">
                    <JobActionControls
                      job={job}
                      isSaving={lifecyclePendingJobId === job.id}
                      onLifecycleAction={onLifecycleAction}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-3 md:hidden">
        {jobs.map((job) => (
          <Card key={job.id} className="space-y-4 p-4 sm:p-5">
            <div className="flex min-w-0 flex-col gap-3 xs:flex-row xs:items-start xs:justify-between">
              <JobIdentity job={job} compact />
              <StatusBadge status={job.status} className="w-fit shrink-0" />
            </div>

            <dl className="grid gap-3 border-y border-white/8 py-3 text-sm sm:grid-cols-2">
              <MobileValue label="Applications">
                <ApplicationMetric job={job} />
              </MobileValue>
              <MobileValue label="Created">
                <SourceDate value={job.createdAt} label="creation date" />
              </MobileValue>
              <MobileValue label="Updated">
                <SourceDate value={job.updatedAt} label="last updated date" />
              </MobileValue>
            </dl>

            <JobActionControls
              job={job}
              isSaving={lifecyclePendingJobId === job.id}
              onLifecycleAction={onLifecycleAction}
            />
          </Card>
        ))}
      </div>
    </section>
  );
}

function JobIdentity({ job, compact = false }: { job: RecruiterJob; compact?: boolean }) {
  const title = job.title.trim();
  const company = job.company.trim();
  const location = job.location.trim();

  return (
    <div className="min-w-0">
      {title ? (
        <p className="break-words font-semibold text-white/90">{title}</p>
      ) : (
        <UnavailabilityIndicator message="A job title was not returned for this record." />
      )}
      <div className="mt-1.5 space-y-1 text-xs leading-5 text-white/55">
        {company ? <p className="break-words">{company}</p> : <UnavailabilityIndicator message="Company was not returned for this job." />}
        {location ? <p className="break-words">{location}</p> : <UnavailabilityIndicator message="Location was not returned for this job." />}
      </div>
      {compact ? null : <span className="sr-only">Job details</span>}
    </div>
  );
}

function ApplicationMetric({ job }: { job: RecruiterJob }) {
  const count = job._count?.applications;

  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) {
    return (
      <UnavailabilityIndicator message="Application metrics were not returned for this job." />
    );
  }

  const formatted = new Intl.NumberFormat("en-US").format(count);

  return <span className="font-medium text-white/80">{formatted}</span>;
}

function SourceDate({ value, label }: { value: string; label: string }) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return <UnavailabilityIndicator message={`A valid ${label} was not returned for this job.`} />;
  }

  return (
    <time dateTime={value} className="inline-flex items-center gap-1.5 text-white/75">
      <CalendarDays aria-hidden="true" size={15} className="shrink-0 text-brand-cyan-light" />
      {SOURCE_DATE_FORMATTER.format(new Date(timestamp))}
    </time>
  );
}

function MobileValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-[0.1em] text-white/40">{label}</dt>
      <dd className="mt-1.5 min-w-0">{children}</dd>
    </div>
  );
}

function JobActionControls({
  job,
  isSaving,
  onLifecycleAction,
}: {
  job: RecruiterJob;
  isSaving: boolean;
  onLifecycleAction: ManageJobsTableProps["onLifecycleAction"];
}) {
  const lifecycleControls = getLifecycleControls(job.status);
  const jobLabel = job.title.trim() || "this job";

  function handleLifecycleAction(
    action: JobLifecycleAction,
    event: MouseEvent<HTMLButtonElement>
  ) {
    onLifecycleAction(job, action, event.currentTarget);
  }

  return (
    <div role="group" aria-label={`Actions for ${jobLabel}`} className="flex min-w-0 flex-wrap gap-2">
      <Link
        href={`/recruiter/jobs/${encodeURIComponent(job.id)}`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ExternalLink aria-hidden="true" size={15} strokeWidth={2} />
        View
      </Link>
      <Link
        href={`/recruiter/jobs/${encodeURIComponent(job.id)}/edit`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <Pencil aria-hidden="true" size={15} strokeWidth={2} />
        Edit
      </Link>

      {lifecycleControls.length > 0 ? (
        lifecycleControls.map((lifecycle) => (
          <Button
            key={lifecycle.action}
            type="button"
            variant={lifecycle.variant}
            size="sm"
            onClick={(event) => handleLifecycleAction(lifecycle.action, event)}
            disabled={isSaving}
            loading={isSaving}
            aria-label={`${lifecycle.label} ${jobLabel}`}
          >
            {!isSaving ? <LifecycleIcon action={lifecycle.action} /> : null}
            {isSaving ? "Updating" : lifecycle.label}
          </Button>
        ))
      ) : (
        <UnavailabilityIndicator message="No supported lifecycle transition is available for this source status." />
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={(event) => handleLifecycleAction("DELETE", event)}
        disabled={isSaving}
        aria-label={`Why deleting ${jobLabel} is unavailable`}
        title="Delete is unavailable with the current job service"
        className="text-white/45 hover:text-amber-100"
      >
        <Trash2 aria-hidden="true" size={15} strokeWidth={2} />
        Delete unavailable
      </Button>
    </div>
  );
}

function LifecycleIcon({ action }: { action: LifecycleControl["action"] }) {
  switch (action) {
    case "PUBLISH":
      return <Send aria-hidden="true" size={15} strokeWidth={2} />;
    case "ARCHIVE":
    case "SAVE_AS_DRAFT":
      return <Archive aria-hidden="true" size={15} strokeWidth={2} />;
    case "REOPEN":
      return <RefreshCw aria-hidden="true" size={15} strokeWidth={2} />;
  }
}

function getLifecycleControls(status: string): readonly LifecycleControl[] {
  switch (status) {
    case "DRAFT":
      return [{ action: "PUBLISH", label: "Publish", variant: "success" }];
    case "PUBLISHED":
      return [
        { action: "ARCHIVE", label: "Close job", variant: "secondary" },
        { action: "SAVE_AS_DRAFT", label: "Save as draft", variant: "secondary" },
      ];
    case "ARCHIVED":
      return [
        { action: "REOPEN", label: "Reopen", variant: "success" },
        { action: "SAVE_AS_DRAFT", label: "Save as draft", variant: "secondary" },
      ];
    default:
      return [];
  }
}
