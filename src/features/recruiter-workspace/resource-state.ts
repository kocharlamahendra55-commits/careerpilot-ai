import {
  isSupportedJobWriteField,
  type SupportedJobWriteField,
} from "./types";

export type ResourcePhase = "idle" | "loading" | "refreshing" | "success" | "error";

/**
 * Shared remote-resource state. `requestToken` monotonically increases whenever
 * a request begins, allowing stale completions to be ignored safely.
 */
export interface ResourceState<TRequest, TData> {
  readonly phase: ResourcePhase;
  readonly request: TRequest | null;
  readonly lastSuccess: TData | null;
  readonly errorMessage: string | null;
  readonly requestToken: number;
}

export interface BeginResourceRequestOptions {
  /** Clear old source-backed data before loading, rather than showing refresh UI. */
  readonly preserveLastSuccess?: boolean;
}

export const DEFAULT_SAFE_ERROR_MESSAGE = "Unable to complete the request.";

const MAX_SAFE_ERROR_MESSAGE_LENGTH = 280;

export function createResourceState<TRequest, TData>(): ResourceState<TRequest, TData> {
  return {
    phase: "idle",
    request: null,
    lastSuccess: null,
    errorMessage: null,
    requestToken: 0,
  };
}

/**
 * Starts a new request and invalidates all older completions. A prior successful
 * source snapshot is retained by default for refresh-error recovery.
 */
export function beginResourceRequest<TRequest, TData>(
  state: ResourceState<TRequest, TData>,
  request: TRequest,
  options: BeginResourceRequestOptions = {}
): ResourceState<TRequest, TData> {
  const preserveLastSuccess = options.preserveLastSuccess ?? true;
  const retainedSuccess = preserveLastSuccess ? state.lastSuccess : null;

  return {
    phase: retainedSuccess === null ? "loading" : "refreshing",
    request,
    lastSuccess: retainedSuccess,
    errorMessage: null,
    requestToken: state.requestToken + 1,
  };
}

/** Applies a successful response only when it belongs to the latest request. */
export function resolveResourceSuccess<TRequest, TData>(
  state: ResourceState<TRequest, TData>,
  requestToken: number,
  data: TData
): ResourceState<TRequest, TData> {
  if (!isCurrentResourceRequest(state, requestToken)) {
    return state;
  }

  return {
    phase: "success",
    request: state.request,
    lastSuccess: data,
    errorMessage: null,
    requestToken: state.requestToken,
  };
}

/**
 * Applies a failure only when it belongs to the latest request. It deliberately
 * preserves any prior successful source-backed data for the caller to render
 * alongside an ErrorState.
 */
export function resolveResourceFailure<TRequest, TData>(
  state: ResourceState<TRequest, TData>,
  requestToken: number,
  errorResponse: unknown,
  fallbackMessage = DEFAULT_SAFE_ERROR_MESSAGE
): ResourceState<TRequest, TData> {
  if (!isCurrentResourceRequest(state, requestToken)) {
    return state;
  }

  return {
    phase: "error",
    request: state.request,
    lastSuccess: state.lastSuccess,
    errorMessage: extractSafeErrorMessage(errorResponse, fallbackMessage),
    requestToken: state.requestToken,
  };
}

/** Clears source data and advances the token so prior responses cannot reappear. */
export function clearResourceState<TRequest, TData>(
  state: ResourceState<TRequest, TData>
): ResourceState<TRequest, TData> {
  return {
    phase: "idle",
    request: null,
    lastSuccess: null,
    errorMessage: null,
    requestToken: state.requestToken + 1,
  };
}

export function isCurrentResourceRequest<TRequest, TData>(
  state: ResourceState<TRequest, TData>,
  requestToken: number
): boolean {
  return state.requestToken === requestToken;
}

/**
 * Reads only the documented `error` property from an untrusted API error body.
 * It removes control characters and bounds output; any absent/blank value uses
 * the caller's action-specific fallback instead.
 */
export function extractSafeErrorMessage(
  errorResponse: unknown,
  fallbackMessage = DEFAULT_SAFE_ERROR_MESSAGE
): string {
  const fallback = normalizeErrorMessage(fallbackMessage) || DEFAULT_SAFE_ERROR_MESSAGE;

  if (typeof errorResponse !== "object" || errorResponse === null) {
    return fallback;
  }

  const error = (errorResponse as Record<string, unknown>).error;

  if (typeof error !== "string") {
    return fallback;
  }

  return normalizeErrorMessage(error) || fallback;
}

export type MutationState =
  | { readonly phase: "idle" }
  | { readonly phase: "validating"; readonly message: string }
  | { readonly phase: "saving"; readonly action: string }
  | {
      readonly phase: "saved";
      readonly action: string;
      readonly returnedFields: readonly SupportedJobWriteField[];
    }
  | { readonly phase: "error"; readonly action: string; readonly message: string };

export function createMutationState(): MutationState {
  return { phase: "idle" };
}

export function createValidatingMutationState(message: string): MutationState {
  return { phase: "validating", message };
}

export function createSavingMutationState(action: string): MutationState {
  return { phase: "saving", action };
}

/**
 * Keeps save feedback constrained to source-returned supported job fields.
 * Unknown fields are omitted defensively rather than being claimed as saved.
 */
export function createSavedMutationState(
  action: string,
  returnedFields: readonly SupportedJobWriteField[]
): MutationState {
  const allowedFields = Array.from(
    new Set(returnedFields.filter(isSupportedJobWriteField))
  );

  return {
    phase: "saved",
    action,
    returnedFields: Object.freeze(allowedFields),
  };
}

export function createMutationErrorState(
  action: string,
  errorResponse: unknown,
  fallbackMessage = DEFAULT_SAFE_ERROR_MESSAGE
): MutationState {
  return {
    phase: "error",
    action,
    message: extractSafeErrorMessage(errorResponse, fallbackMessage),
  };
}

function normalizeErrorMessage(message: string): string {
  return message
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SAFE_ERROR_MESSAGE_LENGTH);
}
