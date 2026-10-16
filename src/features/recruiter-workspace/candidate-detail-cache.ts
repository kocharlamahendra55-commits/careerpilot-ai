import { extractSafeErrorMessage } from "./resource-state";

export const CANDIDATE_DETAIL_LOAD_FAILURE_MESSAGE =
  "Unable to load this candidate's details.";

/**
 * The application-detail values the Candidate List uses to enrich a row. Only
 * ATS score and resume filename are consumed by the list; both are `null` when
 * the retrieved detail response did not provide them.
 */
export interface CandidateDetailEnrichment {
  readonly atsScore: number | null;
  readonly resumeFilename: string | null;
}

/**
 * The parsed, source-backed detail for a single application ID. It carries its
 * own id so the cache can reject a response that returned a different record.
 */
export interface CandidateApplicationDetail extends CandidateDetailEnrichment {
  readonly id: string;
}

/**
 * Per-application-ID cache state. `requestToken` increments each time a load
 * begins for a key, so a stale completion for a superseded load is ignored.
 */
export type CandidateDetailCacheEntry =
  | {
      readonly status: "loading";
      readonly applicationId: string;
      readonly requestToken: number;
    }
  | {
      readonly status: "success";
      readonly applicationId: string;
      readonly detail: CandidateApplicationDetail;
      readonly requestToken: number;
    }
  | {
      readonly status: "error";
      readonly applicationId: string;
      readonly errorMessage: string;
      readonly requestToken: number;
    };

/**
 * A cache keyed strictly by application ID. It records loading/success/error
 * per key and is used only to enrich the same ID; it never fans out a
 * page-wide fetch on its own.
 */
export interface CandidateDetailCache {
  readonly entries: ReadonlyMap<string, CandidateDetailCacheEntry>;
  readonly nextRequestToken: number;
}

export interface CandidateDetailLoadStart {
  readonly cache: CandidateDetailCache;
  readonly applicationId: string;
  readonly requestToken: number;
}

export function createCandidateDetailCache(): CandidateDetailCache {
  return freezeCache(new Map(), 0);
}

/**
 * Marks a single application ID as loading and returns a correlation token. It
 * touches only the requested key, so it cannot trigger requests for other rows.
 */
export function beginCandidateDetailLoad(
  cache: CandidateDetailCache,
  applicationId: string
): CandidateDetailLoadStart {
  const id = normalizeId(applicationId);
  if (id === null) {
    throw new TypeError(
      "A nonblank application ID is required to load candidate detail."
    );
  }

  const requestToken = cache.nextRequestToken + 1;
  const entries = cloneEntries(cache.entries);
  entries.set(
    id,
    Object.freeze({ status: "loading", applicationId: id, requestToken })
  );

  return Object.freeze({
    cache: freezeCache(entries, requestToken),
    applicationId: id,
    requestToken,
  });
}

/**
 * Stores a detail success only for the latest pending load of the same ID. A
 * response whose returned application id differs from the requested id is
 * rejected as an error and never stored as the row's enrichment.
 */
export function resolveCandidateDetailSuccess(
  cache: CandidateDetailCache,
  applicationId: string,
  requestToken: number,
  response: unknown
): CandidateDetailCache {
  const id = normalizeId(applicationId);
  if (id === null || !isCurrentDetailRequest(cache, id, requestToken)) {
    return cache;
  }

  const detail = parseApplicationDetailResponse(response);
  if (detail === null || detail.id !== id) {
    return setEntry(cache, createErrorEntry(id, requestToken, null));
  }

  return setEntry(
    cache,
    Object.freeze({ status: "success", applicationId: id, detail, requestToken })
  );
}

/** Records a detail load failure only for the latest pending load of that ID. */
export function resolveCandidateDetailFailure(
  cache: CandidateDetailCache,
  applicationId: string,
  requestToken: number,
  errorResponse: unknown,
  fallbackMessage: string = CANDIDATE_DETAIL_LOAD_FAILURE_MESSAGE
): CandidateDetailCache {
  const id = normalizeId(applicationId);
  if (id === null || !isCurrentDetailRequest(cache, id, requestToken)) {
    return cache;
  }

  return setEntry(cache, createErrorEntry(id, requestToken, errorResponse, fallbackMessage));
}

export function getCandidateDetailEntry(
  cache: CandidateDetailCache,
  applicationId: string
): CandidateDetailCacheEntry | null {
  const id = normalizeId(applicationId);
  if (id === null) {
    return null;
  }

  return cache.entries.get(id) ?? null;
}

/**
 * Returns enrichment only from a successful entry whose stored detail id
 * matches the requested id. Any other state yields null so the row shows an
 * "unavailable in list data" indicator instead of another record's values.
 */
export function getCandidateDetailEnrichment(
  cache: CandidateDetailCache,
  applicationId: string
): CandidateDetailEnrichment | null {
  const id = normalizeId(applicationId);
  if (id === null) {
    return null;
  }

  const entry = cache.entries.get(id);
  if (entry === undefined || entry.status !== "success" || entry.detail.id !== id) {
    return null;
  }

  return Object.freeze({
    atsScore: entry.detail.atsScore,
    resumeFilename: entry.detail.resumeFilename,
  });
}

/**
 * Reads the documented `{ application: { id, resume, analysis } }` detail
 * envelope, extracting only the values the Candidate List consumes. Returns
 * null when no usable application id is present.
 */
export function parseApplicationDetailResponse(
  value: unknown
): CandidateApplicationDetail | null {
  if (!isRecord(value) || !isRecord(value.application)) {
    return null;
  }

  const application = value.application;
  const id = typeof application.id === "string" ? application.id.trim() : "";
  if (id.length === 0) {
    return null;
  }

  const analysis = isRecord(application.analysis) ? application.analysis : null;
  const resume = isRecord(application.resume) ? application.resume : null;

  return Object.freeze({
    id,
    atsScore: analysis !== null ? readScore(analysis.atsScore) : null,
    resumeFilename: resume !== null ? readSourceString(resume.filename) : null,
  });
}

/** Only the latest pending (loading) request for a key may resolve it. */
function isCurrentDetailRequest(
  cache: CandidateDetailCache,
  applicationId: string,
  requestToken: number
): boolean {
  const entry = cache.entries.get(applicationId);
  return (
    entry !== undefined &&
    entry.status === "loading" &&
    entry.requestToken === requestToken
  );
}

function createErrorEntry(
  applicationId: string,
  requestToken: number,
  errorResponse: unknown,
  fallbackMessage: string = CANDIDATE_DETAIL_LOAD_FAILURE_MESSAGE
): CandidateDetailCacheEntry {
  return Object.freeze({
    status: "error",
    applicationId,
    errorMessage: extractSafeErrorMessage(errorResponse, fallbackMessage),
    requestToken,
  });
}

function setEntry(
  cache: CandidateDetailCache,
  entry: CandidateDetailCacheEntry
): CandidateDetailCache {
  const entries = cloneEntries(cache.entries);
  entries.set(entry.applicationId, entry);
  return freezeCache(entries, cache.nextRequestToken);
}

function cloneEntries(
  entries: ReadonlyMap<string, CandidateDetailCacheEntry>
): Map<string, CandidateDetailCacheEntry> {
  return new Map(entries);
}

function freezeCache(
  entries: Map<string, CandidateDetailCacheEntry>,
  nextRequestToken: number
): CandidateDetailCache {
  return Object.freeze({
    entries: entries as ReadonlyMap<string, CandidateDetailCacheEntry>,
    nextRequestToken,
  });
}

function readScore(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readSourceString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function normalizeId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
