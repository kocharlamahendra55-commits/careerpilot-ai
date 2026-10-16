import { readWorkspaceJsonSafely } from "./job-response";
import {
  createApplicationStatusUpdateRequestIntent,
  serializeWorkspaceRequest,
  type ApplicationStatusTarget,
} from "./request-intents";
import { extractSafeErrorMessage } from "./resource-state";

/**
 * The five recruiter application status actions and the single source of truth
 * for the `ApplicationStatusAction` union used across the recruiter workspace.
 * These identifiers name the intended hiring transitions only; the
 * action-to-target map below is the one place that binds them to a persisted
 * status value.
 */
export const APPLICATION_STATUS_ACTIONS = Object.freeze([
  "SHORTLIST",
  "REJECT",
  "MOVE_TO_INTERVIEW",
  "OFFER",
  "HIRE",
] as const);

export type ApplicationStatusAction = (typeof APPLICATION_STATUS_ACTIONS)[number];

/**
 * Exact action -> persisted target status map. This is the single source of
 * truth for which status each action requests and must stay aligned with the
 * server's five recruiter-settable statuses.
 */
export const APPLICATION_STATUS_ACTION_TARGET: Readonly<
  Record<ApplicationStatusAction, ApplicationStatusTarget>
> = Object.freeze({
  SHORTLIST: "SHORTLISTED",
  MOVE_TO_INTERVIEW: "INTERVIEW",
  OFFER: "OFFERED",
  HIRE: "HIRED",
  REJECT: "REJECTED",
});

/**
 * Client-side valid-transition map, identical to the server's authoritative
 * policy. It only ever prevents the UI from offering a transition the server
 * would reject; the server remains the final authority. HIRED and REJECTED are
 * terminal.
 */
export const APPLICATION_STATUS_TRANSITIONS: Readonly<
  Record<string, readonly ApplicationStatusTarget[]>
> = Object.freeze({
  APPLIED: Object.freeze(["SHORTLISTED", "REJECTED"] as const),
  SHORTLISTED: Object.freeze(["INTERVIEW", "REJECTED"] as const),
  INTERVIEW: Object.freeze(["OFFERED", "REJECTED"] as const),
  OFFERED: Object.freeze(["HIRED", "REJECTED"] as const),
  HIRED: Object.freeze([] as const),
  REJECTED: Object.freeze([] as const),
});

export const APPLICATION_STATUS_UPDATE_FAILURE_MESSAGE =
  "Unable to update the application status.";

export const APPLICATION_STATUS_NETWORK_FAILURE_MESSAGE =
  "Unable to update the application status. Check your connection and try again.";

/** Normalizes an arbitrary source status string for transition lookups. */
function normalizeStatus(status: string): string {
  return status.trim().toUpperCase();
}

/** Returns the persisted target status a given action requests. */
export function getActionTargetStatus(
  action: ApplicationStatusAction
): ApplicationStatusTarget {
  return APPLICATION_STATUS_ACTION_TARGET[action];
}

/** Lists the target statuses reachable from the current status (empty if none). */
export function getValidTargetsForStatus(
  currentStatus: string
): readonly ApplicationStatusTarget[] {
  return APPLICATION_STATUS_TRANSITIONS[normalizeStatus(currentStatus)] ?? [];
}

/** True when the current status is a known status with no outgoing transitions. */
export function isTerminalStatus(currentStatus: string): boolean {
  const transitions = APPLICATION_STATUS_TRANSITIONS[normalizeStatus(currentStatus)];
  return transitions !== undefined && transitions.length === 0;
}

/** True only when the action is a server-valid transition from the current status. */
export function isActionValidForStatus(
  currentStatus: string,
  action: ApplicationStatusAction
): boolean {
  return getValidTargetsForStatus(currentStatus).includes(
    getActionTargetStatus(action)
  );
}

/**
 * The actions the recruiter may take from the current status, in canonical
 * order. Case is normalized, and only actions whose target status is allowed
 * from the current status are returned.
 */
export function getValidActionsForStatus(
  currentStatus: string
): ApplicationStatusAction[] {
  return APPLICATION_STATUS_ACTIONS.filter((action) =>
    isActionValidForStatus(currentStatus, action)
  );
}

/**
 * A short, neutral, human-readable reason an action is unavailable, or null when
 * the action is a valid transition. Reasons never reference a retired
 * integration gate.
 */
export function getStatusActionUnavailableReason(
  currentStatus: string,
  action: ApplicationStatusAction
): string | null {
  const normalized = normalizeStatus(currentStatus);

  if (normalized.length === 0) {
    return "Current status is unavailable.";
  }

  if (APPLICATION_STATUS_TRANSITIONS[normalized] === undefined) {
    return "Not available from the current status.";
  }

  if (isTerminalStatus(normalized)) {
    return `No further changes are allowed from ${normalized}.`;
  }

  if (!isActionValidForStatus(currentStatus, action)) {
    return "Not available from the current status.";
  }

  return null;
}

/** Reads the returned source status from `{ application: { status } }`. */
function readReturnedStatus(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const application = (body as { application?: unknown }).application;
  if (typeof application !== "object" || application === null) {
    return null;
  }

  const status = (application as { status?: unknown }).status;
  return typeof status === "string" && status.trim().length > 0 ? status : null;
}

/**
 * Performs the single approved status `PATCH` for one application via the shared
 * request boundary and parses `{ application: { status } }`.
 *
 * On success it returns the new source-backed status. On any failure (network
 * error, a non-ok response, or a malformed body) it throws an `Error` carrying a
 * bounded, safe message suitable for display in an accessible alert. The
 * `| never` in the return type documents that the failure path never resolves.
 */
export async function performApplicationStatusUpdate(
  applicationId: string,
  action: ApplicationStatusAction
): Promise<{ status: string } | never> {
  const intent = createApplicationStatusUpdateRequestIntent(applicationId, {
    status: getActionTargetStatus(action),
  });
  const request = serializeWorkspaceRequest(intent);

  let response: Response;
  try {
    response = await fetch(request.url, request.init);
  } catch {
    throw new Error(APPLICATION_STATUS_NETWORK_FAILURE_MESSAGE);
  }

  const body = await readWorkspaceJsonSafely(response);

  if (!response.ok) {
    throw new Error(
      extractSafeErrorMessage(body, APPLICATION_STATUS_UPDATE_FAILURE_MESSAGE)
    );
  }

  const returnedStatus = readReturnedStatus(body);
  if (returnedStatus === null) {
    throw new Error(APPLICATION_STATUS_UPDATE_FAILURE_MESSAGE);
  }

  return { status: returnedStatus };
}
