"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  reconcileJobCollectionAfterLifecycleResult,
  type JobLifecycleState,
} from "./job-lifecycle";
import { getRecruiterJobCollectionFromResponse, readWorkspaceJsonSafely } from "./job-response";
import {
  createJobCollectionRequestIntent,
  serializeWorkspaceRequest,
  type JobCollectionRequestIntent,
} from "./request-intents";
import {
  beginResourceRequest,
  clearResourceState,
  createResourceState,
  resolveResourceFailure,
  resolveResourceSuccess,
  type ResourceState,
} from "./resource-state";
import type { RecruiterJob } from "./types";

type JobCollectionResourceState = ResourceState<
  JobCollectionRequestIntent,
  readonly RecruiterJob[]
>;

export interface RecruiterJobCollectionResource {
  readonly phase: JobCollectionResourceState["phase"];
  readonly jobs: readonly RecruiterJob[] | null;
  readonly errorMessage: string | null;
  /** Repeats the same unparameterized collection GET with a new stale-response token. */
  readonly reload: () => Promise<void>;
  /**
   * Reconciles only a verified lifecycle success into the current source
   * collection. A subsequent reload receives a newer token, so an older GET
   * response cannot overwrite the returned lifecycle state.
   */
  readonly reconcileLifecycleResult: (lifecycle: JobLifecycleState) => void;
}

/**
 * Owns the recruiter job collection's latest-request token and last successful
 * source snapshot. Local Manage Jobs controls never appear in this request.
 */
export function useRecruiterJobCollection(): RecruiterJobCollectionResource {
  const resourceRef = useRef<JobCollectionResourceState>(
    createResourceState<JobCollectionRequestIntent, readonly RecruiterJob[]>()
  );
  const [resource, setResource] = useState(resourceRef.current);

  const commit = useCallback((next: JobCollectionResourceState) => {
    resourceRef.current = next;
    setResource(next);
  }, []);

  const load = useCallback(async () => {
    const request = createJobCollectionRequestIntent();
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
            "Unable to load jobs."
          )
        );
        return;
      }

      const jobs = getRecruiterJobCollectionFromResponse(body);

      if (jobs === null) {
        commit(
          resolveResourceFailure(
            resourceRef.current,
            requestToken,
            { error: "The job service returned an incomplete job collection." },
            "Unable to load jobs."
          )
        );
        return;
      }

      commit(resolveResourceSuccess(resourceRef.current, requestToken, jobs));
    } catch {
      if (resourceRef.current.requestToken !== requestToken) {
        return;
      }

      commit(
        resolveResourceFailure(
          resourceRef.current,
          requestToken,
          null,
          "Unable to load jobs. Check your connection and try again."
        )
      );
    }
  }, [commit]);

  const reconcileLifecycleResult = useCallback(
    (lifecycle: JobLifecycleState) => {
      const current = resourceRef.current;

      if (current.lastSuccess === null) {
        return;
      }

      const jobs = reconcileJobCollectionAfterLifecycleResult(current.lastSuccess, lifecycle);

      if (jobs === current.lastSuccess) {
        return;
      }

      commit({ ...current, lastSuccess: jobs });
    },
    [commit]
  );

  useEffect(() => {
    void load();

    return () => {
      // Invalidate every pending completion after the route unmounts.
      resourceRef.current = clearResourceState(resourceRef.current);
    };
  }, [load]);

  return {
    phase: resource.phase,
    jobs: resource.lastSuccess,
    errorMessage: resource.errorMessage,
    reload: load,
    reconcileLifecycleResult,
  };
}
