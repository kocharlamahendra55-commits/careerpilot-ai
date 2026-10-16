/**
 * Transport and state types for Recruiter Workspace Phase 2, Part 1.
 *
 * These types intentionally model only Job Posting and Manage Jobs. Candidate
 * and application-management types belong to later, separately scoped work.
 */

/** Lifecycle values supported by the Phase 2 job controls. */
export const JOB_LIFECYCLE_STATUSES = Object.freeze([
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const);

export type JobLifecycleStatus = (typeof JOB_LIFECYCLE_STATUSES)[number];

/**
 * The complete client write allowlist for the existing recruiter job contract.
 * Company is profile-derived; all aspirational form fields stay local-only.
 */
export const SUPPORTED_JOB_WRITE_FIELDS = Object.freeze([
  "title",
  "description",
  "location",
  "salary",
  "requirements",
  "status",
] as const);

export type SupportedJobWriteField = (typeof SUPPORTED_JOB_WRITE_FIELDS)[number];

/** The only body shape the Phase 2 client may send to job POST or PUT routes. */
export interface SupportedJobWrite {
  title: string;
  description: string;
  location: string;
  salary: string;
  requirements: string;
  status: JobLifecycleStatus;
}

/** Source-backed application count included by the job collection response. */
export interface RecruiterJobApplicationCount {
  applications: number;
}

/**
 * Source-backed job fields returned by the existing recruiter job endpoints.
 * `_count` is supplied by the collection endpoint but not the detail endpoint.
 */
export interface RecruiterJob {
  id: string;
  recruiterId: string;
  title: string;
  company: string;
  description: string;
  location: string;
  salary: string;
  requirements: string;
  isActive: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: RecruiterJobApplicationCount;
}

export interface RecruiterJobCollectionResponse {
  jobs: RecruiterJob[];
}

export interface RecruiterJobResponse {
  job: RecruiterJob;
}

/** The bounded safe error shape exposed by the existing JSON routes. */
export interface RecruiterWorkspaceErrorResponse {
  error?: unknown;
}

export function isJobLifecycleStatus(value: unknown): value is JobLifecycleStatus {
  return (
    typeof value === "string" &&
    (JOB_LIFECYCLE_STATUSES as readonly string[]).includes(value)
  );
}

export function isSupportedJobWriteField(value: unknown): value is SupportedJobWriteField {
  return (
    typeof value === "string" &&
    (SUPPORTED_JOB_WRITE_FIELDS as readonly string[]).includes(value)
  );
}
