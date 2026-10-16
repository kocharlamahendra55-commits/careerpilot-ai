import {
  CANDIDATE_PAGE_SIZE_BOUNDS,
  DEFAULT_CANDIDATE_PAGE_SIZE,
  RECRUITER_APPLICATION_COLLECTION_PATH,
  RECRUITER_JOB_COLLECTION_PATH,
  SUPPORTED_APPLICATION_QUERY_KEYS,
  recruiterWorkspaceCapabilities,
} from "./capabilities";
import {
  isJobLifecycleStatus,
  type SupportedJobWrite,
} from "./types";

export type JobDetailPath = `${typeof RECRUITER_JOB_COLLECTION_PATH}/${string}`;

export type ApplicationDetailPath =
  `${typeof RECRUITER_APPLICATION_COLLECTION_PATH}/${string}`;

export type ApplicationStatusPath =
  `${typeof RECRUITER_APPLICATION_COLLECTION_PATH}/${string}/status`;

/**
 * The exact five recruiter-settable target statuses admitted by the approved
 * `PATCH /api/recruiter/applications/[id]/status` operation. The request
 * boundary refuses to serialize any status outside this allowlist, so an
 * unchecked caller cannot request an unsupported target.
 */
export const APPLICATION_STATUS_TARGETS = Object.freeze([
  "SHORTLISTED",
  "INTERVIEW",
  "OFFERED",
  "HIRED",
  "REJECTED",
] as const);

export type ApplicationStatusTarget = (typeof APPLICATION_STATUS_TARGETS)[number];

/** The only body shape the client may send to the application status route. */
export interface ApplicationStatusWrite {
  readonly status: ApplicationStatusTarget;
}

export function isApplicationStatusTarget(
  value: unknown
): value is ApplicationStatusTarget {
  return (
    typeof value === "string" &&
    (APPLICATION_STATUS_TARGETS as readonly string[]).includes(value)
  );
}

export interface JobCollectionRequestIntent {
  readonly operation: "job-collection";
  readonly method: "GET";
  readonly path: typeof RECRUITER_JOB_COLLECTION_PATH;
}

export interface JobDetailRequestIntent {
  readonly operation: "job-detail";
  readonly method: "GET";
  readonly jobId: string;
  readonly path: JobDetailPath;
}

export interface JobCreateRequestIntent {
  readonly operation: "job-create";
  readonly method: "POST";
  readonly path: typeof RECRUITER_JOB_COLLECTION_PATH;
  readonly body: Readonly<SupportedJobWrite>;
}

export interface JobUpdateRequestIntent {
  readonly operation: "job-update";
  readonly method: "PUT";
  readonly jobId: string;
  readonly path: JobDetailPath;
  readonly body: Readonly<SupportedJobWrite>;
}

/** The only partial job write admitted by the closed lifecycle intent. */
export interface JobLifecycleStatusWrite {
  readonly status: SupportedJobWrite["status"];
}

/** A lifecycle PUT may carry exactly one target status and no stale job fields. */
export interface JobLifecycleUpdateRequestIntent {
  readonly operation: "job-lifecycle-update";
  readonly method: "PUT";
  readonly jobId: string;
  readonly path: JobDetailPath;
  readonly body: Readonly<JobLifecycleStatusWrite>;
}

/**
 * The only candidate collection query the client may serialize. Optional
 * filters are omitted entirely when blank; `page` is a positive integer and
 * `pageSize` is bounded to the endpoint's inclusive 1..50 range.
 */
export interface ApplicationCollectionQuery {
  readonly jobId?: string;
  readonly status?: string;
  readonly search?: string;
  readonly page: number;
  readonly pageSize: number;
}

export interface ApplicationCollectionRequestIntent {
  readonly operation: "application-collection";
  readonly method: "GET";
  readonly path: typeof RECRUITER_APPLICATION_COLLECTION_PATH;
  readonly query: Readonly<ApplicationCollectionQuery>;
}

export interface ApplicationDetailRequestIntent {
  readonly operation: "application-detail";
  readonly method: "GET";
  readonly applicationId: string;
  readonly path: ApplicationDetailPath;
}

/**
 * The only application-status mutation the client may serialize: a single
 * `PATCH` carrying exactly one allowlisted target status for one application.
 * It admits no other method, path, or body field.
 */
export interface ApplicationStatusUpdateRequestIntent {
  readonly operation: "application-status-update";
  readonly method: "PATCH";
  readonly applicationId: string;
  readonly path: ApplicationStatusPath;
  readonly body: Readonly<ApplicationStatusWrite>;
}

/**
 * Closed request surface for the recruiter workspace. Besides the verified job
 * and application read/write operations, the only status mutation permitted is
 * the single approved application-status `PATCH`; no generic endpoint/method
 * constructor exists.
 */
export type WorkspaceRequestIntent =
  | JobCollectionRequestIntent
  | JobDetailRequestIntent
  | JobCreateRequestIntent
  | JobUpdateRequestIntent
  | JobLifecycleUpdateRequestIntent
  | ApplicationCollectionRequestIntent
  | ApplicationDetailRequestIntent
  | ApplicationStatusUpdateRequestIntent;

/** A serializable fetch descriptor produced only from an allowlisted intent. */
export interface WorkspaceFetchRequest {
  readonly url: string;
  readonly init: Readonly<{
    method: WorkspaceRequestIntent["method"];
    headers?: Readonly<{ "Content-Type": "application/json" }>;
    body?: string;
  }>;
}

/**
 * Copies a write payload field-by-field instead of spreading an arbitrary form
 * object. Validation of a nonblank title is intentionally owned by Task 2.1.
 */
export function copySupportedJobWrite(
  source: SupportedJobWrite
): Readonly<SupportedJobWrite> {
  if (!isSupportedJobWrite(source)) {
    throw new TypeError("Job writes must contain only the supported job fields.");
  }

  const { title, description, location, salary, requirements, status } = source;

  return Object.freeze({
    title,
    description,
    location,
    salary,
    requirements,
    status,
  });
}

/** Copies the exact one-field lifecycle payload; arbitrary partial writes are rejected. */
export function copyJobLifecycleStatusWrite(
  source: JobLifecycleStatusWrite
): Readonly<JobLifecycleStatusWrite> {
  if (!isJobLifecycleStatusWrite(source)) {
    throw new TypeError("Job lifecycle writes must contain only a valid status.");
  }

  return Object.freeze({ status: source.status });
}

/** Copies the exact one-field status payload; only the five targets are admitted. */
export function copyApplicationStatusWrite(
  source: ApplicationStatusWrite
): Readonly<ApplicationStatusWrite> {
  if (!isApplicationStatusWrite(source)) {
    throw new TypeError(
      "Application status writes must contain only a supported target status."
    );
  }

  return Object.freeze({ status: source.status });
}

/**
 * Builds a canonical candidate query field-by-field instead of spreading an
 * arbitrary object. Optional filters are trimmed and omitted when blank; `page`
 * and `pageSize` are clamped, so an unchecked caller cannot introduce an
 * unsupported query key or an out-of-range page value.
 */
export function copyApplicationCollectionQuery(
  source: ApplicationCollectionQuery
): Readonly<ApplicationCollectionQuery> {
  if (!isRecord(source)) {
    throw new TypeError("Application collection queries must be an object.");
  }

  const query: {
    jobId?: string;
    status?: string;
    search?: string;
    page: number;
    pageSize: number;
  } = {
    page: clampApplicationPage(source.page),
    pageSize: clampApplicationPageSize(source.pageSize),
  };

  const jobId = normalizeOptionalQueryValue(source.jobId);
  if (jobId !== null) query.jobId = jobId;

  const status = normalizeOptionalQueryValue(source.status);
  if (status !== null) query.status = status;

  const search = normalizeOptionalQueryValue(source.search);
  if (search !== null) query.search = search;

  return Object.freeze(query);
}

/** Builds the one unparameterized recruiter job collection request. */
export function createJobCollectionRequestIntent(): JobCollectionRequestIntent {
  return freezeIntent({
    operation: "job-collection",
    method: recruiterWorkspaceCapabilities.jobs.collection.method,
    path: recruiterWorkspaceCapabilities.jobs.collection.path,
  });
}

/** Builds an encoded, recruiter-owned job detail GET request. */
export function createJobDetailRequestIntent(jobId: string): JobDetailRequestIntent {
  const normalizedJobId = normalizeJobId(jobId);

  return freezeIntent({
    operation: "job-detail",
    method: recruiterWorkspaceCapabilities.jobs.detail.method,
    jobId: normalizedJobId,
    path: createJobDetailPath(normalizedJobId),
  });
}

/** Builds an allowlisted recruiter job creation request. */
export function createJobCreateRequestIntent(
  body: SupportedJobWrite
): JobCreateRequestIntent {
  return freezeIntent({
    operation: "job-create",
    method: recruiterWorkspaceCapabilities.jobs.create.method,
    path: recruiterWorkspaceCapabilities.jobs.create.path,
    body: copySupportedJobWrite(body),
  });
}

/** Builds an allowlisted full recruiter job update request for explicit saves. */
export function createJobUpdateRequestIntent(
  jobId: string,
  body: SupportedJobWrite
): JobUpdateRequestIntent {
  const normalizedJobId = normalizeJobId(jobId);

  return freezeIntent({
    operation: "job-update",
    method: recruiterWorkspaceCapabilities.jobs.update.method,
    jobId: normalizedJobId,
    path: createJobDetailPath(normalizedJobId),
    body: copySupportedJobWrite(body),
  });
}

/** Builds an allowlisted lifecycle PUT with exactly `{ status: targetStatus }`. */
export function createJobLifecycleUpdateRequestIntent(
  jobId: string,
  body: JobLifecycleStatusWrite
): JobLifecycleUpdateRequestIntent {
  const normalizedJobId = normalizeJobId(jobId);

  return freezeIntent({
    operation: "job-lifecycle-update",
    method: recruiterWorkspaceCapabilities.jobs.update.method,
    jobId: normalizedJobId,
    path: createJobDetailPath(normalizedJobId),
    body: copyJobLifecycleStatusWrite(body),
  });
}

/** Builds an allowlisted recruiter application collection GET request. */
export function createApplicationCollectionRequestIntent(
  query: ApplicationCollectionQuery
): ApplicationCollectionRequestIntent {
  return freezeIntent({
    operation: "application-collection",
    method: recruiterWorkspaceCapabilities.applications.collection.method,
    path: recruiterWorkspaceCapabilities.applications.collection.path,
    query: copyApplicationCollectionQuery(query),
  });
}

/** Builds an encoded, recruiter-owned application detail GET request. */
export function createApplicationDetailRequestIntent(
  applicationId: string
): ApplicationDetailRequestIntent {
  const normalizedApplicationId = normalizeApplicationId(applicationId);

  return freezeIntent({
    operation: "application-detail",
    method: recruiterWorkspaceCapabilities.applications.detail.method,
    applicationId: normalizedApplicationId,
    path: createApplicationDetailPath(normalizedApplicationId),
  });
}

/** Builds the single approved application-status `PATCH` with `{ status }`. */
export function createApplicationStatusUpdateRequestIntent(
  applicationId: string,
  body: ApplicationStatusWrite
): ApplicationStatusUpdateRequestIntent {
  const normalizedApplicationId = normalizeApplicationId(applicationId);

  const intent: ApplicationStatusUpdateRequestIntent = {
    operation: "application-status-update",
    method: "PATCH",
    applicationId: normalizedApplicationId,
    path: createApplicationStatusPath(normalizedApplicationId),
    body: copyApplicationStatusWrite(body),
  };

  return freezeIntent(intent);
}

/**
 * Converts a closed request intent to fetch-ready values. The function performs
 * runtime validation too, so an unchecked JavaScript caller cannot serialize an
 * unsupported path, query parameter, method, or write field.
 */
export function serializeWorkspaceRequest(
  intent: WorkspaceRequestIntent
): WorkspaceFetchRequest {
  if (!isWorkspaceRequestIntent(intent)) {
    throw new TypeError("Unsupported recruiter workspace request intent.");
  }

  switch (intent.operation) {
    case "job-collection":
    case "job-detail":
    case "application-detail":
      return Object.freeze({
        url: intent.path,
        init: Object.freeze({ method: intent.method }),
      });
    case "application-collection":
      return Object.freeze({
        url: buildApplicationCollectionUrl(intent.path, intent.query),
        init: Object.freeze({ method: intent.method }),
      });
    case "job-create":
    case "job-update":
    case "job-lifecycle-update":
    case "application-status-update":
      return Object.freeze({
        url: intent.path,
        init: Object.freeze({
          method: intent.method,
          headers: Object.freeze({ "Content-Type": "application/json" as const }),
          body: JSON.stringify(intent.body),
        }),
      });
    default:
      return assertNever(intent);
  }
}

/** Returns a fresh, validated copy suitable for immutable retry snapshots. */
export function cloneWorkspaceRequestIntent(
  intent: WorkspaceRequestIntent
): WorkspaceRequestIntent {
  if (!isWorkspaceRequestIntent(intent)) {
    throw new TypeError("Unsupported recruiter workspace request intent.");
  }

  switch (intent.operation) {
    case "job-collection":
      return createJobCollectionRequestIntent();
    case "job-detail":
      return createJobDetailRequestIntent(intent.jobId);
    case "job-create":
      return createJobCreateRequestIntent(intent.body);
    case "job-update":
      return createJobUpdateRequestIntent(intent.jobId, intent.body);
    case "job-lifecycle-update":
      return createJobLifecycleUpdateRequestIntent(intent.jobId, intent.body);
    case "application-collection":
      return createApplicationCollectionRequestIntent(intent.query);
    case "application-detail":
      return createApplicationDetailRequestIntent(intent.applicationId);
    case "application-status-update":
      return createApplicationStatusUpdateRequestIntent(intent.applicationId, intent.body);
    default:
      return assertNever(intent);
  }
}

/** Runtime guard for the only requests that the Part 1 request boundary accepts. */
export function isWorkspaceRequestIntent(
  value: unknown
): value is WorkspaceRequestIntent {
  if (!isRecord(value)) {
    return false;
  }

  switch (value.operation) {
    case "job-collection":
      return (
        hasExactKeys(value, ["operation", "method", "path"]) &&
        value.method === recruiterWorkspaceCapabilities.jobs.collection.method &&
        value.path === recruiterWorkspaceCapabilities.jobs.collection.path
      );
    case "job-detail":
      return (
        hasExactKeys(value, ["operation", "method", "jobId", "path"]) &&
        value.method === recruiterWorkspaceCapabilities.jobs.detail.method &&
        isNormalizedJobId(value.jobId) &&
        value.path === createJobDetailPath(value.jobId)
      );
    case "job-create":
      return (
        hasExactKeys(value, ["operation", "method", "path", "body"]) &&
        value.method === recruiterWorkspaceCapabilities.jobs.create.method &&
        value.path === recruiterWorkspaceCapabilities.jobs.create.path &&
        isSupportedJobWrite(value.body)
      );
    case "job-update":
      return (
        hasExactKeys(value, ["operation", "method", "jobId", "path", "body"]) &&
        value.method === recruiterWorkspaceCapabilities.jobs.update.method &&
        isNormalizedJobId(value.jobId) &&
        value.path === createJobDetailPath(value.jobId) &&
        isSupportedJobWrite(value.body)
      );
    case "job-lifecycle-update":
      return (
        hasExactKeys(value, ["operation", "method", "jobId", "path", "body"]) &&
        value.method === recruiterWorkspaceCapabilities.jobs.update.method &&
        isNormalizedJobId(value.jobId) &&
        value.path === createJobDetailPath(value.jobId) &&
        isJobLifecycleStatusWrite(value.body)
      );
    case "application-collection":
      return (
        hasExactKeys(value, ["operation", "method", "path", "query"]) &&
        value.method === recruiterWorkspaceCapabilities.applications.collection.method &&
        value.path === recruiterWorkspaceCapabilities.applications.collection.path &&
        isCanonicalApplicationCollectionQuery(value.query)
      );
    case "application-detail":
      return (
        hasExactKeys(value, ["operation", "method", "applicationId", "path"]) &&
        value.method === recruiterWorkspaceCapabilities.applications.detail.method &&
        isNormalizedApplicationId(value.applicationId) &&
        value.path === createApplicationDetailPath(value.applicationId)
      );
    case "application-status-update":
      return (
        hasExactKeys(value, ["operation", "method", "applicationId", "path", "body"]) &&
        value.method === "PATCH" &&
        isNormalizedApplicationId(value.applicationId) &&
        value.path === createApplicationStatusPath(value.applicationId) &&
        isApplicationStatusWrite(value.body)
      );
    default:
      return false;
  }
}

function createJobDetailPath(jobId: string): JobDetailPath {
  return `${RECRUITER_JOB_COLLECTION_PATH}/${encodeURIComponent(jobId)}`;
}

function normalizeJobId(jobId: string): string {
  if (typeof jobId !== "string" || jobId.trim().length === 0) {
    throw new TypeError("A nonblank job ID is required.");
  }

  return jobId.trim();
}

function isNormalizedJobId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim();
}

function createApplicationDetailPath(applicationId: string): ApplicationDetailPath {
  return `${RECRUITER_APPLICATION_COLLECTION_PATH}/${encodeURIComponent(applicationId)}`;
}

function createApplicationStatusPath(applicationId: string): ApplicationStatusPath {
  return `${RECRUITER_APPLICATION_COLLECTION_PATH}/${encodeURIComponent(applicationId)}/status`;
}

function normalizeApplicationId(applicationId: string): string {
  if (typeof applicationId !== "string" || applicationId.trim().length === 0) {
    throw new TypeError("A nonblank application ID is required.");
  }

  return applicationId.trim();
}

function isNormalizedApplicationId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim();
}

/** Serializes only present keys in a fixed order; page values are integers. */
function buildApplicationCollectionUrl(
  basePath: typeof RECRUITER_APPLICATION_COLLECTION_PATH,
  query: Readonly<ApplicationCollectionQuery>
): string {
  const params: string[] = [];

  if (query.jobId !== undefined) {
    params.push(`jobId=${encodeURIComponent(query.jobId)}`);
  }
  if (query.status !== undefined) {
    params.push(`status=${encodeURIComponent(query.status)}`);
  }
  if (query.search !== undefined) {
    params.push(`search=${encodeURIComponent(query.search)}`);
  }
  params.push(`page=${query.page}`);
  params.push(`pageSize=${query.pageSize}`);

  return `${basePath}?${params.join("&")}`;
}

/**
 * Validates the canonical query stored in a collection intent: only allowlisted
 * keys, a positive integer page, a bounded integer page size, and any present
 * optional filter being a nonblank, already-trimmed string.
 */
function isCanonicalApplicationCollectionQuery(
  value: unknown
): value is ApplicationCollectionQuery {
  if (!isRecord(value)) {
    return false;
  }

  for (const key of Object.keys(value)) {
    if (!(SUPPORTED_APPLICATION_QUERY_KEYS as readonly string[]).includes(key)) {
      return false;
    }
  }

  return (
    isBoundedApplicationPage(value.page) &&
    isBoundedApplicationPageSize(value.pageSize) &&
    isCanonicalOptionalQueryValue(value.jobId) &&
    isCanonicalOptionalQueryValue(value.status) &&
    isCanonicalOptionalQueryValue(value.search)
  );
}

function isCanonicalOptionalQueryValue(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "string" && value.length > 0 && value === value.trim())
  );
}

function normalizeOptionalQueryValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function clampApplicationPage(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  const page = Math.floor(value);
  return page >= 1 ? page : 1;
}

function clampApplicationPageSize(value: unknown): number {
  const { min, max } = CANDIDATE_PAGE_SIZE_BOUNDS;

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return Math.min(Math.max(DEFAULT_CANDIDATE_PAGE_SIZE, min), max);
  }

  return Math.min(Math.max(Math.floor(value), min), max);
}

function isBoundedApplicationPage(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function isBoundedApplicationPageSize(value: unknown): boolean {
  const { min, max } = CANDIDATE_PAGE_SIZE_BOUNDS;
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function isSupportedJobWrite(value: unknown): value is SupportedJobWrite {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasExactKeys(value, [
      "title",
      "description",
      "location",
      "salary",
      "requirements",
      "status",
    ]) &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.location === "string" &&
    typeof value.salary === "string" &&
    typeof value.requirements === "string" &&
    isJobLifecycleStatus(value.status)
  );
}

function isJobLifecycleStatusWrite(
  value: unknown
): value is JobLifecycleStatusWrite {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["status"]) &&
    isJobLifecycleStatus(value.status)
  );
}

function isApplicationStatusWrite(
  value: unknown
): value is ApplicationStatusWrite {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["status"]) &&
    isApplicationStatusTarget(value.status)
  );
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[]
): boolean {
  const keys = Object.keys(value);

  return (
    keys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function freezeIntent<T extends WorkspaceRequestIntent>(intent: T): T {
  return Object.freeze(intent) as T;
}

function assertNever(value: never): never {
  throw new TypeError(`Unsupported recruiter workspace request intent: ${String(value)}`);
}
