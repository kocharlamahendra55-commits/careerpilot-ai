import {
  isJobLifecycleStatus,
  type JobLifecycleStatus,
  type RecruiterJob,
  type SupportedJobWrite,
  type SupportedJobWriteField,
} from "./types";

export const JOB_TITLE_REQUIRED_MESSAGE = "Job title is required.";
export const JOB_STATUS_INVALID_MESSAGE =
  "Choose Draft, Published, or Archived for the job status.";

/**
 * The full client form model. Only the fields represented by SupportedJobWrite
 * are sent to the existing job API; the remaining values stay in the active
 * form so a failed request never discards recruiter input.
 */
export interface JobFormState {
  readonly title: string;
  /** Recruiter-profile-derived display context. Never included in a write. */
  readonly companyDisplay: string | null;
  readonly location: string;
  readonly employmentType: string;
  readonly experience: string;
  readonly salary: string;
  /** Persisted through the existing `requirements` string as a JSON tag array. */
  readonly requiredSkills: readonly string[];
  readonly description: string;
  readonly benefits: string;
  /** Local-only remote, hybrid, or onsite selection. */
  readonly workArrangement: string;
  readonly status: JobLifecycleStatus;
}

/** Accepts unknown values so hydration of legacy API data remains defensive. */
export interface JobFormStateInput {
  readonly title?: unknown;
  readonly companyDisplay?: unknown;
  readonly location?: unknown;
  readonly employmentType?: unknown;
  readonly experience?: unknown;
  readonly salary?: unknown;
  readonly requiredSkills?: unknown;
  readonly description?: unknown;
  readonly benefits?: unknown;
  readonly workArrangement?: unknown;
  readonly status?: unknown;
}

/** The persisted job fields needed to initialize an edit form. */
export type PersistedJobFormSource = Pick<
  RecruiterJob,
  | "title"
  | "company"
  | "location"
  | "salary"
  | "description"
  | "requirements"
  | "status"
>;

export type LocalOnlyJobFormField =
  | "employmentType"
  | "experience"
  | "benefits"
  | "workArrangement";

export const LOCAL_ONLY_JOB_FORM_FIELDS = Object.freeze([
  "employmentType",
  "experience",
  "benefits",
  "workArrangement",
] as const satisfies readonly LocalOnlyJobFormField[]);

export type JobPersistenceDisclosure =
  | {
      readonly kind: "profile-derived-company";
      readonly fields: readonly ["companyDisplay"];
      readonly message: string;
    }
  | {
      readonly kind: "local-only-fields";
      readonly fields: readonly LocalOnlyJobFormField[];
      readonly message: string;
    };

/**
 * Notices that must remain visible before an explicit save-success message.
 * Required skills are intentionally absent from the local-only notice because
 * they map to the supported requirements field.
 */
export interface JobSaveDisclosurePlan {
  readonly company: Extract<
    JobPersistenceDisclosure,
    { readonly kind: "profile-derived-company" }
  >;
  readonly localOnly: Extract<
    JobPersistenceDisclosure,
    { readonly kind: "local-only-fields" }
  > | null;
  readonly beforeSuccess: readonly JobPersistenceDisclosure[];
}

export interface JobFormValidationResult {
  readonly isValid: boolean;
  /** The value that is safe to serialize when validation succeeds. */
  readonly trimmedTitle: string;
  readonly fieldErrors: Readonly<Partial<Record<"title" | "status", string>>>;
}

export type SupportedJobWriteSerialization =
  | {
      readonly kind: "invalid";
      readonly validation: JobFormValidationResult;
      /** A missing payload is an explicit no-write result. */
      readonly payload: null;
    }
  | {
      readonly kind: "ready";
      readonly validation: JobFormValidationResult;
      readonly payload: Readonly<SupportedJobWrite>;
    };

const COMPANY_PROFILE_DERIVED_MESSAGE =
  "Company is derived from your recruiter profile and is not sent from this form.";

const LOCAL_ONLY_FIELD_LABELS: Readonly<Record<LocalOnlyJobFormField, string>> =
  Object.freeze({
    employmentType: "Employment type",
    experience: "Experience",
    benefits: "Benefits",
    workArrangement: "Remote, hybrid, or onsite choice",
  });

/** Creates a normalized, immutable form state without altering text-field input. */
export function createJobFormState(input: JobFormStateInput = {}): JobFormState {
  return Object.freeze({
    title: readString(input.title),
    companyDisplay: readCompanyDisplay(input.companyDisplay),
    location: readString(input.location),
    employmentType: readString(input.employmentType),
    experience: readString(input.experience),
    salary: readString(input.salary),
    requiredSkills: normalizeRequiredSkills(input.requiredSkills),
    description: readString(input.description),
    benefits: readString(input.benefits),
    workArrangement: readString(input.workArrangement),
    status: isJobLifecycleStatus(input.status) ? input.status : "DRAFT",
  });
}

/**
 * Maps a source-backed persisted job into an editable form. Legacy malformed
 * requirements values become an empty tag list rather than throwing or
 * inventing a value.
 */
export function createJobFormStateFromPersistedJob(
  job: PersistedJobFormSource
): JobFormState {
  return createJobFormState({
    title: job.title,
    companyDisplay: job.company,
    location: job.location,
    salary: job.salary,
    description: job.description,
    requiredSkills: parseRequiredSkills(job.requirements),
    status: job.status,
  });
}

/** Returns a fresh form copy suitable for pure reducer transitions. */
export function copyJobFormState(form: JobFormState): JobFormState {
  return createJobFormState({
    title: form.title,
    companyDisplay: form.companyDisplay,
    location: form.location,
    employmentType: form.employmentType,
    experience: form.experience,
    salary: form.salary,
    requiredSkills: form.requiredSkills,
    description: form.description,
    benefits: form.benefits,
    workArrangement: form.workArrangement,
    status: form.status,
  });
}

/**
 * Parses only JSON arrays from the legacy requirements column. Invalid JSON,
 * JSON objects, scalar values, and non-string tags safely resolve to no tags.
 */
export function parseRequiredSkills(requirements: unknown): readonly string[] {
  if (Array.isArray(requirements)) {
    return normalizeRequiredSkills(requirements);
  }

  if (typeof requirements !== "string") {
    return emptyRequiredSkills();
  }

  try {
    return normalizeRequiredSkills(JSON.parse(requirements));
  } catch {
    return emptyRequiredSkills();
  }
}

/**
 * Trims tags, removes blank/non-string entries, and de-duplicates tags without
 * changing the first recruiter-entered spelling.
 */
export function normalizeRequiredSkills(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return emptyRequiredSkills();
  }

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const rawTag of value) {
    if (typeof rawTag !== "string") {
      continue;
    }

    const tag = rawTag.trim();
    if (!tag) {
      continue;
    }

    const comparisonKey = tag.toLowerCase();
    if (seen.has(comparisonKey)) {
      continue;
    }

    seen.add(comparisonKey);
    normalized.push(tag);
  }

  return Object.freeze(normalized);
}

/** Serializes the supported requirements field as a safe JSON array string. */
export function serializeRequiredSkills(value: unknown): string {
  return JSON.stringify(normalizeRequiredSkills(value));
}

/** Adds one normalized tag without mutating the active form state. */
export function addRequiredSkillTag(
  form: JobFormState,
  rawTag: unknown
): JobFormState {
  const tag = typeof rawTag === "string" ? rawTag.trim() : "";
  if (!tag) {
    return copyJobFormState(form);
  }

  return withRequiredSkills(form, [...form.requiredSkills, tag]);
}

/** Removes all matching normalized tags without mutating the active form state. */
export function removeRequiredSkillTag(
  form: JobFormState,
  rawTag: unknown
): JobFormState {
  const tag = typeof rawTag === "string" ? rawTag.trim().toLowerCase() : "";
  if (!tag) {
    return copyJobFormState(form);
  }

  return withRequiredSkills(
    form,
    form.requiredSkills.filter((currentTag) => currentTag.toLowerCase() !== tag)
  );
}

/** Replaces the tag array through the same defensive normalization path. */
export function withRequiredSkills(
  form: JobFormState,
  requiredSkills: unknown
): JobFormState {
  return createJobFormState({
    title: form.title,
    companyDisplay: form.companyDisplay,
    location: form.location,
    employmentType: form.employmentType,
    experience: form.experience,
    salary: form.salary,
    requiredSkills,
    description: form.description,
    benefits: form.benefits,
    workArrangement: form.workArrangement,
    status: form.status,
  });
}

/** Trims the title for validation, while leaving the active input untouched. */
export function validateJobForm(form: Pick<JobFormState, "title" | "status">): JobFormValidationResult {
  const trimmedTitle = readString(form.title).trim();
  const fieldErrors: Partial<Record<"title" | "status", string>> = {};

  if (!trimmedTitle) {
    fieldErrors.title = JOB_TITLE_REQUIRED_MESSAGE;
  }

  if (!isJobLifecycleStatus(form.status)) {
    fieldErrors.status = JOB_STATUS_INVALID_MESSAGE;
  }

  return Object.freeze({
    isValid: Object.keys(fieldErrors).length === 0,
    trimmedTitle,
    fieldErrors: Object.freeze(fieldErrors),
  });
}

/**
 * Builds the exact SupportedJobWrite allowlist field by field. No arbitrary form
 * property, profile display value, or local-only value can cross this boundary.
 */
export function serializeSupportedJobWrite(
  form: JobFormState
): SupportedJobWriteSerialization {
  const validation = validateJobForm(form);
  if (!validation.isValid) {
    return Object.freeze({ kind: "invalid", validation, payload: null });
  }

  return Object.freeze({
    kind: "ready",
    validation,
    payload: Object.freeze({
      title: validation.trimmedTitle,
      description: readString(form.description),
      location: readString(form.location),
      salary: readString(form.salary),
      requirements: serializeRequiredSkills(form.requiredSkills),
      status: form.status,
    }),
  });
}

/** Finds the supported write fields that changed between two complete forms. */
export function getSupportedJobFormChanges(
  previous: JobFormState,
  next: JobFormState
): readonly SupportedJobWriteField[] {
  const changed: SupportedJobWriteField[] = [];

  if (previous.title !== next.title) changed.push("title");
  if (previous.description !== next.description) changed.push("description");
  if (previous.location !== next.location) changed.push("location");
  if (previous.salary !== next.salary) changed.push("salary");
  if (!areRequiredSkillsEqual(previous.requiredSkills, next.requiredSkills)) {
    changed.push("requirements");
  }
  if (previous.status !== next.status) changed.push("status");

  return Object.freeze(changed);
}

export function hasSupportedJobFormChanges(
  previous: JobFormState,
  next: JobFormState
): boolean {
  return getSupportedJobFormChanges(previous, next).length > 0;
}

/** Lists local-only fields that currently contain a recruiter-entered value. */
export function getEnteredLocalOnlyJobFormFields(
  form: JobFormState
): readonly LocalOnlyJobFormField[] {
  const entered: LocalOnlyJobFormField[] = [];

  for (const field of LOCAL_ONLY_JOB_FORM_FIELDS) {
    if (readString(form[field]).trim()) {
      entered.push(field);
    }
  }

  return Object.freeze(entered);
}

/**
 * Plans truthful field-persistence feedback. The Company notice is always
 * applicable to the rendered field; the D2 notice appears only when an entered
 * local-only value would otherwise be mistaken for a saved value.
 */
export function planJobSaveDisclosures(form: JobFormState): JobSaveDisclosurePlan {
  const company = Object.freeze({
    kind: "profile-derived-company" as const,
    fields: Object.freeze(["companyDisplay"] as const),
    message: COMPANY_PROFILE_DERIVED_MESSAGE,
  });
  const enteredLocalOnlyFields = getEnteredLocalOnlyJobFormFields(form);
  const localOnly = enteredLocalOnlyFields.length
    ? Object.freeze({
        kind: "local-only-fields" as const,
        fields: enteredLocalOnlyFields,
        message: createLocalOnlyDisclosureMessage(enteredLocalOnlyFields),
      })
    : null;
  const beforeSuccess = localOnly
    ? Object.freeze([company, localOnly] as const)
    : Object.freeze([company] as const);

  return Object.freeze({ company, localOnly, beforeSuccess });
}

function areRequiredSkillsEqual(
  first: readonly string[],
  second: readonly string[]
): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((tag, index) => tag === second[index]);
}

function createLocalOnlyDisclosureMessage(
  fields: readonly LocalOnlyJobFormField[]
): string {
  const labels = fields.map((field) => LOCAL_ONLY_FIELD_LABELS[field]);
  const subject = joinLabels(labels);
  const verb = labels.length === 1 ? "is" : "are";

  return `${subject} ${verb} shown in this form but ${verb} not stored by the current job service. ${labels.length === 1 ? "It will" : "They will"} not be included in this save.`;
}

function joinLabels(labels: readonly string[]): string {
  if (labels.length <= 1) {
    return labels[0] ?? "This value";
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function emptyRequiredSkills(): readonly string[] {
  return Object.freeze([] as string[]);
}

function readCompanyDisplay(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim() ? value : null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
