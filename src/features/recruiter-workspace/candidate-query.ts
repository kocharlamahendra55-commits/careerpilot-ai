import {
  CANDIDATE_PAGE_SIZE_BOUNDS,
  DEFAULT_CANDIDATE_PAGE_SIZE,
} from "./capabilities";
import {
  createApplicationCollectionRequestIntent,
  type ApplicationCollectionQuery,
  type ApplicationCollectionRequestIntent,
} from "./request-intents";

/**
 * Local Candidate List filter/pagination controls. These are the accepted
 * request values a route holds; they never include a sort key because the
 * application endpoint provides no server-side sorting (D5).
 */
export interface CandidateListQueryState {
  readonly jobId: string | null;
  readonly status: string | null;
  readonly search: string;
  readonly page: number;
  readonly pageSize: number;
}

export type CandidateListQueryAction =
  | { readonly type: "set-job-id"; readonly jobId: string | null }
  | { readonly type: "set-status"; readonly status: string | null }
  | { readonly type: "set-search"; readonly search: string }
  | { readonly type: "set-page"; readonly page: number }
  | { readonly type: "set-page-size"; readonly pageSize: number };

/**
 * A single application row from the list response, normalized to only the
 * fields the Candidate table renders. Absent or malformed optional values
 * become `null` so downstream projection can show an unavailability indicator
 * rather than a fabricated value. ATS and resume are intentionally absent: the
 * list endpoint never returns them (D3).
 */
export interface CandidateApplicationListItem {
  readonly id: string;
  readonly status: string | null;
  readonly createdAt: string | null;
  readonly email: string | null;
  readonly fullName: string | null;
}

/**
 * Pagination taken directly from the response. `total`, `page`, and `pageSize`
 * are the authority; `totalPages` is a display-only derivation of those
 * authoritative values and never overrides the server's own page selection.
 */
export interface CandidatePagination {
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

export interface CandidateListResponse {
  readonly applications: readonly CandidateApplicationListItem[];
  readonly pagination: CandidatePagination;
}

/** Creates a normalized Candidate List query state without making a request. */
export function createCandidateListQueryState(
  overrides: Partial<CandidateListQueryState> = {}
): CandidateListQueryState {
  return Object.freeze({
    jobId: normalizeOptionalFilter(overrides.jobId),
    status: normalizeOptionalFilter(overrides.status),
    search: normalizeSearchText(overrides.search),
    page: normalizePage(overrides.page),
    pageSize: normalizePageSize(overrides.pageSize),
  });
}

/**
 * Updates accepted filter/pagination values. Any filter or page-size change
 * resets the page to one; a page change only moves the page. Server pagination
 * still governs the visible page once a response arrives.
 */
export function reduceCandidateListQueryState(
  state: CandidateListQueryState,
  action: CandidateListQueryAction
): CandidateListQueryState {
  switch (action.type) {
    case "set-job-id": {
      const jobId = normalizeOptionalFilter(action.jobId);
      return jobId === state.jobId
        ? state
        : createCandidateListQueryState({ ...state, jobId, page: 1 });
    }
    case "set-status": {
      const status = normalizeOptionalFilter(action.status);
      return status === state.status
        ? state
        : createCandidateListQueryState({ ...state, status, page: 1 });
    }
    case "set-search": {
      const search = normalizeSearchText(action.search);
      return search === state.search
        ? state
        : createCandidateListQueryState({ ...state, search, page: 1 });
    }
    case "set-page": {
      const page = normalizePage(action.page);
      return page === state.page
        ? state
        : createCandidateListQueryState({ ...state, page });
    }
    case "set-page-size": {
      const pageSize = normalizePageSize(action.pageSize);
      return pageSize === state.pageSize
        ? state
        : createCandidateListQueryState({ ...state, pageSize, page: 1 });
    }
    default:
      return assertNever(action);
  }
}

/**
 * Serializes accepted controls to a canonical query. Empty optional filters are
 * omitted entirely; `page` stays a positive integer and `pageSize` is clamped
 * to the inclusive 1..50 range.
 */
export function normalizeCandidateListQuery(
  state: Partial<CandidateListQueryState> = {}
): ApplicationCollectionQuery {
  const normalized = createCandidateListQueryState(state);
  const query: {
    jobId?: string;
    status?: string;
    search?: string;
    page: number;
    pageSize: number;
  } = {
    page: normalized.page,
    pageSize: normalized.pageSize,
  };

  if (normalized.jobId !== null) query.jobId = normalized.jobId;
  if (normalized.status !== null) query.status = normalized.status;

  const search = normalized.search.trim();
  if (search.length > 0) query.search = search;

  return Object.freeze(query);
}

/** Builds the allowlisted candidate collection GET request for accepted controls. */
export function createCandidateListRequestIntent(
  state: Partial<CandidateListQueryState> = {}
): ApplicationCollectionRequestIntent {
  return createApplicationCollectionRequestIntent(normalizeCandidateListQuery(state));
}

/**
 * Reads the documented `{ applications, total, page, pageSize }` envelope. A
 * malformed envelope returns null so callers show an error rather than a
 * fabricated page. Individual applications lacking a usable id are skipped
 * because a row must have a stable, source-backed key.
 */
export function parseCandidateListResponse(
  value: unknown
): CandidateListResponse | null {
  if (!isRecord(value) || !Array.isArray(value.applications)) {
    return null;
  }

  const pagination = projectCandidatePagination(value);
  if (pagination === null) {
    return null;
  }

  const applications: CandidateApplicationListItem[] = [];
  const seenIds = new Set<string>();

  for (const raw of value.applications) {
    const item = normalizeCandidateListItem(raw);
    if (item === null || seenIds.has(item.id)) {
      continue;
    }

    seenIds.add(item.id);
    applications.push(item);
  }

  return Object.freeze({
    applications: Object.freeze(applications),
    pagination,
  });
}

/**
 * Projects pagination using the returned `total`, `page`, and `pageSize` as the
 * sole authority. `totalPages` is derived only from those authoritative values.
 */
export function projectCandidatePagination(
  value: unknown
): CandidatePagination | null {
  if (!isRecord(value)) {
    return null;
  }

  const total = toCountNumber(value.total);
  const page = toPositiveInteger(value.page);
  const pageSize = toPositiveInteger(value.pageSize);

  if (total === null || page === null || pageSize === null) {
    return null;
  }

  return Object.freeze({
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

function normalizeCandidateListItem(
  raw: unknown
): CandidateApplicationListItem | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  if (id.length === 0) {
    return null;
  }

  const user = isRecord(raw.user) ? raw.user : null;
  const studentProfile =
    user !== null && isRecord(user.studentProfile) ? user.studentProfile : null;

  return Object.freeze({
    id,
    status: readSourceString(raw.status),
    createdAt: readSourceString(raw.createdAt),
    email: user !== null ? readSourceString(user.email) : null,
    fullName: studentProfile !== null ? readSourceString(studentProfile.fullName) : null,
  });
}

/** Preserves the exact source string, treating blank/whitespace-only as absent. */
function readSourceString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function normalizeOptionalFilter(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSearchText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizePage(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  const page = Math.floor(value);
  return page >= 1 ? page : 1;
}

function normalizePageSize(value: unknown): number {
  const { min, max } = CANDIDATE_PAGE_SIZE_BOUNDS;

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return clamp(DEFAULT_CANDIDATE_PAGE_SIZE, min, max);
  }

  return clamp(Math.floor(value), min, max);
}

function toCountNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const count = Math.floor(value);
  return count >= 0 ? count : null;
}

function toPositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const integer = Math.floor(value);
  return integer >= 1 ? integer : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNever(value: never): never {
  throw new TypeError(`Unsupported candidate query action: ${String(value)}`);
}
