"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  beginCandidateDetailLoad,
  createCandidateDetailCache,
  getCandidateDetailEntry,
  resolveCandidateDetailFailure,
  resolveCandidateDetailSuccess,
  type CandidateDetailCache,
  type CandidateDetailCacheEntry,
} from "@/features/recruiter-workspace/candidate-detail-cache";
import { readWorkspaceJsonSafely } from "@/features/recruiter-workspace/job-response";
import {
  createApplicationDetailRequestIntent,
  serializeWorkspaceRequest,
} from "@/features/recruiter-workspace/request-intents";
import { WorkspaceToastProvider } from "@/components/recruiter/workspace/WorkspaceToast";

export interface CandidateDetailLoadOutcome {
  readonly status: "success" | "error";
  readonly applicationId: string;
}

export interface CandidateDetailCacheContextValue {
  /** Current source-backed detail cache, keyed strictly by application ID. */
  readonly cache: CandidateDetailCache;
  readonly getEntry: (applicationId: string) => CandidateDetailCacheEntry | null;
  /** Runs exactly one detail GET for the ID and stores only a matching success. */
  readonly loadDetail: (applicationId: string) => Promise<CandidateDetailLoadOutcome>;
}

const CandidateDetailCacheContext =
  createContext<CandidateDetailCacheContextValue | null>(null);

/**
 * Reads the candidate detail cache scoped to the `/recruiter/candidates`
 * subtree. Throwing outside the provider keeps the cache from being shared with
 * the recruiter dashboard or any other route.
 */
export function useCandidateDetailCache(): CandidateDetailCacheContextValue {
  const context = useContext(CandidateDetailCacheContext);

  if (context === null) {
    throw new Error(
      "useCandidateDetailCache must be used within the candidate workspace layout."
    );
  }

  return context;
}

function CandidateDetailCacheProvider({ children }: { children: ReactNode }) {
  const cacheRef = useRef<CandidateDetailCache>(createCandidateDetailCache());
  const [cache, setCache] = useState<CandidateDetailCache>(cacheRef.current);

  const commit = useCallback((next: CandidateDetailCache) => {
    cacheRef.current = next;
    setCache(next);
  }, []);

  const getEntry = useCallback(
    (applicationId: string) => getCandidateDetailEntry(cacheRef.current, applicationId),
    []
  );

  const loadDetail = useCallback(
    async (applicationId: string): Promise<CandidateDetailLoadOutcome> => {
      // Begin a single load for exactly this ID and correlate its completion via
      // the returned token; only the latest pending load for the ID may resolve.
      const started = beginCandidateDetailLoad(cacheRef.current, applicationId);
      const id = started.applicationId;
      const requestToken = started.requestToken;
      commit(started.cache);

      try {
        const intent = createApplicationDetailRequestIntent(id);
        const fetchRequest = serializeWorkspaceRequest(intent);
        const response = await fetch(fetchRequest.url, fetchRequest.init);
        const body = await readWorkspaceJsonSafely(response);

        if (!response.ok) {
          commit(resolveCandidateDetailFailure(cacheRef.current, id, requestToken, body));
          return { status: "error", applicationId: id };
        }

        // A response whose returned application ID does not match is rejected as
        // an error by the cache, so it can never enrich a different candidate row.
        const next = resolveCandidateDetailSuccess(cacheRef.current, id, requestToken, body);
        commit(next);

        const entry = getCandidateDetailEntry(next, id);
        return entry !== null && entry.status === "success"
          ? { status: "success", applicationId: id }
          : { status: "error", applicationId: id };
      } catch {
        commit(resolveCandidateDetailFailure(cacheRef.current, id, requestToken, null));
        return { status: "error", applicationId: id };
      }
    },
    [commit]
  );

  const value = useMemo<CandidateDetailCacheContextValue>(
    () => ({ cache, getEntry, loadDetail }),
    [cache, getEntry, loadDetail]
  );

  return (
    <CandidateDetailCacheContext.Provider value={value}>
      {children}
    </CandidateDetailCacheContext.Provider>
  );
}

/**
 * Scopes the candidate detail cache to this route subtree only. It sits beneath
 * the existing recruiter layout (which supplies the shared header and auth
 * provider) and adds no navigation, request, or change to the protected
 * dashboard.
 */
export default function RecruiterCandidatesLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceToastProvider>
      <CandidateDetailCacheProvider>{children}</CandidateDetailCacheProvider>
    </WorkspaceToastProvider>
  );
}
