import { SUPPORTED_JOB_WRITE_FIELDS } from "./types";

/** Exact collection path exposed by the existing recruiter job API. */
export const RECRUITER_JOB_COLLECTION_PATH = "/api/recruiter/jobs" as const;

/** Documentation-only path template; request builders encode a concrete job ID. */
export const RECRUITER_JOB_DETAIL_PATH_TEMPLATE =
  "/api/recruiter/jobs/:id" as const;

/** Exact collection path exposed by the existing recruiter application API. */
export const RECRUITER_APPLICATION_COLLECTION_PATH =
  "/api/recruiter/applications" as const;

/** Documentation-only path template; request builders encode a concrete application ID. */
export const RECRUITER_APPLICATION_DETAIL_PATH_TEMPLATE =
  "/api/recruiter/applications/:id" as const;

/**
 * The only query keys the existing application collection endpoint reads. The
 * shared request boundary refuses to serialize any key outside this allowlist.
 */
export const SUPPORTED_APPLICATION_QUERY_KEYS = Object.freeze([
  "jobId",
  "status",
  "search",
  "page",
  "pageSize",
] as const);

export type SupportedApplicationQueryKey =
  (typeof SUPPORTED_APPLICATION_QUERY_KEYS)[number];

/** Inclusive candidate page-size bounds accepted by the application endpoint. */
export const CANDIDATE_PAGE_SIZE_BOUNDS = Object.freeze({ min: 1, max: 50 } as const);

/** Page size used when a caller supplies no valid candidate page size. */
export const DEFAULT_CANDIDATE_PAGE_SIZE = 10;

/**
 * Immutable capability configuration for the recruiter workspace.
 *
 * It exposes only verified recruiter job read/write operations and the two
 * recruiter application read operations. It deliberately contains no
 * application status-mutation capability, keeping unsupported writes outside
 * the shared client request surface until a separately scoped task authorizes
 * them.
 */
export const recruiterWorkspaceCapabilities = Object.freeze({
  jobs: Object.freeze({
    collection: Object.freeze({
      method: "GET" as const,
      path: RECRUITER_JOB_COLLECTION_PATH,
      allowsQueryParameters: false,
    }),
    detail: Object.freeze({
      method: "GET" as const,
      pathTemplate: RECRUITER_JOB_DETAIL_PATH_TEMPLATE,
    }),
    create: Object.freeze({
      method: "POST" as const,
      path: RECRUITER_JOB_COLLECTION_PATH,
      supportedWriteFields: SUPPORTED_JOB_WRITE_FIELDS,
    }),
    update: Object.freeze({
      method: "PUT" as const,
      pathTemplate: RECRUITER_JOB_DETAIL_PATH_TEMPLATE,
      supportedWriteFields: SUPPORTED_JOB_WRITE_FIELDS,
    }),
  }),
  applications: Object.freeze({
    collection: Object.freeze({
      method: "GET" as const,
      path: RECRUITER_APPLICATION_COLLECTION_PATH,
      supportedQueryKeys: SUPPORTED_APPLICATION_QUERY_KEYS,
      pageSizeBounds: CANDIDATE_PAGE_SIZE_BOUNDS,
    }),
    detail: Object.freeze({
      method: "GET" as const,
      pathTemplate: RECRUITER_APPLICATION_DETAIL_PATH_TEMPLATE,
    }),
  }),
});

export type RecruiterWorkspaceCapabilities = typeof recruiterWorkspaceCapabilities;
