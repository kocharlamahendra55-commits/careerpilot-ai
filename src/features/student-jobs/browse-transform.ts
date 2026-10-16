import type { PublishedJobListItem } from "./types";

/**
 * Pure, in-memory presentation transforms over the already-fetched published
 * job list. Nothing here performs a network request: the location filter, sort,
 * and pagination all operate deterministically on the list supplied by the hook.
 *
 * The location filter options are DERIVED from the loaded jobs, so the dropdown
 * only ever offers locations that actually exist in the current result set.
 */

/** Fixed page size for the responsive browse grid (fills a 3-column layout). */
export const BROWSE_JOBS_PAGE_SIZE = 9;

export const BROWSE_SORT_ORDERS = Object.freeze(["newest", "oldest"] as const);

export type BrowseSortOrder = (typeof BROWSE_SORT_ORDERS)[number];

/** Local, request-free controls for the browse grid. `location` null = all. */
export interface BrowseJobsControls {
  readonly location: string | null;
  readonly sort: BrowseSortOrder;
  readonly page: number;
  readonly pageSize: number;
}

export interface BrowseJobsResult {
  /** All jobs matching the location filter, after sorting, before paging. */
  readonly matchingJobs: readonly PublishedJobListItem[];
  /** Only the jobs on the clamped selected page. */
  readonly visibleJobs: readonly PublishedJobListItem[];
  readonly totalMatches: number;
  /** The effective (clamped) page. At least 1 even when there are no matches. */
  readonly page: number;
  readonly pageSize: number;
  /** At least 1 so an empty result still has a stable selected page. */
  readonly totalPages: number;
  /** Distinct, non-empty locations present in the loaded jobs, sorted A→Z. */
  readonly locationOptions: readonly string[];
}

interface DecoratedJob {
  readonly job: PublishedJobListItem;
  readonly sourceIndex: number;
  /** Parsed createdAt epoch, or null when unparseable/missing. */
  readonly time: number | null;
}

export function isBrowseSortOrder(value: unknown): value is BrowseSortOrder {
  return (
    typeof value === "string" && (BROWSE_SORT_ORDERS as readonly string[]).includes(value)
  );
}

/** Builds a normalized, frozen controls object with safe defaults. */
export function createBrowseJobsControls(
  overrides: Partial<BrowseJobsControls> = {}
): BrowseJobsControls {
  return Object.freeze({
    location: normalizeLocation(overrides.location),
    sort: isBrowseSortOrder(overrides.sort) ? overrides.sort : "newest",
    page: normalizePage(overrides.page),
    pageSize: normalizePageSize(overrides.pageSize),
  });
}

/**
 * Derives the distinct, non-empty location filter options from the loaded jobs.
 * Comparison is case-insensitive; the first-seen original casing is preserved
 * for display. Result is sorted alphabetically and frozen.
 */
export function deriveLocationOptions(
  jobs: readonly PublishedJobListItem[]
): readonly string[] {
  const byKey = new Map<string, string>();

  for (const job of jobs) {
    const label = readText(job.location);
    if (label.length === 0) {
      continue;
    }
    const key = label.toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, label);
    }
  }

  return Object.freeze(
    Array.from(byKey.values()).sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base" })
    )
  );
}

/**
 * Filters by exact (case-insensitive) location, stably sorts by `createdAt`, and
 * paginates. Jobs with an unparseable `createdAt` sort last for both orders.
 * The source list, its records, and the input controls are never mutated.
 */
export function transformBrowseJobs(
  jobs: readonly PublishedJobListItem[],
  controls: Partial<BrowseJobsControls> = {}
): BrowseJobsResult {
  const normalized = createBrowseJobsControls(controls);
  const locationOptions = deriveLocationOptions(jobs);
  const locationFilter = normalized.location === null ? null : normalized.location.toLowerCase();

  const decorated: DecoratedJob[] = [];
  for (let sourceIndex = 0; sourceIndex < jobs.length; sourceIndex += 1) {
    const job = jobs[sourceIndex];

    if (!hasSourceIdentifier(job)) {
      continue;
    }
    if (locationFilter !== null && readText(job.location).toLowerCase() !== locationFilter) {
      continue;
    }

    decorated.push({ job, sourceIndex, time: parseTimestamp(job.createdAt) });
  }

  const ordered = [...decorated].sort((left, right) => {
    const comparison = compareByTime(left.time, right.time, normalized.sort);
    return comparison !== 0 ? comparison : left.sourceIndex - right.sourceIndex;
  });

  const matchingJobs = Object.freeze(ordered.map((entry) => entry.job));
  const totalMatches = matchingJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalMatches / normalized.pageSize));
  const page = Math.min(normalized.page, totalPages);
  const start = (page - 1) * normalized.pageSize;
  const visibleJobs = Object.freeze(matchingJobs.slice(start, start + normalized.pageSize));

  return Object.freeze({
    matchingJobs,
    visibleJobs,
    totalMatches,
    page,
    pageSize: normalized.pageSize,
    totalPages,
    locationOptions,
  });
}

/**
 * Orders by time with invalid/missing timestamps always last. Direction is
 * applied only to valid comparisons: "newest" is descending, "oldest" ascending.
 */
function compareByTime(
  left: number | null,
  right: number | null,
  sort: BrowseSortOrder
): number {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }

  const ascending = left < right ? -1 : left > right ? 1 : 0;
  return sort === "oldest" ? ascending : -ascending;
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function hasSourceIdentifier(job: PublishedJobListItem): boolean {
  return typeof job.id === "string" && job.id.length > 0;
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLocation(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePage(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }
  return Math.max(1, Math.floor(value));
}

function normalizePageSize(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return BROWSE_JOBS_PAGE_SIZE;
  }
  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : BROWSE_JOBS_PAGE_SIZE;
}
