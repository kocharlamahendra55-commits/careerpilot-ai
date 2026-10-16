import {
  createJobCreateRequestIntent,
  createJobUpdateRequestIntent,
  type JobCreateRequestIntent,
  type JobUpdateRequestIntent,
} from "./request-intents";
import {
  planJobSaveDisclosures,
  serializeSupportedJobWrite,
  type JobFormState,
  type JobFormValidationResult,
  type JobSaveDisclosurePlan,
} from "./job-form";
import type { SupportedJobWrite } from "./types";

/** Identifies whether a valid explicit save uses the existing POST or PUT contract. */
export type JobSaveTarget =
  | { readonly mode: "create" }
  | { readonly mode: "update"; readonly jobId: string };

export type JobSaveRequestIntent =
  | JobCreateRequestIntent
  | JobUpdateRequestIntent;

/**
 * A title/status validation failure deliberately has no request intent. This
 * lets UI code render validation feedback without having a POST or PUT to send.
 */
export type JobSaveRequestPlan =
  | {
      readonly kind: "invalid";
      readonly target: JobSaveTarget;
      readonly validation: JobFormValidationResult;
      readonly payload: null;
      readonly request: null;
      readonly disclosures: JobSaveDisclosurePlan;
    }
  | {
      readonly kind: "ready";
      readonly target: JobSaveTarget;
      readonly validation: JobFormValidationResult;
      readonly payload: Readonly<SupportedJobWrite>;
      readonly request: JobSaveRequestIntent;
      readonly disclosures: JobSaveDisclosurePlan;
    };

/**
 * Prepares an explicit save using the closed Task 1.1 request surface. Payload
 * construction happens before request construction so invalid titles cannot
 * produce either a POST or PUT intent.
 */
export function createJobSaveRequestPlan(
  target: JobSaveTarget,
  form: JobFormState
): JobSaveRequestPlan {
  const serialization = serializeSupportedJobWrite(form);
  const disclosures = planJobSaveDisclosures(form);

  if (serialization.kind === "invalid") {
    return Object.freeze({
      kind: "invalid",
      target: copyJobSaveTarget(target),
      validation: serialization.validation,
      payload: null,
      request: null,
      disclosures,
    });
  }

  const request =
    target.mode === "create"
      ? createJobCreateRequestIntent(serialization.payload)
      : createJobUpdateRequestIntent(target.jobId, serialization.payload);

  return Object.freeze({
    kind: "ready",
    target: copyJobSaveTarget(target),
    validation: serialization.validation,
    payload: serialization.payload,
    request,
    disclosures,
  });
}

export function createJobCreateSaveRequestPlan(
  form: JobFormState
): JobSaveRequestPlan {
  return createJobSaveRequestPlan({ mode: "create" }, form);
}

export function createJobUpdateSaveRequestPlan(
  jobId: string,
  form: JobFormState
): JobSaveRequestPlan {
  return createJobSaveRequestPlan({ mode: "update", jobId }, form);
}

function copyJobSaveTarget(target: JobSaveTarget): JobSaveTarget {
  return target.mode === "create"
    ? Object.freeze({ mode: "create" as const })
    : Object.freeze({ mode: "update" as const, jobId: target.jobId });
}
