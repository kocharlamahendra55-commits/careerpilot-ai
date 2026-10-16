/**
 * Client helper for submitting a job application to `POST /api/applications`.
 *
 * The server owns all authoritative checks (ownership, "already applied",
 * job-open, resume-analyzed). This helper only translates the HTTP outcome into
 * a small discriminated result the apply UI can branch on, and it reuses the
 * server's `{ error }` message when it is safe to display.
 */

const APPLICATIONS_PATH = "/api/applications";

/** Longest server-provided error message we are willing to surface verbatim. */
const MAX_SERVER_MESSAGE_LENGTH = 200;

export type ApplyFailureReason =
  | "not-analyzed"
  | "forbidden"
  | "not-open"
  | "invalid"
  | "error";

/**
 * The outcome of an apply attempt:
 * - `{ ok: true }` — application created (HTTP 201).
 * - `{ ok: false, alreadyApplied: true }` — a prior application exists (HTTP 409).
 *   Treated as success by the UI (idempotent from the student's perspective).
 * - `{ ok: false, reason, message }` — a displayable failure (400/403/404/other).
 */
export type ApplyResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly alreadyApplied: true }
  | {
      readonly ok: false;
      readonly alreadyApplied?: false;
      readonly reason: ApplyFailureReason;
      readonly message: string;
    };

const FALLBACK_MESSAGES: Record<ApplyFailureReason, string> = {
  "not-analyzed": "Please analyze your resume before applying.",
  forbidden: "You can only apply with your own analyzed resume.",
  "not-open": "This job is no longer open for applications.",
  invalid: "We couldn't submit your application. Please check your details and try again.",
  error: "Something went wrong submitting your application. Please try again.",
};

/**
 * Submits an application for `jobId` using `resumeId`. Never throws: network and
 * parsing failures resolve to `{ ok: false, reason: "error" }`.
 */
export async function submitApplication(jobId: string, resumeId: string): Promise<ApplyResult> {
  const normalizedJobId = typeof jobId === "string" ? jobId.trim() : "";
  const normalizedResumeId = typeof resumeId === "string" ? resumeId.trim() : "";

  if (normalizedJobId.length === 0 || normalizedResumeId.length === 0) {
    return { ok: false, reason: "invalid", message: FALLBACK_MESSAGES.invalid };
  }

  let response: Response;
  try {
    response = await fetch(APPLICATIONS_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: normalizedJobId, resumeId: normalizedResumeId }),
    });
  } catch {
    return { ok: false, reason: "error", message: FALLBACK_MESSAGES.error };
  }

  if (response.ok) {
    return { ok: true };
  }

  if (response.status === 409) {
    return { ok: false, alreadyApplied: true };
  }

  const serverMessage = await readServerErrorMessage(response);
  const reason = resolveReason(response.status, serverMessage);
  return { ok: false, reason, message: pickMessage(reason, serverMessage) };
}

/**
 * Maps an HTTP status to a failure reason. A 400 is ambiguous — the server uses
 * it both for missing fields and for "resume not analyzed" — so the reason is
 * refined from the message when it mentions analysis.
 */
function resolveReason(status: number, serverMessage: string | null): ApplyFailureReason {
  switch (status) {
    case 400:
      return serverMessage !== null && /analyz/i.test(serverMessage) ? "not-analyzed" : "invalid";
    case 403:
      return "forbidden";
    case 404:
      return "not-open";
    default:
      return "error";
  }
}

/** Prefers a safe server message, falling back to the reason's default copy. */
function pickMessage(reason: ApplyFailureReason, serverMessage: string | null): string {
  return serverMessage ?? FALLBACK_MESSAGES[reason];
}

/**
 * Reads `{ error }` from the response body, returning it only when it is a
 * non-empty, reasonably short string; otherwise `null` so a bounded fallback is
 * used. Never throws.
 */
async function readServerErrorMessage(response: Response): Promise<string | null> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return null;
  }

  if (typeof body !== "object" || body === null) {
    return null;
  }

  const error = (body as Record<string, unknown>).error;
  if (typeof error !== "string") {
    return null;
  }

  const trimmed = error.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_SERVER_MESSAGE_LENGTH) {
    return null;
  }

  return trimmed;
}
