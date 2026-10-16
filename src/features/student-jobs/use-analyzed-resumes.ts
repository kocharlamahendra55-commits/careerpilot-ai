"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AnalyzedResumesPhase = "idle" | "loading" | "error" | "success";

const RESUMES_PATH = "/api/resumes";

const GENERIC_ERROR_MESSAGE = "Unable to load your resumes right now. Please try again.";
const SESSION_ERROR_MESSAGE = "Your session has expired. Please sign in again to apply.";

/** The minimal, apply-ready projection of an ANALYZED resume. */
export interface AnalyzedResume {
  readonly id: string;
  readonly filename: string;
  /** ATS score when the analysis exposed one, otherwise null. */
  readonly atsScore: number | null;
  /** ISO timestamp string as serialized by the JSON route. */
  readonly createdAt: string;
}

interface AnalyzedResumesState {
  readonly phase: AnalyzedResumesPhase;
  readonly analyzedResumes: readonly AnalyzedResume[];
  readonly errorMessage: string | null;
}

export interface AnalyzedResumesResource extends AnalyzedResumesState {
  /** Re-fetches the resume list with a fresh request token. */
  readonly reload: () => void;
}

const INITIAL_STATE: AnalyzedResumesState = {
  phase: "idle",
  analyzedResumes: [],
  errorMessage: null,
};

/**
 * Loads the signed-in student's resumes from `GET /api/resumes` and exposes only
 * those eligible to apply — i.e. `status === "ANALYZED"` — most-recent first.
 *
 * A monotonic request token guards completions against races/StrictMode. A 401
 * surfaces a session message; other failures a generic retryable message. An
 * empty analyzed list is a normal `success` outcome (the apply UI prompts the
 * student to upload/analyze a resume).
 */
export function useAnalyzedResumes(): AnalyzedResumesResource {
  const [state, setState] = useState<AnalyzedResumesState>(INITIAL_STATE);
  const [reloadNonce, setReloadNonce] = useState(0);
  const tokenRef = useRef(0);

  const reload = useCallback(() => {
    setReloadNonce((nonce) => nonce + 1);
  }, []);

  useEffect(() => {
    const requestToken = tokenRef.current + 1;
    tokenRef.current = requestToken;
    const isCurrent = () => tokenRef.current === requestToken;

    setState((prev) => ({
      phase: "loading",
      analyzedResumes: prev.analyzedResumes,
      errorMessage: null,
    }));

    void (async () => {
      try {
        const response = await fetch(RESUMES_PATH);
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
            analyzedResumes: [],
            errorMessage: response.status === 401 ? SESSION_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE,
          });
          return;
        }

        const analyzedResumes = normalizeAnalyzedResumes(body);
        if (analyzedResumes === null) {
          setState({
            phase: "error",
            analyzedResumes: [],
            errorMessage: GENERIC_ERROR_MESSAGE,
          });
          return;
        }

        setState({ phase: "success", analyzedResumes, errorMessage: null });
      } catch {
        if (!isCurrent()) {
          return;
        }
        setState({ phase: "error", analyzedResumes: [], errorMessage: GENERIC_ERROR_MESSAGE });
      }
    })();

    return () => {
      // Advance the token so this request's in-flight completion is ignored.
      tokenRef.current = tokenRef.current + 1;
    };
  }, [reloadNonce]);

  return {
    phase: state.phase,
    analyzedResumes: state.analyzedResumes,
    errorMessage: state.errorMessage,
    reload,
  };
}

/**
 * Extracts the ANALYZED resumes from the untrusted `{ resumes }` payload,
 * de-duplicated by id and sorted most-recent first. Resumes with an unparseable
 * `createdAt` sort last. Returns `null` only when the envelope itself is not the
 * expected `{ resumes: [] }` shape.
 */
function normalizeAnalyzedResumes(value: unknown): readonly AnalyzedResume[] | null {
  if (!isRecord(value) || !Array.isArray(value.resumes)) {
    return null;
  }

  const items: { resume: AnalyzedResume; time: number | null }[] = [];
  const seen = new Set<string>();

  for (const raw of value.resumes) {
    if (!isRecord(raw) || raw.status !== "ANALYZED") {
      continue;
    }

    const id = readNonEmptyString(raw.id);
    if (id === null || seen.has(id)) {
      continue;
    }
    seen.add(id);

    const createdAt = readString(raw.createdAt);
    items.push({
      resume: Object.freeze({
        id,
        filename: readString(raw.filename) || "Untitled resume",
        atsScore: readAtsScore(raw.analysis),
        createdAt,
      }),
      time: parseTimestamp(createdAt),
    });
  }

  items.sort((left, right) => compareByTimeDesc(left.time, right.time));

  return Object.freeze(items.map((entry) => entry.resume));
}

function readAtsScore(analysis: unknown): number | null {
  if (!isRecord(analysis)) {
    return null;
  }
  const score = analysis.atsScore;
  return typeof score === "number" && Number.isFinite(score) ? score : null;
}

/** Newest first; entries with an invalid/missing timestamp are ordered last. */
function compareByTimeDesc(left: number | null, right: number | null): number {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return right - left;
}

function parseTimestamp(value: string): number | null {
  if (value.length === 0) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

async function readJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
