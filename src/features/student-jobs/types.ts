/**
 * Transport and view types for the Student Jobs "Browse Jobs" experience (Part 1).
 *
 * These types intentionally model only the lightweight browse list returned by
 * `GET /api/jobs`. That endpoint returns ONLY published jobs and omits the full
 * description/requirements. Apply-flow and job-detail types belong to Part 2.
 *
 * All projections are frozen and defensively normalized so a malformed API item
 * can never reach the UI as a plausible-but-broken card.
 */

/** The exact fields the browse list endpoint exposes per published job. */
export interface PublishedJobListItem {
  readonly id: string;
  readonly title: string;
  readonly company: string;
  readonly location: string;
  readonly salary: string;
  /** ISO timestamp string as serialized by the JSON route. */
  readonly createdAt: string;
}

/** The documented success shape of `GET /api/jobs`. */
export interface PublishedJobsResponse {
  readonly jobs: readonly PublishedJobListItem[];
}

/** The bounded safe error shape exposed by the JSON route. */
export interface PublishedJobsErrorResponse {
  readonly error?: unknown;
}

/**
 * Normalizes one untrusted list item into a frozen `PublishedJobListItem`.
 *
 * A persisted, non-empty `id` is required because the browse card keys and the
 * detail route (`/dashboard/jobs/[id]`) both depend on it. Every other field is
 * coerced to a trimmed string with a safe empty fallback, so missing optional
 * fields (location/salary default to "") never render as `undefined`.
 */
export function normalizePublishedJobListItem(value: unknown): PublishedJobListItem | null {
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
    location: readString(value.location),
    salary: readString(value.salary),
    createdAt: readString(value.createdAt),
  });
}

/**
 * Normalizes the documented `{ jobs }` collection shape. Malformed and duplicate
 * items are skipped defensively; the returned array is frozen so downstream pure
 * transforms retain an immutable source list. Returns `null` only when the
 * envelope itself is not the expected `{ jobs: [] }` shape, letting the caller
 * treat a structurally invalid payload as an error.
 */
export function normalizePublishedJobList(
  value: unknown
): readonly PublishedJobListItem[] | null {
  if (!isRecord(value) || !Array.isArray(value.jobs)) {
    return null;
  }

  const items: PublishedJobListItem[] = [];
  const seen = new Set<string>();

  for (const raw of value.jobs) {
    const item = normalizePublishedJobListItem(raw);
    if (item === null || seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    items.push(item);
  }

  return Object.freeze(items);
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
