"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCandidateListQueryState,
  createCandidateListRequestIntent,
  parseCandidateListResponse,
  reduceCandidateListQueryState,
  type CandidateListQueryAction,
  type CandidateListQueryState,
  type CandidateListResponse,
} from "./candidate-query";
import { readWorkspaceJsonSafely } from "./job-response";
import {
  serializeWorkspaceRequest,
  type ApplicationCollectionRequestIntent,
} from "./request-intents";
import {
  beginResourceRequest,
  clearResourceState,
  createResourceState,
  resolveResourceFailure,
  resolveResourceSuccess,
  type ResourceState,
} from "./resource-state";

const CANDIDATE_COLLECTION_LOAD_FAILURE_MESSAGE = "Unable to load candidates.";

type CandidateCollectionResourceState = ResourceState<
  ApplicationCollectionRequestIntent,
  CandidateListResponse
>;

export interface UseRecruiterCandidateCollectionOptions {
  /** Defer the initial request until the route confirms an authenticated recruiter. */
  readonly enabled?: boolean;
  readonly initialQuery?: Partial<CandidateListQueryState>;
}

export interface RecruiterCandidateCollectionResource {
  readonly phase: CandidateCollectionResourceState["phase"];
  /** The last successful source-backed page, retained through a later failure. */
  readonly response: CandidateListResponse | null;
  readonly errorMessage: string | null;
  readonly query: CandidateListQueryState;
  /** Updates an accepted filter/pagination value, which re-requests the collection. */
  readonly updateQuery: (action: CandidateListQueryAction) => void;
  readonly resetQuery: () => void;
  /** Repeats the current accepted request with a fresh stale-response token. */
  readonly reload: () => Promise<void>;
}

/**
 * Owns the recruiter candidate collection's latest-request token and last
 * successful page. It requests only when an accepted filter/page state changes
 * (initial load, filter change, page change, retry) and never appends an
 * unsupported query key, because every request flows through the allowlisted
 * candidate query serializer.
 */
export function useRecruiterCandidateCollection(
  options: UseRecruiterCandidateCollectionOptions = {}
): RecruiterCandidateCollectionResource {
  const { enabled = true } = options;

  const [query, setQuery] = useState<CandidateListQueryState>(() =>
    createCandidateListQueryState(options.initialQuery)
  );
  const queryRef = useRef(query);
  queryRef.current = query;

  const resourceRef = useRef<CandidateCollectionResourceState>(
    createResourceState<ApplicationCollectionRequestIntent, CandidateListResponse>()
  );
  const [resource, setResource] = useState(resourceRef.current);

  const commit = useCallback((next: CandidateCollectionResourceState) => {
    resourceRef.current = next;
    setResource(next);
  }, []);

  const load = useCallback(
    async (targetQuery: CandidateListQueryState) => {
      // beginResourceRequest retains the last successful page (phase "refreshing")
      // and advances the token so a superseded response is ignored on completion.
      const request = createCandidateListRequestIntent(targetQuery);
      const started = beginResourceRequest(resourceRef.current, request);
      const requestToken = started.requestToken;
      commit(started);

      try {
        const fetchRequest = serializeWorkspaceRequest(request);
        const response = await fetch(fetchRequest.url, fetchRequest.init);
        const body = await readWorkspaceJsonSafely(response);

        if (resourceRef.current.requestToken !== requestToken) {
          return;
        }

        if (!response.ok) {
          commit(
            resolveResourceFailure(
              resourceRef.current,
              requestToken,
              body,
              CANDIDATE_COLLECTION_LOAD_FAILURE_MESSAGE
            )
          );
          return;
        }

        const parsed = parseCandidateListResponse(body);

        if (parsed === null) {
          commit(
            resolveResourceFailure(
              resourceRef.current,
              requestToken,
              { error: "The application service returned an incomplete candidate page." },
              CANDIDATE_COLLECTION_LOAD_FAILURE_MESSAGE
            )
          );
          return;
        }

        commit(resolveResourceSuccess(resourceRef.current, requestToken, parsed));
      } catch {
        if (resourceRef.current.requestToken !== requestToken) {
          return;
        }

        commit(
          resolveResourceFailure(
            resourceRef.current,
            requestToken,
            null,
            "Unable to load candidates. Check your connection and try again."
          )
        );
      }
    },
    [commit]
  );

  const updateQuery = useCallback((action: CandidateListQueryAction) => {
    setQuery((current) => reduceCandidateListQueryState(current, action));
  }, []);

  const resetQuery = useCallback(() => {
    setQuery(createCandidateListQueryState());
  }, []);

  const reload = useCallback(() => load(queryRef.current), [load]);

  // The query state object keeps its identity on a no-op reducer result and takes
  // a fresh identity only when an accepted value changes, so this effect requests
  // exactly once per initial load, filter change, page change, or page-size change.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    void load(query);
  }, [enabled, load, query]);

  useEffect(() => {
    return () => {
      // Invalidate every pending completion after the route unmounts.
      resourceRef.current = clearResourceState(resourceRef.current);
    };
  }, []);

  return {
    phase: resource.phase,
    response: resource.lastSuccess,
    errorMessage: resource.errorMessage,
    query,
    updateQuery,
    resetQuery,
    reload,
  };
}
