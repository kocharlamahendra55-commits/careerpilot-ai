"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  beginResourceRequest,
  clearResourceState,
  createResourceState,
  resolveResourceFailure,
  resolveResourceSuccess,
  type ResourceState,
} from "./resource-state";
import {
  createJobDetailRequestIntent,
  serializeWorkspaceRequest,
  type JobDetailRequestIntent,
} from "./request-intents";
import { getRecruiterJobFromResponse, readWorkspaceJsonSafely } from "./job-response";
import type { RecruiterJob } from "./types";

export interface RecruiterJobDetailResource {
  readonly phase: ResourceState<JobDetailRequestIntent, RecruiterJob>["phase"];
  readonly job: RecruiterJob | null;
  readonly errorMessage: string | null;
  readonly isNotFound: boolean;
  readonly reload: () => Promise<void>;
}

/**
 * Owns an individual job-detail GET lifecycle. It clears source data before a
 * new load and rejects late responses so an old record can never render over a
 * newer route ID or retry result.
 */
export function useRecruiterJobDetail(jobId: string): RecruiterJobDetailResource {
  const resourceRef = useRef<ResourceState<JobDetailRequestIntent, RecruiterJob>>(
    createResourceState<JobDetailRequestIntent, RecruiterJob>()
  );
  const [resource, setResource] = useState(resourceRef.current);
  const [isNotFound, setIsNotFound] = useState(false);

  const commit = useCallback(
    (next: ResourceState<JobDetailRequestIntent, RecruiterJob>) => {
      resourceRef.current = next;
      setResource(next);
    },
    []
  );

  const load = useCallback(async () => {
    const normalizedJobId = typeof jobId === "string" ? jobId.trim() : "";

    if (!normalizedJobId) {
      const current = resourceRef.current;
      commit({
        phase: "error",
        request: null,
        lastSuccess: null,
        errorMessage: "No job was specified.",
        requestToken: current.requestToken + 1,
      });
      setIsNotFound(false);
      return;
    }

    const request = createJobDetailRequestIntent(normalizedJobId);
    const started = beginResourceRequest(resourceRef.current, request, {
      preserveLastSuccess: false,
    });
    const requestToken = started.requestToken;
    commit(started);
    setIsNotFound(false);

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
            "Unable to load this job."
          )
        );
        setIsNotFound(response.status === 404);
        return;
      }

      const job = getRecruiterJobFromResponse(body);
      if (!job) {
        commit(
          resolveResourceFailure(
            resourceRef.current,
            requestToken,
            { error: "The job service returned an incomplete job record." },
            "Unable to load this job."
          )
        );
        return;
      }

      if (job.id !== normalizedJobId) {
        commit(
          resolveResourceFailure(
            resourceRef.current,
            requestToken,
            { error: "The job service returned a different job record." },
            "Unable to load this job."
          )
        );
        return;
      }

      commit(resolveResourceSuccess(resourceRef.current, requestToken, job));
    } catch {
      if (resourceRef.current.requestToken !== requestToken) {
        return;
      }

      commit(
        resolveResourceFailure(
          resourceRef.current,
          requestToken,
          null,
          "Unable to load this job. Check your connection and try again."
        )
      );
    }
  }, [commit, jobId]);

  useEffect(() => {
    void load();

    return () => {
      // Advancing the token makes every outstanding response stale after an ID
      // change or unmount, without mutating a different route's UI state.
      resourceRef.current = clearResourceState(resourceRef.current);
    };
  }, [load]);

  return {
    phase: resource.phase,
    job: resource.lastSuccess,
    errorMessage: resource.errorMessage,
    isNotFound,
    reload: load,
  };
}
