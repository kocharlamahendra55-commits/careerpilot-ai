import type { RecruiterJob } from "./types";

/** The local presentation page size used unless a caller supplies a valid size. */
export const DEFAULT_MANAGE_JOBS_PAGE_SIZE = 10;

export const MANAGE_JOBS_SORT_FIELDS = Object.freeze([
  "job",
  "status",
  "applications",
  "created",
  "updated",
] as const);

export type ManageJobsSortField = (typeof MANAGE_JOBS_SORT_FIELDS)[number];

export const MANAGE_JOBS_SORT_DIRECTIONS = Object.freeze(["asc", "desc"] as const);

export type ManageJobsSortDirection = (typeof MANAGE_JOBS_SORT_DIRECTIONS)[number];

export interface ManageJobsSort {
  readonly field: ManageJobsSortField;
  readonly direction: ManageJobsSortDirection;
}

/**
 * Local controls for the fetched job collection. These controls never become
 * collection query parameters: Manage Jobs always transforms the most recent
 * successful unparameterized GET response in memory.
 */
export interface ManageJobsTransformState {
  readonly search: string;
  readonly statusFilter: string | null;
  readonly sort: ManageJobsSort | null;
  readonly page: number;
  readonly pageSize: number;
}

export type ManageJobsTransformAction =
  | { readonly type: "set-search"; readonly search: string }
  | { readonly type: "set-status-filter"; readonly statusFilter: string | null }
  | { readonly type: "set-sort"; readonly sort: ManageJobsSort | null }
  | { readonly type: "set-page"; readonly page: number }
  | { readonly type: "set-page-size"; readonly pageSize: number };

/** The result of applying local controls to the last successful source collection. */
export interface ManageJobsTransformResult {
  /** All matching source jobs after stable filtering and sorting, before paging. */
  readonly matchingJobs: readonly RecruiterJob[];
  /** Only the source jobs belonging to the clamped selected page. */
  readonly visibleJobs: readonly RecruiterJob[];
  readonly totalMatches: number;
  readonly page: number;
  readonly pageSize: number;
  /** At least one so an empty result still has a stable, clamped selected page. */
  readonly totalPages: number;
}

interface DecoratedJob {
  readonly job: RecruiterJob;
  readonly sourceIndex: number;
}

type SortValue =
  | { readonly valid: true; readonly value: string | number }
  | { readonly valid: false };

const INVALID_SORT_VALUE: SortValue = Object.freeze({ valid: false });

/** Creates a normalized local control state without making any request. */
export function createManageJobsTransformState(
  overrides: Partial<ManageJobsTransformState> = {}
): ManageJobsTransformState {
  return Object.freeze({
    search: normalizeSearch(overrides.search),
    statusFilter: normalizeStatusFilter(overrides.statusFilter),
    sort: normalizeSort(overrides.sort),
    page: normalizePage(overrides.page),
    pageSize: normalizePageSize(overrides.pageSize),
  });
}

/**
 * Updates local controls. Search, filter, sort, and page-size changes restart
 * at page one; final page clamping remains the transform's responsibility
 * because only it knows the current matching collection size.
 */
export function reduceManageJobsTransformState(
  state: ManageJobsTransformState,
  action: ManageJobsTransformAction
): ManageJobsTransformState {
  switch (action.type) {
    case "set-search": {
      const search = normalizeSearch(action.search);
      return search === state.search ? state : freezeTransformState({ ...state, search, page: 1 });
    }
    case "set-status-filter": {
      const statusFilter = normalizeStatusFilter(action.statusFilter);
      return statusFilter === state.statusFilter
        ? state
        : freezeTransformState({ ...state, statusFilter, page: 1 });
    }
    case "set-sort": {
      const sort = normalizeSort(action.sort);
      return areSortsEqual(sort, state.sort)
        ? state
        : freezeTransformState({ ...state, sort, page: 1 });
    }
    case "set-page": {
      const page = normalizePage(action.page);
      return page === state.page ? state : freezeTransformState({ ...state, page });
    }
    case "set-page-size": {
      const pageSize = normalizePageSize(action.pageSize);
      return pageSize === state.pageSize
        ? state
        : freezeTransformState({ ...state, pageSize, page: 1 });
    }
    default:
      return assertNever(action);
  }
}

/**
 * Deterministically searches, filters, stably sorts, and pages only the last
 * successful job collection. It never mutates that collection, its records, or
 * sends a follow-up collection request.
 */
export function transformManageJobs(
  lastSuccessfulJobs: readonly RecruiterJob[],
  controls: Partial<ManageJobsTransformState> = {}
): ManageJobsTransformResult {
  const normalizedControls = createManageJobsTransformState(controls);
  const search = normalizedControls.search.trim().toLowerCase();
  const statusFilter = normalizedControls.statusFilter;
  const sort = normalizedControls.sort;
  const seenIds = new Set<string>();
  const matching: DecoratedJob[] = [];

  for (let sourceIndex = 0; sourceIndex < lastSuccessfulJobs.length; sourceIndex += 1) {
    const job = lastSuccessfulJobs[sourceIndex];

    // A displayed row requires a persisted source identifier. Skipping malformed
    // records prevents a local transform from emitting duplicate/unsafely keyed rows.
    if (!hasSourceIdentifier(job) || seenIds.has(job.id)) {
      continue;
    }

    seenIds.add(job.id);

    if (!matchesSearch(job, search) || !matchesExactStatus(job, statusFilter)) {
      continue;
    }

    matching.push({ job, sourceIndex });
  }

  const ordered = sort === null ? matching : [...matching].sort(createStableComparator(sort));
  const matchingJobs = Object.freeze(ordered.map(({ job }) => job));
  const totalMatches = matchingJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalMatches / normalizedControls.pageSize));
  const page = Math.min(normalizedControls.page, totalPages);
  const start = (page - 1) * normalizedControls.pageSize;
  const visibleJobs = Object.freeze(matchingJobs.slice(start, start + normalizedControls.pageSize));

  return Object.freeze({
    matchingJobs,
    visibleJobs,
    totalMatches,
    page,
    pageSize: normalizedControls.pageSize,
    totalPages,
  });
}

export function isManageJobsSort(value: unknown): value is ManageJobsSort {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Object.keys(value).length === 2 &&
    Object.prototype.hasOwnProperty.call(value, "field") &&
    Object.prototype.hasOwnProperty.call(value, "direction") &&
    isManageJobsSortField(value.field) &&
    isManageJobsSortDirection(value.direction)
  );
}

export function isManageJobsSortField(value: unknown): value is ManageJobsSortField {
  return (
    typeof value === "string" &&
    (MANAGE_JOBS_SORT_FIELDS as readonly string[]).includes(value)
  );
}

export function isManageJobsSortDirection(
  value: unknown
): value is ManageJobsSortDirection {
  return (
    typeof value === "string" &&
    (MANAGE_JOBS_SORT_DIRECTIONS as readonly string[]).includes(value)
  );
}

function freezeTransformState(state: ManageJobsTransformState): ManageJobsTransformState {
  return Object.freeze({
    search: normalizeSearch(state.search),
    statusFilter: normalizeStatusFilter(state.statusFilter),
    sort: normalizeSort(state.sort),
    page: normalizePage(state.page),
    pageSize: normalizePageSize(state.pageSize),
  });
}

function normalizeSearch(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** A blank filter means all statuses; every nonblank filter remains exact. */
function normalizeStatusFilter(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeSort(value: unknown): ManageJobsSort | null {
  if (!isManageJobsSort(value)) {
    return null;
  }

  return Object.freeze({ field: value.field, direction: value.direction });
}

function normalizePage(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function normalizePageSize(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_MANAGE_JOBS_PAGE_SIZE;
  }

  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : DEFAULT_MANAGE_JOBS_PAGE_SIZE;
}

function areSortsEqual(left: ManageJobsSort | null, right: ManageJobsSort | null): boolean {
  return left === right || (left?.field === right?.field && left?.direction === right?.direction);
}

function hasSourceIdentifier(job: RecruiterJob): job is RecruiterJob & { id: string } {
  return typeof job.id === "string" && job.id.length > 0;
}

function matchesSearch(job: RecruiterJob, normalizedSearch: string): boolean {
  if (normalizedSearch.length === 0) {
    return true;
  }

  return [job.title, job.company, job.location].some((value) =>
    normalizeComparableText(value).includes(normalizedSearch)
  );
}

function matchesExactStatus(job: RecruiterJob, statusFilter: string | null): boolean {
  return statusFilter === null || readSourceText(job.status) === statusFilter;
}

function createStableComparator(sort: ManageJobsSort) {
  return (left: DecoratedJob, right: DecoratedJob): number => {
    const comparison = compareSortValues(
      getSortValue(left.job, sort.field),
      getSortValue(right.job, sort.field),
      sort.direction
    );

    return comparison !== 0 ? comparison : left.sourceIndex - right.sourceIndex;
  };
}

/**
 * Invalid/missing values are deliberately placed after valid values before
 * direction is applied, so they remain last for both ascending and descending
 * sorts. Equal valid values defer to the original collection index.
 */
function compareSortValues(
  left: SortValue,
  right: SortValue,
  direction: ManageJobsSortDirection
): number {
  if (!left.valid && !right.valid) {
    return 0;
  }

  if (!left.valid) {
    return 1;
  }

  if (!right.valid) {
    return -1;
  }

  const ascendingComparison = comparePrimitiveValues(left.value, right.value);
  return direction === "desc" ? -ascendingComparison : ascendingComparison;
}

function getSortValue(job: RecruiterJob, field: ManageJobsSortField): SortValue {
  switch (field) {
    case "job":
      return getTextSortValue(job.title);
    case "status":
      return getTextSortValue(job.status);
    case "applications":
      return getApplicationCountSortValue(job);
    case "created":
      return getTimestampSortValue(job.createdAt);
    case "updated":
      return getTimestampSortValue(job.updatedAt);
    default:
      return assertNever(field);
  }
}

function getTextSortValue(value: unknown): SortValue {
  const normalized = normalizeComparableText(value);
  return normalized.length > 0 ? { valid: true, value: normalized } : INVALID_SORT_VALUE;
}

function getApplicationCountSortValue(job: RecruiterJob): SortValue {
  const applicationCount = job._count?.applications;

  return typeof applicationCount === "number" &&
    Number.isFinite(applicationCount) &&
    applicationCount >= 0
    ? { valid: true, value: applicationCount }
    : INVALID_SORT_VALUE;
}

function getTimestampSortValue(value: unknown): SortValue {
  if (typeof value !== "string" || value.trim().length === 0) {
    return INVALID_SORT_VALUE;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? { valid: true, value: timestamp } : INVALID_SORT_VALUE;
}

function comparePrimitiveValues(left: string | number, right: string | number): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function normalizeComparableText(value: unknown): string {
  return readSourceText(value).trim().toLowerCase();
}

function readSourceText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNever(value: never): never {
  throw new TypeError(`Unsupported Manage Jobs value: ${String(value)}`);
}
