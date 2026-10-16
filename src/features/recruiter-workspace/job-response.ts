import type { RecruiterJob } from "./types";

/** Reads a JSON response without surfacing malformed body details to the UI. */
export async function readWorkspaceJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Accepts only the documented `{ job }` response shape used by recruiter job
 * create, detail, and update operations. A malformed success result is not
 * projected as a plausible source-backed job.
 */
export function getRecruiterJobFromResponse(value: unknown): RecruiterJob | null {
  if (!isRecord(value) || !isRecruiterJob(value.job)) {
    return null;
  }

  return value.job;
}

/**
 * Accepts only the documented `{ jobs }` collection shape. A malformed success
 * response never becomes a plausible table row, and the returned array is
 * frozen so local transforms retain an immutable source collection.
 */
export function getRecruiterJobCollectionFromResponse(
  value: unknown
): readonly RecruiterJob[] | null {
  if (!isRecord(value) || !Array.isArray(value.jobs)) {
    return null;
  }

  const jobs: RecruiterJob[] = [];

  for (const job of value.jobs) {
    if (!isRecruiterJob(job)) {
      return null;
    }

    jobs.push(job);
  }

  return Object.freeze(jobs);
}

function isRecruiterJob(value: unknown): value is RecruiterJob {
  if (!isRecord(value)) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    !value.id.trim() ||
    typeof value.recruiterId !== "string" ||
    typeof value.title !== "string" ||
    typeof value.company !== "string" ||
    typeof value.description !== "string" ||
    typeof value.location !== "string" ||
    typeof value.salary !== "string" ||
    typeof value.requirements !== "string" ||
    typeof value.status !== "string" ||
    typeof value.isActive !== "boolean" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return false;
  }

  if (value._count === undefined) {
    return true;
  }

  return isRecord(value._count) && typeof value._count.applications === "number";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
