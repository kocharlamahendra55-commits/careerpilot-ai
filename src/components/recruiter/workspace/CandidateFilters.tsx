"use client";

import type { ChangeEvent } from "react";
import { ChevronLeft, ChevronRight, ListFilter, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  isCandidateSortField,
  type CandidateSort,
} from "@/features/recruiter-workspace/candidate-page-sort";
import type {
  CandidateListQueryState,
  CandidatePagination,
} from "@/features/recruiter-workspace/candidate-query";

export interface CandidateFiltersProps {
  readonly query: CandidateListQueryState;
  /** Returned pagination is the authority for the page controls and totals. */
  readonly pagination: CandidatePagination | null;
  /** Page-scoped sort applied locally to the retrieved page only. */
  readonly sort: CandidateSort | null;
  readonly onSearchChange: (search: string) => void;
  readonly onStatusChange: (status: string | null) => void;
  readonly onJobIdChange: (jobId: string | null) => void;
  readonly onPageChange: (page: number) => void;
  readonly onSortChange: (sort: CandidateSort | null) => void;
  readonly onReset: () => void;
}

const CONTROL_CLASS_NAME =
  "h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition-colors placeholder:text-white/35 hover:border-white/20 focus:border-brand-purple/60 focus:ring-2 focus:ring-brand-purple/60 focus:ring-offset-2 focus:ring-offset-[#050816]";

/** Common source-backed application statuses offered as an exact-match filter. */
const STATUS_FILTER_OPTIONS = [
  { value: "APPLIED", label: "Applied" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "OFFERED", label: "Offered" },
  { value: "HIRED", label: "Hired" },
  { value: "REJECTED", label: "Rejected" },
] as const;

/**
 * Server-supported Candidate List controls. Search, status, and job filters map
 * only to the allowed application query keys; the page controls use the returned
 * pagination values, and the sort control is explicitly labelled page-scoped.
 */
export function CandidateFilters({
  query,
  pagination,
  sort,
  onSearchChange,
  onStatusChange,
  onJobIdChange,
  onPageChange,
  onSortChange,
  onReset,
}: CandidateFiltersProps) {
  const hasActiveFilters = Boolean(
    query.search.trim() || query.status !== null || query.jobId !== null
  );

  const page = pagination?.page ?? query.page;
  const totalPages = pagination?.totalPages ?? 1;
  const total = pagination?.total ?? 0;
  const resultLabel = `${total} ${total === 1 ? "application" : "applications"} returned by the application service`;

  function handleSortFieldChange(event: ChangeEvent<HTMLSelectElement>) {
    const field = event.target.value;

    if (field.length === 0) {
      onSortChange(null);
      return;
    }

    if (!isCandidateSortField(field)) {
      return;
    }

    onSortChange({ field, direction: sort?.direction ?? "asc" });
  }

  function handleSortDirectionChange(event: ChangeEvent<HTMLSelectElement>) {
    if (sort === null || (event.target.value !== "asc" && event.target.value !== "desc")) {
      return;
    }

    onSortChange({ field: sort.field, direction: event.target.value });
  }

  return (
    <Card
      variant="flat"
      aria-label="Candidate List controls"
      className="space-y-4 border-white/10 bg-white/[0.025] motion-reduce:transition-none"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white/90">
            <SlidersHorizontal aria-hidden="true" size={17} className="text-brand-cyan-light" />
            Filter candidates
          </h2>
          <p id="candidate-filter-scope-note" className="mt-1 text-sm leading-6 text-white/55">
            Search, status, and job filters are sent to the application service. Pagination reflects
            the totals returned for your recruiter-owned applications.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!hasActiveFilters && page === 1}
          aria-label="Reset candidate search, status, job, and page filters"
          className="shrink-0 self-start"
        >
          <RotateCcw aria-hidden="true" size={15} strokeWidth={2} />
          Reset
        </Button>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0">
          <label htmlFor="candidate-search" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-white/45">
            Search
          </label>
          <div className="relative">
            <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              id="candidate-search"
              type="search"
              value={query.search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by candidate name or college"
              aria-describedby="candidate-filter-scope-note candidate-result-count"
              className={`${CONTROL_CLASS_NAME} pl-9`}
            />
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor="candidate-status" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-white/45">
            Status
          </label>
          <div className="relative">
            <ListFilter aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <select
              id="candidate-status"
              value={query.status ?? ""}
              onChange={(event) => onStatusChange(event.target.value || null)}
              aria-describedby="candidate-filter-scope-note candidate-result-count"
              className={`${CONTROL_CLASS_NAME} appearance-none pl-9`}
            >
              <option value="">All statuses</option>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor="candidate-job-id" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-white/45">
            Job ID (optional)
          </label>
          <input
            id="candidate-job-id"
            type="text"
            value={query.jobId ?? ""}
            onChange={(event) => onJobIdChange(event.target.value || null)}
            placeholder="Limit to a specific job ID"
            aria-describedby="candidate-filter-scope-note"
            className={CONTROL_CLASS_NAME}
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-3 border-t border-white/10 pt-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0">
          <label htmlFor="candidate-sort" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-white/45">
            Sort by
          </label>
          <select
            id="candidate-sort"
            value={sort?.field ?? ""}
            onChange={handleSortFieldChange}
            aria-describedby="candidate-sort-scope-note"
            className={CONTROL_CLASS_NAME}
          >
            <option value="">Returned order</option>
            <option value="candidate">Candidate</option>
            <option value="ats">ATS</option>
            <option value="appliedDate">Applied Date</option>
            <option value="resume">Resume</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div className="min-w-0">
          <label htmlFor="candidate-sort-direction" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-white/45">
            Direction
          </label>
          <select
            id="candidate-sort-direction"
            value={sort?.direction ?? "asc"}
            onChange={handleSortDirectionChange}
            disabled={sort === null}
            aria-describedby="candidate-sort-scope-note"
            className={CONTROL_CLASS_NAME}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>

        <p
          id="candidate-sort-scope-note"
          className="flex items-end text-xs leading-5 text-white/50 xl:col-span-1"
        >
          Sorting applies to this page only. The application service does not provide server-wide
          sorting.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p id="candidate-result-count" role="status" aria-live="polite" className="text-sm text-white/60">
          {resultLabel}
        </p>

        <nav aria-label="Candidate pages" className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Go to previous candidate page"
          >
            <ChevronLeft aria-hidden="true" size={15} strokeWidth={2} />
            Previous
          </Button>
          <span aria-current="page" className="min-w-28 text-center text-xs font-medium text-white/65">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Go to next candidate page"
          >
            Next
            <ChevronRight aria-hidden="true" size={15} strokeWidth={2} />
          </Button>
        </nav>
      </div>
    </Card>
  );
}
