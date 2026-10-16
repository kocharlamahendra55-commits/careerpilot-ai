"use client";

import { useId } from "react";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Clock, MapPin, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { PublishedJobListItem } from "@/features/student-jobs/types";

export interface JobCardProps {
  readonly job: PublishedJobListItem;
  /**
   * Whether this job was applied to (or opened) during the current session.
   * Sourced best-effort from the applied-store by the page; see applied-store.ts
   * for why prior-session applications are not reflected here.
   */
  readonly applied?: boolean;
  readonly className?: string;
}

/**
 * Reusable published-job summary card: title, company, location, salary and a
 * relative posted date, with an optional "Applied" badge. The primary CTA is a
 * single anchor styled as a button (no nested interactive elements) that links
 * to the job detail/apply route handled in Part 2.
 */
export function JobCard({ job, applied = false, className }: JobCardProps) {
  const titleId = useId();

  const title = job.title.trim() || "Untitled role";
  const company = job.company.trim();
  const location = job.location.trim();
  const salary = job.salary.trim();
  const posted = formatPosted(job.createdAt);
  const companyInitial = company.charAt(0).toUpperCase() || "\u2022";
  const detailHref = `/dashboard/jobs/${encodeURIComponent(job.id)}`;
  const ctaLabel = `View and apply to ${title}${company ? ` at ${company}` : ""}`;

  return (
    <Card
      aria-labelledby={titleId}
      className={cn(
        "flex h-full flex-col gap-4 hover:border-brand-purple/30 motion-reduce:transition-none",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-purple/20 bg-gradient-to-br from-brand-purple/30 to-brand-indigo/15 text-sm font-bold text-brand-purple-light"
        >
          {companyInitial}
        </span>

        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="truncate text-base font-semibold tracking-tight text-white/90">
            {title}
          </h3>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-white/50">
            <Building2 aria-hidden="true" size={13} className="shrink-0 text-white/30" />
            <span className="truncate">{company || "Company undisclosed"}</span>
          </p>
        </div>

        {applied ? (
          <Badge variant="green" className="shrink-0">
            <CheckCircle2 aria-hidden="true" size={11} />
            Applied
          </Badge>
        ) : null}
      </div>

      <dl className="grid gap-2 text-sm">
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

        <div className="flex items-center gap-2 text-white/40">
          <dt className="sr-only">Posted</dt>
          <Clock aria-hidden="true" size={14} className="shrink-0 text-white/30" />
          <dd>
            {posted.iso ? <time dateTime={posted.iso}>{posted.label}</time> : posted.label}
          </dd>
        </div>
      </dl>

      <div className="mt-auto pt-2">
        <Link
          href={detailHref}
          aria-label={ctaLabel}
          className={cn(buttonVariants({ variant: "primary", size: "sm" }), "w-full")}
        >
          <span>View &amp; Apply</span>
          <ArrowRight aria-hidden="true" size={15} strokeWidth={2} />
        </Link>
      </div>
    </Card>
  );
}

function formatPosted(createdAt: string): { label: string; iso: string | null } {
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) {
    return { label: "Recently posted", iso: null };
  }
  return {
    label: `Posted ${formatRelativeDate(createdAt)}`,
    iso: new Date(timestamp).toISOString(),
  };
}
