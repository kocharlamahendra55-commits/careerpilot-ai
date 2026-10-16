/**
 * Pure Candidate Profile projection over the existing
 * `GET /api/recruiter/applications/[id]` detail response.
 *
 * The projection is defensive by construction: every source-backed section is
 * either an exact returned value or an explicit unavailability marker. Missing
 * or malformed data never throws and is never replaced by a fabricated,
 * source-looking value (no invented identity, ATS, resume, date, or analysis).
 *
 * Only the fields the detail endpoint actually returns are projected. Roadmap,
 * structured projects, additional work experience, extended status history, and
 * recruiter notes are represented as named unavailable/placeholder markers (D4)
 * rather than being read from list data or synthesized here.
 */

export type ProfileUnavailableReason =
  /** The detail response omitted or malformed this source-backed value. */
  | "unavailable-source"
  /** The endpoint exposes no data for this section at all (D4 integration gap). */
  | "unavailable-integration";

export interface ProfileUnavailableValue {
  readonly available: false;
  readonly reason: ProfileUnavailableReason;
}

export interface ProfileTextValueAvailable {
  readonly available: true;
  /** The exact source string, preserved verbatim (not trimmed for display). */
  readonly text: string;
}

export type ProfileTextValue = ProfileTextValueAvailable | ProfileUnavailableValue;

export interface ProfileScoreValueAvailable {
  readonly available: true;
  /** The exact source number, including a genuine 0 (never fabricated). */
  readonly score: number;
}

export type ProfileScoreValue = ProfileScoreValueAvailable | ProfileUnavailableValue;

export interface ProfileListValueAvailable {
  readonly available: true;
  /** Exact nonblank source strings in source order; never an empty list. */
  readonly items: readonly string[];
}

export type ProfileListValue = ProfileListValueAvailable | ProfileUnavailableValue;

export interface ProfileDateValueAvailable {
  readonly available: true;
  /** The exact source date string retained for a semantic `<time dateTime>`. */
  readonly iso: string;
  readonly timestamp: number;
}

export type ProfileDateValue = ProfileDateValueAvailable | ProfileUnavailableValue;

export type CandidateProfileNameOrigin = "student-full-name" | "user-email";

export interface CandidateProfileNameAvailable {
  readonly available: true;
  readonly origin: CandidateProfileNameOrigin;
  readonly text: string;
}

export type CandidateProfileNameValue =
  | CandidateProfileNameAvailable
  | ProfileUnavailableValue;

/** Header/identity fields projected only from the detail response. */
export interface CandidateProfileIdentity {
  readonly candidate: CandidateProfileNameValue;
  readonly jobTitle: ProfileTextValue;
  readonly status: ProfileTextValue;
  readonly appliedDate: ProfileDateValue;
}

/**
 * The Resume section. A present resume carries its exact filename and original
 * text as plain string data (no HTML parsing/markup); the UI renders the text
 * escaped. A response without a resume becomes an explicit Empty_State marker.
 */
export type CandidateProfileResumeSection =
  | {
      readonly status: "present";
      readonly filename: ProfileTextValue;
      readonly originalText: ProfileTextValue;
    }
  | { readonly status: "empty" };

/**
 * Analysis fields. Each value is projected independently so a single absent
 * field becomes its own unavailability marker rather than zero or an empty
 * list. `present` reflects whether the response included an analysis object.
 */
export interface CandidateProfileAnalysisSection {
  readonly present: boolean;
  readonly atsScore: ProfileScoreValue;
  readonly summary: ProfileTextValue;
  readonly strengths: ProfileListValue;
  readonly weaknesses: ProfileListValue;
  readonly hiddenSkills: ProfileListValue;
  readonly keywordSuggestions: ProfileListValue;
  readonly formattingScore: ProfileScoreValue;
  readonly impactVerbScore: ProfileScoreValue;
  readonly skillsMatchScore: ProfileScoreValue;
  readonly experienceScore: ProfileScoreValue;
  readonly educationScore: ProfileScoreValue;
}

export interface CandidateProfileEducation {
  readonly college: ProfileTextValue;
  readonly degree: ProfileTextValue;
}

/** A single source-backed "Applied" event derived only from the creation date. */
export interface CandidateProfileTimeline {
  readonly applied: ProfileDateValue;
}

export type CandidateProfileUnavailableSectionName =
  | "roadmap"
  | "projects"
  | "additional-experience"
  | "status-history";

/** A named D4 section the detail endpoint does not expose at all. */
export interface CandidateProfileUnavailableSection {
  readonly available: false;
  readonly reason: "unavailable-integration";
  readonly section: CandidateProfileUnavailableSectionName;
  readonly dependency: "D4";
}

export interface CandidateProfileUnavailableSections {
  readonly roadmap: CandidateProfileUnavailableSection;
  readonly projects: CandidateProfileUnavailableSection;
  readonly additionalExperience: CandidateProfileUnavailableSection;
  readonly statusHistory: CandidateProfileUnavailableSection;
}

/** A visibly non-persisted notes marker; there is no note storage (D4). */
export interface CandidateProfileNotesPlaceholder {
  readonly persisted: false;
  readonly dependency: "D4";
}

/**
 * The fully projected Candidate Profile. `applicationId` is the trimmed source
 * `application.id`, letting the reset-safe resource state reject a response
 * whose returned id differs from the requested id.
 */
export interface CandidateProfileProjection {
  readonly applicationId: string;
  readonly identity: CandidateProfileIdentity;
  readonly resume: CandidateProfileResumeSection;
  readonly analysis: CandidateProfileAnalysisSection;
  readonly education: CandidateProfileEducation;
  readonly timeline: CandidateProfileTimeline;
  readonly unavailableSections: CandidateProfileUnavailableSections;
  readonly notes: CandidateProfileNotesPlaceholder;
}

/**
 * Projects the documented `{ application: { ... } }` detail envelope. Returns
 * null only when the envelope or a usable `application.id` is absent, which the
 * caller treats as an error rather than a fabricated profile. When a valid id
 * is present, every section is projected defensively and never throws.
 */
export function projectCandidateProfile(
  value: unknown
): CandidateProfileProjection | null {
  if (!isRecord(value) || !isRecord(value.application)) {
    return null;
  }

  const application = value.application;
  const applicationId = typeof application.id === "string" ? application.id.trim() : "";
  if (applicationId.length === 0) {
    return null;
  }

  const user = isRecord(application.user) ? application.user : null;
  const studentProfile =
    user !== null && isRecord(user.studentProfile) ? user.studentProfile : null;
  const job = isRecord(application.job) ? application.job : null;

  // The single source-backed timeline event and header date share one value.
  const appliedDate = readDate(application.createdAt);

  return Object.freeze({
    applicationId,
    identity: Object.freeze({
      candidate: projectCandidateName(studentProfile, user),
      jobTitle: readText(job !== null ? job.title : undefined),
      status: readText(application.status),
      appliedDate,
    }),
    resume: projectResume(application.resume),
    analysis: projectAnalysis(application.analysis),
    education: Object.freeze({
      college: readText(studentProfile !== null ? studentProfile.college : undefined),
      degree: readText(studentProfile !== null ? studentProfile.degree : undefined),
    }),
    timeline: Object.freeze({ applied: appliedDate }),
    unavailableSections: Object.freeze({
      roadmap: unavailableSection("roadmap"),
      projects: unavailableSection("projects"),
      additionalExperience: unavailableSection("additional-experience"),
      statusHistory: unavailableSection("status-history"),
    }),
    notes: Object.freeze({ persisted: false, dependency: "D4" }),
  });
}

function projectCandidateName(
  studentProfile: Record<string, unknown> | null,
  user: Record<string, unknown> | null
): CandidateProfileNameValue {
  const fullName = availableText(studentProfile !== null ? studentProfile.fullName : undefined);
  if (fullName !== null) {
    return Object.freeze({ available: true, origin: "student-full-name", text: fullName });
  }

  const email = availableText(user !== null ? user.email : undefined);
  if (email !== null) {
    return Object.freeze({ available: true, origin: "user-email", text: email });
  }

  return sourceUnavailable();
}

function projectResume(value: unknown): CandidateProfileResumeSection {
  if (!isRecord(value)) {
    return Object.freeze({ status: "empty" });
  }

  return Object.freeze({
    status: "present",
    filename: readText(value.filename),
    originalText: readText(value.originalText),
  });
}

function projectAnalysis(value: unknown): CandidateProfileAnalysisSection {
  const analysis = isRecord(value) ? value : null;

  return Object.freeze({
    present: analysis !== null,
    atsScore: readScore(analysis !== null ? analysis.atsScore : undefined),
    summary: readText(analysis !== null ? analysis.summary : undefined),
    strengths: readList(analysis !== null ? analysis.strengths : undefined),
    weaknesses: readList(analysis !== null ? analysis.weaknesses : undefined),
    hiddenSkills: readList(analysis !== null ? analysis.hiddenSkills : undefined),
    keywordSuggestions: readList(analysis !== null ? analysis.keywordSuggestions : undefined),
    formattingScore: readScore(analysis !== null ? analysis.formattingScore : undefined),
    impactVerbScore: readScore(analysis !== null ? analysis.impactVerbScore : undefined),
    skillsMatchScore: readScore(analysis !== null ? analysis.skillsMatchScore : undefined),
    experienceScore: readScore(analysis !== null ? analysis.experienceScore : undefined),
    educationScore: readScore(analysis !== null ? analysis.educationScore : undefined),
  });
}

/** Available only for a nonblank string; the exact source string is preserved. */
function readText(value: unknown): ProfileTextValue {
  const text = availableText(value);
  return text === null ? sourceUnavailable() : Object.freeze({ available: true, text });
}

/** Available for any finite number, including a genuine 0; absent stays unavailable. */
function readScore(value: unknown): ProfileScoreValue {
  return typeof value === "number" && Number.isFinite(value)
    ? Object.freeze({ available: true, score: value })
    : sourceUnavailable();
}

/**
 * Available only for a source array containing at least one nonblank string.
 * Non-array or empty-after-filtering values become an unavailability marker so
 * an empty list is never presented as a real analysis result.
 */
function readList(value: unknown): ProfileListValue {
  if (!Array.isArray(value)) {
    return sourceUnavailable();
  }

  const items: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim().length > 0) {
      items.push(entry);
    }
  }

  return items.length > 0
    ? Object.freeze({ available: true, items: Object.freeze(items) })
    : sourceUnavailable();
}

/** Available only for a parseable date string; missing/invalid is never "today". */
function readDate(value: unknown): ProfileDateValue {
  if (typeof value !== "string") {
    return sourceUnavailable();
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return sourceUnavailable();
  }

  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) {
    return sourceUnavailable();
  }

  return Object.freeze({ available: true, iso: value, timestamp });
}

function availableText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function sourceUnavailable(): ProfileUnavailableValue {
  return Object.freeze({ available: false, reason: "unavailable-source" });
}

function unavailableSection(
  section: CandidateProfileUnavailableSectionName
): CandidateProfileUnavailableSection {
  return Object.freeze({
    available: false,
    reason: "unavailable-integration",
    section,
    dependency: "D4",
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
