"use client";

import { Fragment, type CSSProperties, type ReactNode } from "react";
import { CalendarDays, FileText, Gauge } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type {
  CandidateDateCell,
  CandidateNameCell,
  CandidateRow,
  CandidateScoreCell,
  CandidateTextCell,
} from "@/features/recruiter-workspace/candidate-row-projection";
import type {
  CandidateSort,
  CandidateSortField,
} from "@/features/recruiter-workspace/candidate-page-sort";
import { ApplicationStatusActions } from "./ApplicationStatusActions";
import {
  CandidateDetailLauncher,
  type CandidateDetailLaunchState,
} from "./CandidateDetailLauncher";
import { StatusBadge } from "./StatusBadge";
import { UnavailabilityIndicator } from "./UnavailabilityIndicator";

export interface CandidateTableProps {
  /** Rows already projected from the list response and page-scope sorted. */
  readonly rows: readonly CandidateRow[];
  /** Row-local detail launch state keyed by the same application ID. */
  readonly detailStates: ReadonlyMap<string, CandidateDetailLaunchState>;
  /** Starts exactly one detail fetch for the selected application. */
  readonly onViewCandidate: (applicationId: string) => void;
  /** Called after a per-row status update succeeds, with the new source status. */
  readonly onStatusUpdated: (applicationId: string, newStatus: string) => void;
  readonly sort: CandidateSort | null;
}

const SOURCE_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const IDLE_LAUNCH_STATE: CandidateDetailLaunchState = { phase: "idle", message: null };

/** Neutralizes the shared data-table cell chrome so a full-width row can host a card. */
const FULL_WIDTH_CELL_STYLE: CSSProperties = {
  background: "transparent",
  borderColor: "transparent",
  paddingTop: 0,
  paddingLeft: 0,
  paddingRight: 0,
  borderRadius: 0,
};

/**
 * Presents the retrieved candidate page. Desktop uses a semantic table; mobile
 * uses stacked cards with the same labels and actions. ATS and resume cells stay
 * unavailable until a matching same-ID detail is fetched, and every source-backed
 * application carries the reusable, disabled application status actions.
 */
export function CandidateTable({
  rows,
  detailStates,
  onViewCandidate,
  onStatusUpdated,
  sort,
}: CandidateTableProps) {
  return (
    <section aria-labelledby="candidate-table-heading" className="space-y-3">
      <div className="flex flex-col gap-1">
        <h2 id="candidate-table-heading" className="text-base font-semibold text-white/90 sm:text-lg">
          Applications
        </h2>
        <p className="text-sm text-white/50">
          Candidate identity, applied date, and status come from the list response. ATS and resume
          load per candidate when you open a profile.
        </p>
      </div>

      <Card className="hidden overflow-hidden p-3 sm:p-4 md:block">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[64rem]" aria-describedby="candidate-table-heading">
            <caption className="sr-only">
              Recruiter-owned applications with source-backed candidate, applied date, and status,
              per-candidate ATS and resume enrichment, and disabled status actions.
            </caption>
            <thead>
              <tr>
                <th scope="col" aria-sort={ariaSortFor("candidate", sort)}>Candidate</th>
                <th scope="col" aria-sort={ariaSortFor("ats", sort)}>ATS</th>
                <th scope="col" aria-sort={ariaSortFor("appliedDate", sort)}>Applied Date</th>
                <th scope="col" aria-sort={ariaSortFor("resume", sort)}>Resume</th>
                <th scope="col" aria-sort={ariaSortFor("status", sort)}>Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const candidateLabel = getCandidateLabel(row.candidate);
                const statusText = row.status.available ? row.status.text : "";

                return (
                  <Fragment key={row.applicationId}>
                    <tr>
                      <td className="min-w-56 align-top">
                        <CandidateName cell={row.candidate} />
                      </td>
                      <td className="min-w-32 align-top">
                        <AtsValue cell={row.ats} />
                      </td>
                      <td className="min-w-36 align-top">
                        <AppliedDate cell={row.appliedDate} />
                      </td>
                      <td className="min-w-40 align-top">
                        <ResumeValue cell={row.resume} />
                      </td>
                      <td className="min-w-32 align-top">
                        <StatusValue cell={row.status} />
                      </td>
                      <td className="min-w-44 align-top">
                        <CandidateDetailLauncher
                          applicationId={row.applicationId}
                          candidateLabel={candidateLabel}
                          state={detailStates.get(row.applicationId) ?? IDLE_LAUNCH_STATE}
                          onView={onViewCandidate}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={6} style={FULL_WIDTH_CELL_STYLE}>
                        <ApplicationStatusActions
                          status={statusText}
                          candidateLabel={candidateLabel}
                          applicationId={row.applicationId}
                          onStatusUpdated={(newStatus) => onStatusUpdated(row.applicationId, newStatus)}
                          className="mt-1"
                        />
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-3 md:hidden">
        {rows.map((row) => {
          const candidateLabel = getCandidateLabel(row.candidate);
          const statusText = row.status.available ? row.status.text : "";

          return (
            <Card key={row.applicationId} className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <CandidateName cell={row.candidate} />
                <div className="shrink-0">
                  <StatusValue cell={row.status} />
                </div>
              </div>

              <dl className="grid gap-3 border-y border-white/10 py-3 text-sm sm:grid-cols-2">
                <MobileValue label="ATS">
                  <AtsValue cell={row.ats} />
                </MobileValue>
                <MobileValue label="Applied Date">
                  <AppliedDate cell={row.appliedDate} />
                </MobileValue>
                <MobileValue label="Resume">
                  <ResumeValue cell={row.resume} />
                </MobileValue>
              </dl>

              <CandidateDetailLauncher
                applicationId={row.applicationId}
                candidateLabel={candidateLabel}
                state={detailStates.get(row.applicationId) ?? IDLE_LAUNCH_STATE}
                onView={onViewCandidate}
              />

              <ApplicationStatusActions
                status={statusText}
                candidateLabel={candidateLabel}
                applicationId={row.applicationId}
                onStatusUpdated={(newStatus) => onStatusUpdated(row.applicationId, newStatus)}
              />
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function ariaSortFor(
  field: CandidateSortField,
  sort: CandidateSort | null
): "ascending" | "descending" | "none" {
  if (sort === null || sort.field !== field) {
    return "none";
  }

  return sort.direction === "asc" ? "ascending" : "descending";
}

function getCandidateLabel(cell: CandidateNameCell): string {
  return cell.available ? cell.text : "";
}

function CandidateName({ cell }: { cell: CandidateNameCell }) {
  if (!cell.available) {
    return (
      <UnavailabilityIndicator message="A candidate name or email was not provided for this application." />
    );
  }

  const originLabel = cell.origin === "user-email" ? "Email on file" : "Student full name";

  return (
    <div className="min-w-0">
      <p className="break-words font-semibold text-white/90">{cell.text}</p>
      <p className="mt-0.5 text-xs text-white/45">{originLabel}</p>
    </div>
  );
}

function AtsValue({ cell }: { cell: CandidateScoreCell }) {
  if (!cell.available) {
    return (
      <UnavailabilityIndicator
        dependency="D3"
        message="Unavailable in list data. Open the profile to load the ATS score."
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-semibold text-white/85">
      <Gauge aria-hidden="true" size={15} className="shrink-0 text-brand-purple-light" />
      {cell.score}
    </span>
  );
}

function AppliedDate({ cell }: { cell: CandidateDateCell }) {
  if (!cell.available) {
    return (
      <UnavailabilityIndicator message="A valid applied date was not provided for this application." />
    );
  }

  return (
    <time dateTime={cell.iso} className="inline-flex items-center gap-1.5 text-white/75">
      <CalendarDays aria-hidden="true" size={15} className="shrink-0 text-brand-cyan-light" />
      {SOURCE_DATE_FORMATTER.format(new Date(cell.timestamp))}
    </time>
  );
}

function ResumeValue({ cell }: { cell: CandidateTextCell }) {
  if (!cell.available) {
    return (
      <UnavailabilityIndicator
        dependency="D3"
        message="Unavailable in list data. Open the profile to load the resume."
      />
    );
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-white/80">
      <FileText aria-hidden="true" size={15} className="shrink-0 text-brand-cyan-light" />
      <span className="min-w-0 break-all">{cell.text}</span>
    </span>
  );
}

function StatusValue({ cell }: { cell: CandidateTextCell }) {
  if (!cell.available) {
    return (
      <UnavailabilityIndicator message="A status was not provided for this application." />
    );
  }

  return <StatusBadge status={cell.text} />;
}

function MobileValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-[0.1em] text-white/40">{label}</dt>
      <dd className="mt-1.5 min-w-0">{children}</dd>
    </div>
  );
}
