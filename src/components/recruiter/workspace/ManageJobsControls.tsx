"use client";

import type { ChangeEvent, RefObject } from "react";
import { ChevronLeft, ChevronRight, ListFilter, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  isManageJobsSortDirection,
  isManageJobsSortField,
  type ManageJobsSort,
  type ManageJobsTransformState,
} from "@/features/recruiter-workspace/manage-jobs-transform";

export interface ManageJobsControlsProps {
  readonly controls: ManageJobsTransformState;
  readonly totalMatches: number;
  readonly page: number;
  readonly totalPages: number;
  readonly onSearchChange: (search: string) => void;
  readonly onStatusFilterChange: (status: string | null) => void;
  readonly onSortChange: (sort: ManageJobsSort | null) => void;
  readonly onPageChange: (page: number) => void;
  readonly onReset: () => void;
  /** Stable focus target for a lifecycle dialog whose trigger was replaced. */
  readonly lifecycleFocusFallbackRef: RefObject<HTMLHeadingElement | null>;
}

const CONTROL_CLASS_NAME =
  "h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition-colors placeholder:text-white/35 hover:border-white/20 focus:border-brand-purple/60 focus:ring-2 focus:ring-brand-purple/60 focus:ring-offset-2 focus:ring-offset-[#050816]";

/**
 * Local-only controls for the already fetched recruiter job collection. The
 * component exposes no request callbacks, preventing filters from becoming
 * collection query parameters.
 */
export function ManageJobsControls({
  controls,
  totalMatches,
  page,
  totalPages,
  onSearchChange,
  onStatusFilterChange,
  onSortChange,
  onPageChange,
  onReset,
  lifecycleFocusFallbackRef,
}: ManageJobsControlsProps) {
  const hasActiveControls = Boolean(
    controls.search || controls.statusFilter !== null || controls.sort !== null
  );
  const resultLabel = `${totalMatches} ${totalMatches === 1 ? "job" : "jobs"} match the loaded collection`;

  function handleSortFieldChange(event: ChangeEvent<HTMLSelectElement>) {
    const field = event.target.value;

    if (field.length === 0) {
      onSortChange(null);
      return;
    }

    if (!isManageJobsSortField(field)) {
      return;
    }

    onSortChange({ field, direction: controls.sort?.direction ?? "asc" });
  }

  function handleSortDirectionChange(event: ChangeEvent<HTMLSelectElement>) {
    if (controls.sort === null || !isManageJobsSortDirection(event.target.value)) {
      return;
    }

    onSortChange({ field: controls.sort.field, direction: event.target.value });
  }

  return (
    <Card
      variant="flat"
      aria-label="Manage Jobs controls"
      className="space-y-4 border-white/10 bg-white/[0.025] motion-reduce:transition-none"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2
            ref={lifecycleFocusFallbackRef}
            tabIndex={-1}
            className="flex items-center gap-2 text-base font-semibold text-white/90"
          >
            <SlidersHorizontal aria-hidden="true" size={17} className="text-brand-cyan-light" />
            Find loaded jobs
          </h2>
          <p id="manage-jobs-scope-note" className="mt-1 text-sm leading-6 text-white/55">
            Applied to loaded jobs only. These controls do not add search, filter, sort, or page
            parameters to the job service request.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!hasActiveControls && page === 1}
          aria-label="Reset job search, filters, sorting, and page"
          className="shrink-0 self-start"
        >
          <RotateCcw aria-hidden="true" size={15} strokeWidth={2} />
          Reset
        </Button>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.45fr)_minmax(10rem,0.8fr)_minmax(10rem,0.8fr)_minmax(8rem,0.65fr)]">
        <div className="min-w-0">
          <label htmlFor="manage-jobs-search" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-white/45">
            Search
          </label>
          <div className="relative">
            <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              id="manage-jobs-search"
              type="search"
              value={controls.search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Title, company, or location"
              aria-describedby="manage-jobs-scope-note manage-jobs-result-count"
              className={`${CONTROL_CLASS_NAME} pl-9`}
            />
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor="manage-jobs-status" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-white/45">
            Status
          </label>
          <div className="relative">
            <ListFilter aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <select
              id="manage-jobs-status"
              value={controls.statusFilter ?? ""}
              onChange={(event) => onStatusFilterChange(event.target.value || null)}
              aria-describedby="manage-jobs-scope-note manage-jobs-result-count"
              className={`${CONTROL_CLASS_NAME} appearance-none pl-9`}
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor="manage-jobs-sort" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-white/45">
            Sort by
          </label>
          <select
            id="manage-jobs-sort"
            value={controls.sort?.field ?? ""}
            onChange={handleSortFieldChange}
            aria-describedby="manage-jobs-scope-note"
            className={CONTROL_CLASS_NAME}
          >
            <option value="">Source order</option>
            <option value="job">Job</option>
            <option value="status">Status</option>
            <option value="applications">Applications</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
          </select>
        </div>

        <div className="min-w-0">
          <label htmlFor="manage-jobs-direction" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-white/45">
            Direction
          </label>
          <select
            id="manage-jobs-direction"
            value={controls.sort?.direction ?? "asc"}
            onChange={handleSortDirectionChange}
            disabled={controls.sort === null}
            aria-describedby="manage-jobs-scope-note"
            className={CONTROL_CLASS_NAME}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p id="manage-jobs-result-count" role="status" aria-live="polite" className="text-sm text-white/60">
          {resultLabel}
        </p>

        <nav aria-label="Jobs pages" className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Go to previous jobs page"
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
            aria-label="Go to next jobs page"
          >
            Next
            <ChevronRight aria-hidden="true" size={15} strokeWidth={2} />
          </Button>
        </nav>
      </div>
    </Card>
  );
}
