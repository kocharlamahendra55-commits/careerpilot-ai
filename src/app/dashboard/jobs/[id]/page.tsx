"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  RefreshCw,
  SearchX,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { JobDetailSkeleton } from "@/components/student/jobs/JobDetailSkeleton";
import { ApplyPanel } from "@/components/student/jobs/ApplyPanel";
import { useJobDetail } from "@/features/student-jobs/use-job-detail";
import {
  isJsonArrayRequirements,
  parseJobRequirements,
  type PublishedJobDetail,
} from "@/features/student-jobs/job-detail-types";
import { formatRelativeDate } from "@/lib/utils";

const BROWSE_HREF = "/dashboard/jobs";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.06, duration: 0.4, ease: "easeOut" as const },
  }),
};

export default function JobDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const jobId = readRouteId(params?.id);

  const { phase, job, hasApplied, notFound, errorMessage, reload, markApplied } =
    useJobDetail(jobId);

  let content: React.ReactNode;
  if (notFound) {
    content = <NotFoundPanel message={errorMessage} />;
  } else if (job) {
    content = <JobDetail job={job} hasApplied={hasApplied} onApplied={markApplied} />;
  } else if (phase === "error") {
    content = <ErrorPanel message={errorMessage} onRetry={reload} />;
  } else {
    content = <JobDetailSkeleton />;
  }

  return (
    <div className="space-y-6">
      <BackLink />
      {content}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href={BROWSE_HREF}
      className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-white/50 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-[#050816]"
    >
      <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
      Back to all jobs
    </Link>
  );
}

function JobDetail({
  job,
  hasApplied,
  onApplied,
}: {
  job: PublishedJobDetail;
  hasApplied: boolean;
  onApplied: () => void;
}) {
  const title = job.title || "Untitled role";
  const company = job.company;
  const location = job.location;
  const salary = job.salary;
  const posted = formatPosted(job.createdAt);
  const companyInitial = company.charAt(0).toUpperCase() || "\u2022";
  const description = job.description;

  const tags = parseJobRequirements(job.requirements);
  const rawRequirements = job.requirements.trim();
  const showRawRequirements =
    tags.length === 0 && !isJsonArrayRequirements(job.requirements) && rawRequirements.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.section initial="hidden" animate="visible" variants={fadeUp} aria-labelledby="job-title">
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-brand-purple/20 bg-gradient-to-br from-brand-purple/30 to-brand-indigo/15 text-lg font-bold text-brand-purple-light"
            >
              {companyInitial}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 id="job-title" className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                    {title}
                  </h1>
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-white/55">
                    <Building2 aria-hidden="true" size={14} className="shrink-0 text-white/35" />
                    <span className="truncate">{company || "Company undisclosed"}</span>
                  </p>
                </div>

                {hasApplied ? (
                  <Badge variant="green" className="shrink-0">
                    <CheckCircle2 aria-hidden="true" size={12} />
                    Already applied
                  </Badge>
                ) : null}
              </div>

              <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <div className="flex min-w-0 items-center gap-2 text-white/60">
                  <dt className="sr-only">Location</dt>
                  <MapPin aria-hidden="true" size={14} className="shrink-0 text-brand-cyan-light/70" />
                  <dd className="truncate">{location || "Location flexible"}</dd>
                </div>

                {salary ? (
                  <div className="flex min-w-0 items-center gap-2 text-white/60">
                    <dt className="sr-only">Salary</dt>
                    <Wallet aria-hidden="true" size={14} className="shrink-0 text-emerald-400/70" />
                    <dd className="truncate">{salary}</dd>
                  </div>
                ) : null}

                <div className="flex items-center gap-2 text-white/45">
                  <dt className="sr-only">Posted</dt>
                  <Clock aria-hidden="true" size={14} className="shrink-0 text-white/30" />
                  <dd>{posted.iso ? <time dateTime={posted.iso}>{posted.label}</time> : posted.label}</dd>
                </div>
              </dl>
            </div>
          </div>
        </Card>
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Description */}
          <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={1} aria-labelledby="job-description-heading">
            <Card>
              <h2 id="job-description-heading" className="flex items-center gap-2 text-base font-semibold tracking-tight text-white/90">
                <FileText aria-hidden="true" size={16} className="text-brand-purple-light" />
                Job description
              </h2>
              {description.length > 0 ? (
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-white/70">
                  {description}
                </p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-white/45">No description provided for this role.</p>
              )}
            </Card>
          </motion.section>

          {/* Requirements */}
          <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={2} aria-labelledby="job-requirements-heading">
            <Card>
              <h2 id="job-requirements-heading" className="flex items-center gap-2 text-base font-semibold tracking-tight text-white/90">
                <Sparkles aria-hidden="true" size={16} className="text-brand-cyan-light" />
                Requirements &amp; skills
              </h2>

              {tags.length > 0 ? (
                <ul className="mt-3 flex list-none flex-wrap gap-2">
                  {tags.map((tag) => (
                    <li key={tag}>
                      <Badge variant="purple">{tag}</Badge>
                    </li>
                  ))}
                </ul>
              ) : showRawRequirements ? (
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-white/70">
                  {rawRequirements}
                </p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-white/45">
                  No specific requirements were listed for this role.
                </p>
              )}
            </Card>
          </motion.section>
        </div>

        {/* Apply */}
        <div className="min-w-0 lg:col-span-1">
          <motion.section
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            aria-labelledby="job-apply-heading"
            className="lg:sticky lg:top-6"
          >
            <h2 id="job-apply-heading" className="mb-3 text-base font-semibold tracking-tight text-white/90">
              Apply for this role
            </h2>
            <ApplyPanel jobId={job.id} jobTitle={title} hasApplied={hasApplied} onApplied={onApplied} />
          </motion.section>
        </div>
      </div>
    </div>
  );
}

function NotFoundPanel({ message }: { message: string | null }) {
  const hasMessage = typeof message === "string" && message.trim().length > 0;
  return (
    <Card role="status" aria-live="polite" className="border-dashed border-white/10 bg-white/[0.02] text-center">
      <div className="mx-auto flex max-w-xl flex-col items-center px-1 py-4 sm:px-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/10 text-brand-purple-light">
          <SearchX aria-hidden="true" size={23} strokeWidth={1.9} />
        </span>
        <h1 className="mt-5 text-lg font-semibold tracking-tight text-white">
          {hasMessage ? "Can\u2019t show this job" : "Job not available"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-white/60">
          {hasMessage
            ? message
            : "This role may have been closed or is no longer published \u2014 or the link may be incorrect."}
        </p>
        <Link href={BROWSE_HREF} className="mt-6">
          <Button type="button" variant="secondary" aria-label="Back to all jobs">
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
            Back to all jobs
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function ErrorPanel({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <Card role="alert" aria-live="assertive" className="border-red-400/25 bg-red-500/[0.06] text-center">
      <div className="mx-auto flex max-w-xl flex-col items-center px-1 py-2 sm:px-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-300/25 bg-red-500/10 text-red-200">
          <AlertTriangle aria-hidden="true" size={22} strokeWidth={1.9} />
        </span>
        <h1 className="mt-5 text-lg font-semibold tracking-tight text-white">Couldn&apos;t load this job</h1>
        <p className="mt-2 text-sm leading-6 text-white/70">
          {message?.trim() || "Unable to load this job right now. Please try again."}
        </p>
        <Button type="button" variant="secondary" onClick={onRetry} aria-label="Try loading this job again" className="mt-6">
          <RefreshCw aria-hidden="true" size={16} strokeWidth={2} />
          Try again
        </Button>
      </div>
    </Card>
  );
}

function readRouteId(value: string | string[] | undefined): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
    return value[0].trim();
  }
  return "";
}

function formatPosted(createdAt: string): { label: string; iso: string | null } {
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) {
    return { label: "Recently posted", iso: null };
  }
  return { label: `Posted ${formatRelativeDate(createdAt)}`, iso: new Date(timestamp).toISOString() };
}
