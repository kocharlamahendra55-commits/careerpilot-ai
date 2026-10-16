import {
  copyJobFormState,
  getSupportedJobFormChanges,
  parseRequiredSkills,
  serializeSupportedJobWrite,
  validateJobForm,
  type JobFormState,
} from "./job-form";
import { getRecruiterJobFromResponse } from "./job-response";
import {
  copySupportedJobWrite,
  createJobUpdateRequestIntent,
  type JobUpdateRequestIntent,
} from "./request-intents";
import {
  createMutationErrorState,
  createMutationState,
  createSavedMutationState,
  createSavingMutationState,
  type MutationState,
} from "./resource-state";
import {
  isJobLifecycleStatus,
  type JobLifecycleStatus,
  type SupportedJobWrite,
  type SupportedJobWriteField,
} from "./types";

export type DraftAutoSaveIneligibilityReason =
  | "not-persisted"
  | "not-draft"
  | "title-required"
  | "no-supported-change";

export interface DraftAutoSaveAvailability {
  readonly eligible: boolean;
  readonly reason: Exclude<DraftAutoSaveIneligibilityReason, "no-supported-change"> | null;
}

export interface DraftAutoSaveEligibility {
  readonly eligible: boolean;
  readonly reason: DraftAutoSaveIneligibilityReason | null;
  readonly changedFields: readonly SupportedJobWriteField[];
}

interface QueuedDraftAutoSave {
  readonly payload: Readonly<SupportedJobWrite>;
  readonly supportedRevision: number;
}

export interface DraftAutoSaveInFlight extends QueuedDraftAutoSave {
  readonly requestToken: number;
  readonly request: JobUpdateRequestIntent;
}

/**
 * Form and persistence state for a single job editor. `form` always carries
 * every current field, including local-only values; snapshots carry only the
 * six supported fields that may reach a PUT request.
 */
export interface DraftAutoSaveState {
  readonly form: JobFormState;
  readonly persistedJobId: string | null;
  /** Last source-backed status, not a guessed status from a future mutation. */
  readonly sourceStatus: JobLifecycleStatus | null;
  readonly savedSupported: Readonly<SupportedJobWrite> | null;
  readonly queued: QueuedDraftAutoSave | null;
  readonly inFlight: DraftAutoSaveInFlight | null;
  readonly feedback: MutationState;
  readonly supportedRevision: number;
  readonly nextRequestToken: number;
}

export interface CreateDraftAutoSaveStateOptions {
  readonly form: JobFormState;
  readonly persistedJobId?: string | null;
  readonly sourceStatus?: JobLifecycleStatus | null;
  readonly savedSupported?: SupportedJobWrite | null;
}

export type DraftAutoSaveAction =
  | { readonly type: "form-changed"; readonly form: JobFormState }
  | { readonly type: "start-queued" }
  | { readonly type: "clear-queued" }
  | {
      readonly type: "request-succeeded";
      readonly requestToken: number;
      /** A 2xx auto-save response must use the documented `{ job }` envelope. */
      readonly returnedJob: unknown;
    }
  | {
      readonly type: "request-failed";
      readonly requestToken: number;
      readonly error: unknown;
      readonly fallbackMessage?: string;
    }
  | { readonly type: "retry" }
  | { readonly type: "clear-feedback" };

export interface DraftAutoSaveStartResult {
  readonly state: DraftAutoSaveState;
  /** Null means no eligible queued auto-save was started. */
  readonly request: JobUpdateRequestIntent | null;
}

/** Creates state for a new or persisted job form without scheduling a write. */
export function createDraftAutoSaveState(
  options: CreateDraftAutoSaveStateOptions
): DraftAutoSaveState {
  const form = copyJobFormState(options.form);
  const persistedJobId = normalizePersistedJobId(options.persistedJobId);
  const serializable = serializeSupportedJobWrite(form);
  const suppliedSaved = options.savedSupported
    ? copySupportedJobWrite(options.savedSupported)
    : null;
  const sourceStatus = persistedJobId
    ? isJobLifecycleStatus(options.sourceStatus)
      ? options.sourceStatus
      : form.status
    : null;

  return Object.freeze({
    form,
    persistedJobId,
    sourceStatus,
    savedSupported:
      persistedJobId === null
        ? null
        : suppliedSaved ?? (serializable.kind === "ready" ? serializable.payload : null),
    queued: null,
    inFlight: null,
    feedback: createMutationState(),
    supportedRevision: 0,
    nextRequestToken: 0,
  });
}

/**
 * Auto-save is available only for a persisted source-backed DRAFT with a valid
 * current DRAFT form title. It intentionally does not decide whether a field
 * changed; use getDraftAutoSaveEligibility for that additional condition.
 */
export function getDraftAutoSaveAvailability(
  state: Pick<DraftAutoSaveState, "form" | "persistedJobId" | "sourceStatus">
): DraftAutoSaveAvailability {
  if (!normalizePersistedJobId(state.persistedJobId)) {
    return Object.freeze({ eligible: false, reason: "not-persisted" as const });
  }

  if (state.sourceStatus !== "DRAFT" || state.form.status !== "DRAFT") {
    return Object.freeze({ eligible: false, reason: "not-draft" as const });
  }

  if (!validateJobForm(state.form).trimmedTitle) {
    return Object.freeze({ eligible: false, reason: "title-required" as const });
  }

  return Object.freeze({ eligible: true, reason: null });
}

/**
 * Includes the supported-field-change condition required to schedule draft
 * auto-save. Local-only-only edits leave `changedFields` empty and are never
 * eligible for a PUT request.
 */
export function getDraftAutoSaveEligibility(
  state: Pick<DraftAutoSaveState, "persistedJobId" | "sourceStatus">,
  previousForm: JobFormState,
  nextForm: JobFormState
): DraftAutoSaveEligibility {
  const changedFields = getSupportedJobFormChanges(previousForm, nextForm);
  const availability = getDraftAutoSaveAvailability({
    persistedJobId: state.persistedJobId,
    sourceStatus: state.sourceStatus,
    form: nextForm,
  });

  if (!availability.eligible) {
    return Object.freeze({
      eligible: false,
      reason: availability.reason,
      changedFields,
    });
  }

  if (changedFields.length === 0) {
    return Object.freeze({
      eligible: false,
      reason: "no-supported-change" as const,
      changedFields,
    });
  }

  return Object.freeze({ eligible: true, reason: null, changedFields });
}

/** Central pure reducer for form changes and auto-save request outcomes. */
export function reduceDraftAutoSaveState(
  state: DraftAutoSaveState,
  action: DraftAutoSaveAction
): DraftAutoSaveState {
  switch (action.type) {
    case "form-changed":
      return reduceFormChanged(state, action.form);
    case "start-queued":
      return reduceStartQueued(state);
    case "clear-queued":
      return state.queued === null ? state : Object.freeze({ ...state, queued: null });
    case "request-succeeded":
      return reduceRequestSucceeded(state, action.requestToken, action.returnedJob);
    case "request-failed":
      return reduceRequestFailed(
        state,
        action.requestToken,
        action.error,
        action.fallbackMessage
      );
    case "retry":
      return reduceRetry(state);
    case "clear-feedback":
      return Object.freeze({ ...state, feedback: createMutationState() });
    default:
      return assertNever(action);
  }
}

/**
 * Starts at most one queued PUT. Calling this while one is pending returns no
 * request, preventing concurrent writes and stale response races.
 */
export function startQueuedDraftAutoSave(
  state: DraftAutoSaveState
): DraftAutoSaveStartResult {
  if (state.inFlight !== null) {
    return Object.freeze({ state, request: null });
  }

  const nextState = reduceDraftAutoSaveState(state, { type: "start-queued" });
  return Object.freeze({
    state: nextState,
    request: nextState.inFlight?.request ?? null,
  });
}

export function resolveDraftAutoSaveSuccess(
  state: DraftAutoSaveState,
  requestToken: number,
  returnedJob: unknown
): DraftAutoSaveState {
  return reduceDraftAutoSaveState(state, {
    type: "request-succeeded",
    requestToken,
    returnedJob,
  });
}

export function resolveDraftAutoSaveFailure(
  state: DraftAutoSaveState,
  requestToken: number,
  error: unknown,
  fallbackMessage = "Unable to auto-save draft."
): DraftAutoSaveState {
  return reduceDraftAutoSaveState(state, {
    type: "request-failed",
    requestToken,
    error,
    fallbackMessage,
  });
}

/**
 * Exposes source-returned fields only. It accepts either an API job response or
 * the nested `job` object and ignores arbitrary/unrecognized data.
 */
export function extractReturnedSupportedJobFields(
  returnedJob: unknown
): Readonly<Partial<SupportedJobWrite>> {
  const candidate = unwrapReturnedJob(returnedJob);
  if (!candidate) {
    return Object.freeze({});
  }

  const returned: Partial<SupportedJobWrite> = {};

  if (typeof candidate.title === "string") returned.title = candidate.title;
  if (typeof candidate.description === "string") {
    returned.description = candidate.description;
  }
  if (typeof candidate.location === "string") returned.location = candidate.location;
  if (typeof candidate.salary === "string") returned.salary = candidate.salary;
  if (typeof candidate.requirements === "string") {
    returned.requirements = candidate.requirements;
  }
  if (isJobLifecycleStatus(candidate.status)) returned.status = candidate.status;

  return Object.freeze(returned);
}

function reduceFormChanged(
  state: DraftAutoSaveState,
  nextFormInput: JobFormState
): DraftAutoSaveState {
  const nextForm = copyJobFormState(nextFormInput);
  const changedFields = getSupportedJobFormChanges(state.form, nextForm);
  const nextSupportedRevision =
    changedFields.length > 0 ? state.supportedRevision + 1 : state.supportedRevision;
  const baseState = {
    ...state,
    form: nextForm,
    supportedRevision: nextSupportedRevision,
  };

  if (changedFields.length === 0) {
    return Object.freeze(baseState);
  }

  const eligibility = getDraftAutoSaveEligibility(state, state.form, nextForm);
  if (!eligibility.eligible) {
    return Object.freeze({
      ...baseState,
      // A later invalid/non-DRAFT supported edit must not allow an old snapshot
      // to be written after the current value became ineligible.
      queued: null,
      feedback: state.inFlight ? state.feedback : createMutationState(),
    });
  }

  const serialization = serializeSupportedJobWrite(nextForm);
  if (serialization.kind === "invalid") {
    // Defensive fallback: eligibility already checked title/status, but no
    // malformed runtime form can produce an auto-save request.
    return Object.freeze({
      ...baseState,
      queued: null,
      feedback: state.inFlight ? state.feedback : createMutationState(),
    });
  }

  return Object.freeze({
    ...baseState,
    queued: Object.freeze({
      payload: serialization.payload,
      supportedRevision: nextSupportedRevision,
    }),
    feedback: state.inFlight ? state.feedback : createMutationState(),
  });
}

function reduceStartQueued(state: DraftAutoSaveState): DraftAutoSaveState {
  if (state.inFlight !== null || state.queued === null) {
    return state;
  }

  const availability = getDraftAutoSaveAvailability(state);
  const serialization = serializeSupportedJobWrite(state.form);
  if (!availability.eligible || serialization.kind !== "ready" || !state.persistedJobId) {
    return Object.freeze({ ...state, queued: null });
  }

  const requestToken = state.nextRequestToken + 1;
  const payload = serialization.payload;
  const request = createJobUpdateRequestIntent(state.persistedJobId, payload);

  return Object.freeze({
    ...state,
    queued: null,
    inFlight: Object.freeze({
      payload,
      supportedRevision: state.queued.supportedRevision,
      requestToken,
      request,
    }),
    feedback: createSavingMutationState("Auto-saving draft"),
    nextRequestToken: requestToken,
  });
}

function reduceRequestSucceeded(
  state: DraftAutoSaveState,
  requestToken: number,
  returnedJob: unknown
): DraftAutoSaveState {
  const activeRequest = state.inFlight;
  if (!activeRequest || activeRequest.requestToken !== requestToken) {
    return state;
  }

  const returnedRecruiterJob = getRecruiterJobFromResponse(returnedJob);
  if (returnedRecruiterJob === null) {
    return reduceRequestFailed(
      state,
      requestToken,
      { error: "The job service returned an incomplete draft record." },
      "Unable to auto-save this draft."
    );
  }

  const returnedFields = extractReturnedSupportedJobFields({ job: returnedRecruiterJob });
  const savedSupported = mergeReturnedSupportedFields(
    activeRequest.payload,
    returnedFields
  );
  const responseMatchesCurrentSupportedForm =
    state.supportedRevision === activeRequest.supportedRevision;
  const form = responseMatchesCurrentSupportedForm
    ? applyReturnedSupportedFields(state.form, returnedFields)
    : state.form;
  const stateAfterResponse = {
    ...state,
    form,
    sourceStatus: savedSupported.status,
    savedSupported,
    inFlight: null,
  };
  const availability = getDraftAutoSaveAvailability(stateAfterResponse);

  return Object.freeze({
    ...stateAfterResponse,
    queued: availability.eligible ? state.queued : null,
    feedback: createSavedMutationState(
      "Auto-saved draft",
      getReturnedSupportedJobFieldNames(returnedFields)
    ),
  });
}

function reduceRequestFailed(
  state: DraftAutoSaveState,
  requestToken: number,
  error: unknown,
  fallbackMessage?: string
): DraftAutoSaveState {
  const activeRequest = state.inFlight;
  if (!activeRequest || activeRequest.requestToken !== requestToken) {
    return state;
  }

  // Deliberately preserve `form`, `queued`, and `savedSupported`. The recruiter
  // can see every current value after an error and retry with a fresh snapshot.
  return Object.freeze({
    ...state,
    inFlight: null,
    feedback: createMutationErrorState(
      "Auto-saving draft",
      error,
      fallbackMessage ?? "Unable to auto-save draft."
    ),
  });
}

function reduceRetry(state: DraftAutoSaveState): DraftAutoSaveState {
  if (state.inFlight !== null) {
    return state;
  }

  const availability = getDraftAutoSaveAvailability(state);
  const serialization = serializeSupportedJobWrite(state.form);
  if (!availability.eligible || serialization.kind !== "ready") {
    return state;
  }

  return Object.freeze({
    ...state,
    queued: Object.freeze({
      payload: serialization.payload,
      supportedRevision: state.supportedRevision,
    }),
    feedback: createMutationState(),
  });
}

function mergeReturnedSupportedFields(
  base: Readonly<SupportedJobWrite>,
  returned: Readonly<Partial<SupportedJobWrite>>
): Readonly<SupportedJobWrite> {
  return copySupportedJobWrite({
    title: returned.title ?? base.title,
    description: returned.description ?? base.description,
    location: returned.location ?? base.location,
    salary: returned.salary ?? base.salary,
    requirements: returned.requirements ?? base.requirements,
    status: returned.status ?? base.status,
  });
}

/** Merges returned source fields while preserving Company and every local-only value. */
function applyReturnedSupportedFields(
  form: JobFormState,
  returned: Readonly<Partial<SupportedJobWrite>>
): JobFormState {
  return copyJobFormState({
    title: returned.title ?? form.title,
    companyDisplay: form.companyDisplay,
    location: returned.location ?? form.location,
    employmentType: form.employmentType,
    experience: form.experience,
    salary: returned.salary ?? form.salary,
    requiredSkills:
      returned.requirements === undefined
        ? form.requiredSkills
        : parseRequiredSkills(returned.requirements),
    description: returned.description ?? form.description,
    benefits: form.benefits,
    workArrangement: form.workArrangement,
    status: returned.status ?? form.status,
  });
}

function getReturnedSupportedJobFieldNames(
  returned: Readonly<Partial<SupportedJobWrite>>
): readonly SupportedJobWriteField[] {
  const fields: SupportedJobWriteField[] = [];

  if (returned.title !== undefined) fields.push("title");
  if (returned.description !== undefined) fields.push("description");
  if (returned.location !== undefined) fields.push("location");
  if (returned.salary !== undefined) fields.push("salary");
  if (returned.requirements !== undefined) fields.push("requirements");
  if (returned.status !== undefined) fields.push("status");

  return Object.freeze(fields);
}

function normalizePersistedJobId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function unwrapReturnedJob(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }

  return isRecord(value.job) ? value.job : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNever(value: never): never {
  throw new TypeError(`Unsupported draft auto-save action: ${String(value)}`);
}
