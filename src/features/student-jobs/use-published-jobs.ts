"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizePublishedJobList, type PublishedJobListItem } from "./types";

export type PublishedJobsPhase = "idle" | "loading" | "refreshing" | "success" | "error";

const PUBLISHED_JOBS_PATH = "/api/jobs";
const DEFAULT_SEARCH_DEBOUNCE_MS = 350;

const GENERIC_ERROR_MESSAGE = "Unable to load jobs right now. Please try again.";
const SESSION_ERROR_MESSAGE = "Your session has expired. Please sign in again to browse jobs.";

interface PublishedJobsState {
  readonly phase: PublishedJobsPhase;
  readonly jobs: readonly PublishedJobListItem[] | null;
  readonly errorMessage: string | null;
}

export interface PublishedJobsResource {
  readonly phase: PublishedJobsPhase;
  /** The most recent successful list, retained across refreshes and errors. */
  readonly jobs: readonly PublishedJobListItem[] | null;
  readonly errorMessage: string | null;
  /** Re-runs the current (debounced) search immediately with a fresh token. */
  readonly reload: () => void;
}

export interface UsePublishedJobsOptions {
  readonly debounceMs?: number;
}

/**
 * Fetches published jobs from `GET /api/jobs`, applying the `search` term as the
 * server-side query after a short debounce. Typing stays responsive because the
 * caller owns the controlled input value; only the network request is debounced.
 *
 * A monotonically increasing request token guards every completion, so a slow
 * response for a stale search (or a StrictMode double-invoke) can never overwrite
 * a newer result. 401 and other failures resolve to a safe, user-facing message.
 */
export function usePublishedJobs(
  search = "",
  options: UsePublishedJobsOptions = {}
): PublishedJobsResource {
  const normalizedSearch = typeof search === "string" ? search.trim() : "";
  const debounceMs = normalizeDebounce(options.debounceMs);

  const [state, setState] = useState<PublishedJobsState>({
    phase: "idle",
    jobs: null,
    errorMessage: null,
  });

  // Token guards stale/aborted completions. lastJobsRef retains the last good
  // list so a refresh renders existing cards instead of a full loading state.
  const tokenRef = useRef(0);
  const lastJobsRef = useRef<readonly PublishedJobListItem[] | null>(null);

  const [debouncedSearch, setDebouncedSearch] = useState(normalizedSearch);
  const [reloadNonce, setReloadNonce] = useState(0);
  const isFirstDebounce = useRef(true);

  // Debounce search changes only: the initial load and explicit reloads are
  // applied immediately so the first paint and retries never wait.
  useEffect(() => {
    if (isFirstDebounce.current) {
      isFirstDebounce.current = false;
      setDebouncedSearch(normalizedSearch);
      return;
    }

    const timer = setTimeout(() => setDebouncedSearch(normalizedSearch), debounceMs);
    return () => clearTimeout(timer);
  }, [normalizedSearch, debounceMs]);

  const reload = useCallback(() => {
    setReloadNonce((nonce) => nonce + 1);
  }, []);

  useEffect(() => {
    const requestToken = tokenRef.current + 1;
    tokenRef.current = requestToken;

    const hasPrevious = lastJobsRef.current !== null;
    setState({
      phase: hasPrevious ? "refreshing" : "loading",
      jobs: lastJobsRef.current,
      errorMessage: null,
    });

    const isCurrent = () => tokenRef.current === requestToken;

    void (async () => {
      try {
        const response = await fetch(buildJobsUrl(debouncedSearch));
        if (!isCurrent()) {
          return;
        }

        const body = await readJsonSafely(response);
        if (!isCurrent()) {
          return;
        }

        if (!response.ok) {
          setState({
            phase: "error",
            jobs: lastJobsRef.current,
            errorMessage:
              response.status === 401 ? SESSION_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE,
          });
          return;
        }

        const jobs = normalizePublishedJobList(body);
        if (jobs === null) {
          setState({
            phase: "error",
            jobs: lastJobsRef.current,
            errorMessage: GENERIC_ERROR_MESSAGE,
          });
          return;
        }

        lastJobsRef.current = jobs;
        setState({ phase: "success", jobs, errorMessage: null });
      } catch {
        if (!isCurrent()) {
          return;
        }
        setState({
          phase: "error",
          jobs: lastJobsRef.current,
          errorMessage: GENERIC_ERROR_MESSAGE,
        });
      }
    })();

    return () => {
      // Advance the token so this request's in-flight completion is ignored.
      tokenRef.current = tokenRef.current + 1;
    };
  }, [debouncedSearch, reloadNonce]);

  return {
    phase: state.phase,
    jobs: state.jobs,
    errorMessage: state.errorMessage,
    reload,
  };
}

function buildJobsUrl(search: string): string {
  const trimmed = search.trim();
  if (trimmed.length === 0) {
    return PUBLISHED_JOBS_PATH;
  }
  return `${PUBLISHED_JOBS_PATH}?search=${encodeURIComponent(trimmed)}`;
}

async function readJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeDebounce(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return DEFAULT_SEARCH_DEBOUNCE_MS;
  }
  return Math.floor(value);
}
