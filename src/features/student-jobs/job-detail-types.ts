/**
 * Transport and view types for the Student Jobs "Job Details + Apply" experience
 * (Part 2). These model the richer single-job payload returned by
 * `GET /api/jobs/[id]` — which, unlike the browse list, includes the full
 * `description` (plain text) and `requirements` (a JSON-encoded string array of
 * skill tags, defaulting to "[]").
 *
 * Every projection is frozen and defensively normalized, mirroring Part 1, so a
 * malformed API item can never reach the UI as a plausible-but-broken detail.
 */

/** The exact fields the job-detail endpoint exposes for a published job. */
export interface PublishedJobDetail {
  readonly id: string;
  readonly title: string;
  readonly company: string;
  /** Plain text. Rendered ESCAPED with preserved line breaks (never as HTML). */
  readonly description: string;
  readonly location: string;
  readonly salary: string;
  /**
   * Raw, untrusted string exactly as persisted by the recruiter — normally
   * `JSON.stringify(tags)` (default "[]"). Parse it with
   * {@link parseJobRequirements}; never render it directly as tags.
   */
  readonly requirements: string;
  readonly status: string;
  /** ISO timestamp string as serialized by the JSON route. */
  readonly createdAt: string;
}

/** The documented success shape of `GET /api/jobs/[id]`. */
export interface JobDetailResponse {
  readonly job: PublishedJobDetail;
  readonly hasApplied: boolean;
}

/**
 * Normalizes one untrusted job object into a frozen {@link PublishedJobDetail}.
 *
 * A persisted, non-empty `id` is required (the apply flow and the applied-store
 * both key off it). Every other field is coerced to a trimmed string with a safe
 * empty fallback, so a missing `salary`/`location`/`requirements` renders as an
 * empty string the UI can branch on rather than `undefined`.
 */
export function normalizePublishedJobDetail(value: unknown): PublishedJobDetail | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readNonEmptyString(value.id);
  if (id === null) {
    return null;
  }

  return Object.freeze({
    id,
    title: readString(value.title),
    company: readString(value.company),
    description: readString(value.description),
    location: readString(value.location),
    salary: readString(value.salary),
    requirements: readString(value.requirements),
    status: readString(value.status),
    createdAt: readString(value.createdAt),
  });
}

/**
 * Normalizes the documented `{ job, hasApplied }` envelope. Returns `null` when
 * the envelope or its `job` is structurally invalid, letting the caller treat a
 * malformed payload as an error. `hasApplied` is strictly coerced to a boolean.
 */
export function normalizeJobDetailResponse(value: unknown): JobDetailResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const job = normalizePublishedJobDetail(value.job);
  if (job === null) {
    return null;
  }

  return Object.freeze({ job, hasApplied: value.hasApplied === true });
}

/**
 * Defensively parses the raw `requirements` string into an ordered, de-duplicated
 * list of non-empty skill tags.
 *
 * The recruiter stores `JSON.stringify(tags)`. This trims each element, drops
 * empty/whitespace-only and non-string entries, and removes duplicates while
 * preserving first-seen order. If the string is not a JSON array (bad JSON, or a
 * JSON object/number/etc.), an empty array is returned — the caller then decides
 * whether to fall back to rendering the raw string as plain text (see
 * {@link isJsonArrayRequirements}).
 */
export function parseJobRequirements(requirements: string): string[] {
  if (typeof requirements !== "string" || requirements.trim().length === 0) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(requirements);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const tags: string[] = [];
  const seen = new Set<string>();

  for (const entry of parsed) {
    if (typeof entry !== "string") {
      continue;
    }
    const tag = entry.trim();
    if (tag.length === 0 || seen.has(tag)) {
      continue;
    }
    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}

/**
 * Reports whether the raw `requirements` string is a valid JSON array. Used by
 * the detail page to distinguish "empty/invalid array" (show an unavailable note)
 * from "non-array free text" (safe to render the raw string as plain text).
 */
export function isJsonArrayRequirements(requirements: string): boolean {
  if (typeof requirements !== "string" || requirements.trim().length === 0) {
    return false;
  }
  try {
    return Array.isArray(JSON.parse(requirements));
  } catch {
    return false;
  }
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
