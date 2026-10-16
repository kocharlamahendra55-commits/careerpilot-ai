import {
  cloneWorkspaceRequestIntent,
  isWorkspaceRequestIntent,
  type WorkspaceRequestIntent,
} from "./request-intents";

/**
 * An immutable copy of a request that was accepted by the allowlisted boundary.
 * Replaying it creates a new copy, preventing user edits from changing retry
 * values after a failure.
 */
export interface RetrySnapshot {
  readonly request: WorkspaceRequestIntent;
}

export function createRetrySnapshot(
  request: WorkspaceRequestIntent
): RetrySnapshot {
  return Object.freeze({
    request: cloneWorkspaceRequestIntent(request),
  });
}

/** Returns one fresh request with exactly the accepted snapshot values. */
export function createRetryRequest(snapshot: RetrySnapshot): WorkspaceRequestIntent {
  if (!isRetrySnapshot(snapshot)) {
    throw new TypeError("Invalid recruiter workspace retry snapshot.");
  }

  return cloneWorkspaceRequestIntent(snapshot.request);
}

export function isRetrySnapshot(value: unknown): value is RetrySnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    Object.keys(record).length === 1 &&
    Object.prototype.hasOwnProperty.call(record, "request") &&
    isWorkspaceRequestIntent(record.request)
  );
}
