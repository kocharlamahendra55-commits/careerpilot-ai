"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { markJobApplied } from "./applied-store";
import {
  normalizeJobDetailResponse,
  type PublishedJobDetail,
} from "./job-detail-types";

export type JobDetailPhase = "idle" | "loading" | "error" | "success";

const JOBS_PATH = "/api/jobs";

const GENERIC_ERROR_MESSAGE = "Unable to load this job right now. Please try again.";
const SESSION_ERROR_MESSAGE = "Your session has expired. Please sign in again to view this job.";

interface JobDetailState {
  readonly phase: JobDetailPhase;
  readonly job: PublishedJobDetail | null;
  readonly hasApplied: boolean;
  /** True when the job is missing/not published (404) or the session expired (401). */
  readonly notFound: boolean;
  readonly errorMessage: string | null;
}

export interface JobDetailResource extends JobDetailState {
  /** Re-fetches the job with a fresh request token. */
  readonly reload: () => void;
  /**
   * Locally flips `hasApplied` to true after a successful apply and records the
   * job in the session applied-store so the browse "Applied" badge updates
   * without a page reload. Safe to call more than once.
   */
  readonly markApplied: () => void;
}

const INITIAL_STATE: JobDetailState = {
  phase: "idle",
  job: null,
  hasApplied: false,
  notFound: false,
  errorMessage: null,
};

/**
 * Loads a single published job from `GET /api/jobs/{id}` for the detail/apply
 * page. A monotonically increasing request token guards every completion, so a
 * slow or superseded response (or a StrictMode double-invoke) can never
 * overwrite a newer result.
 *
 * Failure mapping:
 * - 404 → `notFound` (job missing or not published) with the not-found UI.
 * - 401 → `notFound` with a session-expired message (the app is auth-gated).
 * - network / 5xx / malformed body → `phase: "error"` with a retryable message.
 */
export function useJobDetail(jobId: string): JobDetailResource {
  const normalizedId = typeof jobId === "string" ? jobId.trim() : "";

  const [state, setState] = useState<JobDetailState>(INITIAL_STATE);
  const [reloadNonce, setReloadNonce] = useState(0);
  const tokenRef = useRef(0);

  const reload = useCallback(() => {
    setReloadNonce((nonce) => nonce + 1);
  }, []);

  const markApplied = useCallback(() => {
    if (normalizedId.length > 0) {
      markJobApplied(normalizedId);
    }
    setState((prev) => (prev.hasApplied ? prev : { ...prev, hasApplied: true }));
  }, [normalizedId]);

  useEffect(() => {
    const requestToken = tokenRef.current + 1;
    tokenRef.current = requestToken;
    const isCurrent = () => tokenRef.current === requestToken;

    // A missing route id can never resolve to a real job — treat as not-found
    // without issuing a request.
    if (normalizedId.length === 0) {
      setState({
        phase: "error",
        job: null,
        hasApplied: false,
        notFound: true,
        errorMessage: null,
      });
      return;
    }

    setState((prev) => ({
      phase: "loading",
      job: prev.job,
      hasApplied: prev.hasApplied,
      notFound: false,
      errorMessage: null,
    }));

    void (async () => {
      try {
        const response = await fetch(`${JOBS_PATH}/${encodeURIComponent(normalizedId)}`);
        if (!isCurrent()) {
          return;
        }

        if (response.status === 404 || response.status === 401) {
          setState({
            phase: "error",
            job: null,
            hasApplied: false,
            notFound: true,
            errorMessage: response.status === 401 ? SESSION_ERROR_MESSAGE : null,
          });
          return;
        }

        const body = await readJsonSafely(response);
        if (!isCurrent()) {
          return;
        }

        if (!response.ok) {
          setState({
            phase: "error",
            job: null,
            hasApplied: false,
            notFound: false,
            errorMessage: GENERIC_ERROR_MESSAGE,
          });
          return;
        }

        const normalized = normalizeJobDetailResponse(body);
        if (normalized === null) {
          setState({
            phase: "error",
            job: null,
            hasApplied: false,
            notFound: false,
            errorMessage: GENERIC_ERROR_MESSAGE,
          });
          return;
        }

        setState({
          phase: "success",
          job: normalized.job,
          hasApplied: normalized.hasApplied,
          notFound: false,
          errorMessage: null,
        });
      } catch {
        if (!isCurrent()) {
          return;
        }
        setState({
          phase: "error",
          job: null,
          hasApplied: false,
          notFound: false,
          errorMessage: GENERIC_ERROR_MESSAGE,
        });
      }
    })();

    return () => {
      // Advance the token so this request's in-flight completion is ignored.
      tokenRef.current = tokenRef.current + 1;
    };
  }, [normalizedId, reloadNonce]);

  return {
    phase: state.phase,
    job: state.job,
    hasApplied: state.hasApplied,
    notFound: state.notFound,
    errorMessage: state.errorMessage,
    reload,
    markApplied,
  };
}

async function readJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
