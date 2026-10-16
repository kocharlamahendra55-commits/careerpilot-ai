import {
  projectCandidateProfile,
  type CandidateProfileProjection,
} from "./candidate-profile-projection";
import {
  createApplicationDetailRequestIntent,
  type ApplicationDetailRequestIntent,
} from "./request-intents";
import {
  beginResourceRequest,
  clearResourceState,
  createResourceState,
  isCurrentResourceRequest,
  resolveResourceFailure,
  resolveResourceSuccess,
  type ResourceState,
} from "./resource-state";

export const CANDIDATE_PROFILE_LOAD_FAILURE_MESSAGE =
  "Unable to load this candidate's profile.";

const CANDIDATE_PROFILE_MISSING_ID_MESSAGE = "No candidate was specified.";

const CANDIDATE_PROFILE_INCOMPLETE_MESSAGE =
  "The application service returned an incomplete candidate profile.";

const CANDIDATE_PROFILE_MISMATCH_MESSAGE =
  "The application service returned a different candidate record.";

/**
 * The reset-safe Candidate Profile resource, keyed to a requested application
 * ID via the shared `ResourceState`. Its `request` holds the accepted
 * application-detail intent and `requestToken` rejects stale completions.
 */
export type CandidateProfileResourceState = ResourceState<
  ApplicationDetailRequestIntent,
  CandidateProfileProjection
>;

/**
 * The outcome of starting a load. `request` is the fetch-ready detail intent to
 * fire, or null when no valid application ID was supplied (in which case
 * `state` is already a terminal error). `requestToken` correlates the eventual
 * completion so a superseded response is ignored.
 */
export interface CandidateProfileLoadStart {
  readonly state: CandidateProfileResourceState;
  readonly request: ApplicationDetailRequestIntent | null;
  readonly requestToken: number;
}

export function createCandidateProfileState(): CandidateProfileResourceState {
  return createResourceState<
    ApplicationDetailRequestIntent,
    CandidateProfileProjection
  >();
}

/**
 * Begins loading the requested application's profile. It always clears the
 * previous candidate's source values first (`preserveLastSuccess: false`) so a
 * subsequent 403/404/error for a new or inaccessible ID can never leave the
 * prior candidate's data visible. A blank ID yields a terminal error state with
 * no request rather than throwing.
 */
export function beginCandidateProfileLoad(
  state: CandidateProfileResourceState,
  applicationId: string
): CandidateProfileLoadStart {
  const normalizedApplicationId =
    typeof applicationId === "string" ? applicationId.trim() : "";

  if (normalizedApplicationId.length === 0) {
    const errorState: CandidateProfileResourceState = {
      phase: "error",
      request: null,
      lastSuccess: null,
      errorMessage: CANDIDATE_PROFILE_MISSING_ID_MESSAGE,
      requestToken: state.requestToken + 1,
    };

    return Object.freeze({
      state: errorState,
      request: null,
      requestToken: errorState.requestToken,
    });
  }

  const request = createApplicationDetailRequestIntent(normalizedApplicationId);
  const started = beginResourceRequest(state, request, {
    preserveLastSuccess: false,
  });

  return Object.freeze({
    state: started,
    request,
    requestToken: started.requestToken,
  });
}

/**
 * Applies a successful detail response only when it belongs to the latest
 * request. A malformed envelope or a response whose returned `application.id`
 * differs from the requested id is rejected as a failure, so another
 * candidate's record can never populate this profile.
 */
export function resolveCandidateProfileSuccess(
  state: CandidateProfileResourceState,
  requestToken: number,
  responseBody: unknown
): CandidateProfileResourceState {
  if (!isCurrentResourceRequest(state, requestToken)) {
    return state;
  }

  const projection = projectCandidateProfile(responseBody);
  if (projection === null) {
    return resolveResourceFailure(
      state,
      requestToken,
      { error: CANDIDATE_PROFILE_INCOMPLETE_MESSAGE },
      CANDIDATE_PROFILE_LOAD_FAILURE_MESSAGE
    );
  }

  const requestedApplicationId = state.request?.applicationId ?? null;
  if (
    requestedApplicationId === null ||
    projection.applicationId !== requestedApplicationId
  ) {
    return resolveResourceFailure(
      state,
      requestToken,
      { error: CANDIDATE_PROFILE_MISMATCH_MESSAGE },
      CANDIDATE_PROFILE_LOAD_FAILURE_MESSAGE
    );
  }

  return resolveResourceSuccess(state, requestToken, projection);
}

/**
 * Applies a failure only when it belongs to the latest request. Because a load
 * always begins by clearing prior data, an error state carries no previous
 * candidate's source values.
 */
export function resolveCandidateProfileFailure(
  state: CandidateProfileResourceState,
  requestToken: number,
  errorResponse: unknown,
  fallbackMessage: string = CANDIDATE_PROFILE_LOAD_FAILURE_MESSAGE
): CandidateProfileResourceState {
  return resolveResourceFailure(state, requestToken, errorResponse, fallbackMessage);
}

/** Clears source data and advances the token so prior responses cannot reappear. */
export function clearCandidateProfileState(
  state: CandidateProfileResourceState
): CandidateProfileResourceState {
  return clearResourceState(state);
}

export function isCurrentCandidateProfileRequest(
  state: CandidateProfileResourceState,
  requestToken: number
): boolean {
  return isCurrentResourceRequest(state, requestToken);
}
