import {
  createJobLifecycleUpdateRequestIntent,
  type JobLifecycleStatusWrite,
  type JobLifecycleUpdateRequestIntent,
} from "./request-intents";
import { extractSafeErrorMessage } from "./resource-state";
import type {
  JobLifecycleStatus,
  RecruiterJob,
  RecruiterJobResponse,
} from "./types";

/**
 * These are the only job lifecycle actions represented by the current job API.
 * Archive is the request boundary for a UI labelled either "Archive" or
 * "Close Job"; reopening returns an archived job to PUBLISHED.
 */
export const JOB_LIFECYCLE_ACTIONS = Object.freeze([
  "PUBLISH",
  "SAVE_AS_DRAFT",
  "ARCHIVE",
  "REOPEN",
  "DELETE",
] as const);

export type JobLifecycleAction = (typeof JOB_LIFECYCLE_ACTIONS)[number];

export const DELETE_JOB_UNAVAILABLE_MESSAGE =
  "Deleting jobs is unavailable because the current recruiter job service exposes no DELETE operation.";

export const JOB_LIFECYCLE_FAILURE_MESSAGE = "Unable to update the job lifecycle.";

export interface JobLifecycleConfirmation {
  readonly jobId: string;
  readonly jobTitle: string;
  readonly action: Exclude<JobLifecycleAction, "DELETE">;
  readonly actionLabel: string;
  readonly targetStatus: JobLifecycleStatus;
  readonly requiresConfirmation: true;
}

export interface AvailableJobLifecyclePlan {
  readonly availability: "available";
  readonly action: Exclude<JobLifecycleAction, "DELETE">;
  readonly targetStatus: JobLifecycleStatus;
  readonly confirmation: JobLifecycleConfirmation;
}

export interface UnavailableJobLifecyclePlan {
  readonly availability: "unavailable";
  readonly action: "DELETE";
  readonly targetStatus: null;
  readonly confirmation: null;
  readonly message: typeof DELETE_JOB_UNAVAILABLE_MESSAGE;
}

/**
 * Delete is intentionally an unavailable plan rather than a request. The
 * closed request surface contains no DELETE intent, endpoint, or HTTP method.
 */
export type JobLifecyclePlan =
  | AvailableJobLifecyclePlan
  | UnavailableJobLifecyclePlan;

export type JobLifecyclePhase =
  | "idle"
  | "confirming"
  | "saving"
  | "success"
  | "error"
  | "unavailable";

/**
 * Source status is never optimistically changed. During saving/error it remains
 * the prior returned value; after success it comes only from the returned job.
 */
export interface JobLifecycleState {
  readonly phase: JobLifecyclePhase;
  readonly sourceJob: RecruiterJob;
  readonly action: JobLifecycleAction | null;
  readonly confirmation: JobLifecycleConfirmation | null;
  readonly request: JobLifecycleUpdateRequestIntent | null;
  readonly errorMessage: string | null;
  readonly unavailabilityMessage: string | null;
  readonly requestToken: number;
}

/** Returns the current source-backed status appropriate for a StatusBadge. */
export function getDisplayedJobLifecycleStatus(state: JobLifecycleState): string {
  return state.sourceJob.status;
}

export function isJobLifecycleAction(value: unknown): value is JobLifecycleAction {
  return (
    typeof value === "string" &&
    (JOB_LIFECYCLE_ACTIONS as readonly string[]).includes(value)
  );
}

/**
 * Maps every supported action to the only truthful source status it may request.
 * DELETE deliberately has no target status because no API operation exists.
 */
export function getJobLifecycleTargetStatus(
  action: JobLifecycleAction
): JobLifecycleStatus | null {
  switch (action) {
    case "PUBLISH":
    case "REOPEN":
      return "PUBLISHED";
    case "SAVE_AS_DRAFT":
      return "DRAFT";
    case "ARCHIVE":
      return "ARCHIVED";
    case "DELETE":
      return null;
    default:
      return assertNever(action);
  }
}

/** Provides the confirmation/unavailability information that a later UI renders. */
export function planJobLifecycleAction(
  job: RecruiterJob,
  action: JobLifecycleAction
): JobLifecyclePlan {
  const confirmation = createJobLifecycleConfirmation(job, action);

  if (confirmation === null) {
    return Object.freeze({
      availability: "unavailable" as const,
      action: "DELETE" as const,
      targetStatus: null,
      confirmation: null,
      message: DELETE_JOB_UNAVAILABLE_MESSAGE,
    });
  }

  return Object.freeze({
    availability: "available" as const,
    action: confirmation.action,
    targetStatus: confirmation.targetStatus,
    confirmation,
  });
}

/**
 * Builds a confirmation descriptor but never a network request. A null result
 * represents the unavailable Delete action.
 */
export function createJobLifecycleConfirmation(
  job: RecruiterJob,
  action: JobLifecycleAction
): JobLifecycleConfirmation | null {
  const targetStatus = getJobLifecycleTargetStatus(action);

  if (targetStatus === null || action === "DELETE") {
    return null;
  }

  return Object.freeze({
    jobId: job.id,
    jobTitle: getConfirmationJobTitle(job.title),
    action,
    actionLabel: getJobLifecycleActionLabel(action),
    targetStatus,
    requiresConfirmation: true,
  });
}

/**
 * Creates only an existing job PUT intent with an exact status-only body.
 * Returning null for Delete guarantees callers cannot turn that unavailable
 * action into a fake deletion request.
 */
export function createJobLifecycleRequestIntent(
  job: RecruiterJob,
  action: JobLifecycleAction
): JobLifecycleUpdateRequestIntent | null {
  const targetStatus = getJobLifecycleTargetStatus(action);

  if (targetStatus === null) {
    return null;
  }

  return createJobLifecycleUpdateRequestIntent(
    job.id,
    createJobLifecycleWrite(targetStatus)
  );
}

/**
 * Creates the closed lifecycle body without copying title, description,
 * location, salary, or requirements from a potentially stale collection row.
 */
export function createJobLifecycleWrite(
  targetStatus: JobLifecycleStatus
): Readonly<JobLifecycleStatusWrite> {
  return Object.freeze({ status: targetStatus });
}

export function createJobLifecycleState(job: RecruiterJob): JobLifecycleState {
  return {
    phase: "idle",
    sourceJob: job,
    action: null,
    confirmation: null,
    request: null,
    errorMessage: null,
    unavailabilityMessage: null,
    requestToken: 0,
  };
}

/** Opens a confirmation state for a supported action, or reports Delete as unavailable. */
export function requestJobLifecycleConfirmation(
  state: JobLifecycleState,
  action: JobLifecycleAction
): JobLifecycleState {
  if (state.phase === "saving") {
    return state;
  }

  const plan = planJobLifecycleAction(state.sourceJob, action);

  if (plan.availability === "unavailable") {
    return {
      phase: "unavailable",
      sourceJob: state.sourceJob,
      action: plan.action,
      confirmation: null,
      request: null,
      errorMessage: null,
      unavailabilityMessage: plan.message,
      requestToken: state.requestToken,
    };
  }

  return {
    phase: "confirming",
    sourceJob: state.sourceJob,
    action: plan.action,
    confirmation: plan.confirmation,
    request: null,
    errorMessage: null,
    unavailabilityMessage: null,
    requestToken: state.requestToken,
  };
}

/** Cancelling a confirmation changes no source-backed job value and emits no request. */
export function cancelJobLifecycleConfirmation(
  state: JobLifecycleState
): JobLifecycleState {
  if (state.phase !== "confirming") {
    return state;
  }

  return createJobLifecycleStateWithSource(state.sourceJob, state.requestToken);
}

/**
 * Moves a confirmed available action into the pending state and exposes exactly
 * one job PUT request intent for the UI to execute. It never enables Delete.
 */
export function beginJobLifecycleRequest(
  state: JobLifecycleState
): JobLifecycleState {
  if (state.phase !== "confirming" || state.confirmation === null) {
    return state;
  }

  const request = createJobLifecycleRequestIntent(state.sourceJob, state.confirmation.action);

  if (request === null) {
    return {
      phase: "unavailable",
      sourceJob: state.sourceJob,
      action: "DELETE",
      confirmation: null,
      request: null,
      errorMessage: null,
      unavailabilityMessage: DELETE_JOB_UNAVAILABLE_MESSAGE,
      requestToken: state.requestToken,
    };
  }

  return {
    phase: "saving",
    sourceJob: state.sourceJob,
    action: state.confirmation.action,
    confirmation: state.confirmation,
    request,
    errorMessage: null,
    unavailabilityMessage: null,
    requestToken: state.requestToken + 1,
  };
}

/**
 * Accepts only the latest pending result for the same job. The StatusBadge can
 * read the returned source status via getDisplayedJobLifecycleStatus afterward.
 */
export function resolveJobLifecycleSuccess(
  state: JobLifecycleState,
  requestToken: number,
  response: RecruiterJobResponse
): JobLifecycleState {
  if (!isCurrentLifecycleRequest(state, requestToken)) {
    return state;
  }

  if (!isReturnedJobForSourceState(response?.job, state.sourceJob.id)) {
    return resolveLifecycleFailure(
      state,
      "The job lifecycle update returned an unexpected source record."
    );
  }

  return {
    phase: "success",
    sourceJob: response.job,
    action: state.action,
    confirmation: null,
    request: null,
    errorMessage: null,
    unavailabilityMessage: null,
    requestToken: state.requestToken,
  };
}

/**
 * Preserves the exact prior source job reference on failure. No target status is
 * applied locally, so the UI cannot display an optimistic lifecycle result.
 */
export function resolveJobLifecycleFailure(
  state: JobLifecycleState,
  requestToken: number,
  errorResponse: unknown,
  fallbackMessage = JOB_LIFECYCLE_FAILURE_MESSAGE
): JobLifecycleState {
  if (!isCurrentLifecycleRequest(state, requestToken)) {
    return state;
  }

  return resolveLifecycleFailure(
    state,
    extractSafeErrorMessage(errorResponse, fallbackMessage)
  );
}

/** Only a pending request with the latest token may change lifecycle state. */
export function isCurrentLifecycleRequest(
  state: JobLifecycleState,
  requestToken: number
): boolean {
  return state.phase === "saving" && state.requestToken === requestToken;
}

/**
 * Reconciles a successful source result into the last successful collection
 * without mutating it. Any non-success state, including failure, returns the
 * original collection unchanged.
 */
export function reconcileJobCollectionAfterLifecycleResult(
  lastSuccessfulJobs: readonly RecruiterJob[],
  state: JobLifecycleState
): readonly RecruiterJob[] {
  if (state.phase !== "success") {
    return lastSuccessfulJobs;
  }

  const sourceIndex = lastSuccessfulJobs.findIndex((job) => job.id === state.sourceJob.id);

  if (sourceIndex < 0) {
    return lastSuccessfulJobs;
  }

  return Object.freeze([
    ...lastSuccessfulJobs.slice(0, sourceIndex),
    state.sourceJob,
    ...lastSuccessfulJobs.slice(sourceIndex + 1),
  ]);
}

function createJobLifecycleStateWithSource(
  sourceJob: RecruiterJob,
  requestToken: number
): JobLifecycleState {
  return {
    phase: "idle",
    sourceJob,
    action: null,
    confirmation: null,
    request: null,
    errorMessage: null,
    unavailabilityMessage: null,
    requestToken,
  };
}

function resolveLifecycleFailure(
  state: JobLifecycleState,
  message: string
): JobLifecycleState {
  return {
    phase: "error",
    sourceJob: state.sourceJob,
    action: state.action,
    confirmation: null,
    request: null,
    errorMessage: message,
    unavailabilityMessage: null,
    requestToken: state.requestToken,
  };
}

function isReturnedJobForSourceState(
  value: unknown,
  expectedJobId: string
): value is RecruiterJob {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.id === expectedJobId &&
    typeof value.status === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.location === "string" &&
    typeof value.salary === "string" &&
    typeof value.requirements === "string"
  );
}

function getConfirmationJobTitle(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : "Job title unavailable";
}

function getJobLifecycleActionLabel(
  action: Exclude<JobLifecycleAction, "DELETE">
): string {
  switch (action) {
    case "PUBLISH":
      return "Publish";
    case "SAVE_AS_DRAFT":
      return "Save as Draft";
    case "ARCHIVE":
      return "Archive";
    case "REOPEN":
      return "Reopen Job";
    default:
      return assertNever(action);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNever(value: never): never {
  throw new TypeError(`Unsupported job lifecycle action: ${String(value)}`);
}
