/**
 * Pure, defensive projection of the recruiter application-detail body into the
 * normalized {@link CandidateIntelligenceInput} the scoring stage consumes.
 *
 * The projection never throws and never fabricates: a value is either the exact
 * source value (defensively parsed) or an honest empty/null. Unknown-shaped
 * input degrades gracefully. The only hard requirement is a usable
 * `application.id`; without it there is no candidate to rank and the function
 * returns null so the caller can treat it as an error rather than an empty card.
 */

import type { CandidateIntelligenceInput } from "./types";

/**
 * Projects the documented `{ application: { ... } }` detail envelope into a
 * frozen {@link CandidateIntelligenceInput}. Returns null only when the envelope
 * or a non-empty `application.id` is absent; otherwise every field is parsed
 * defensively and the result is safe to score.
 */
export function projectCandidateIntelligenceInput(
  detailBody: unknown
): CandidateIntelligenceInput | null {
  if (!isRecord(detailBody) || !isRecord(detailBody.application)) {
    return null;
  }

  const application = detailBody.application;
  const applicationId =
    typeof application.id === "string" ? application.id.trim() : "";
  if (applicationId.length === 0) {
    return null;
  }

  const user = isRecord(application.user) ? application.user : null;
  const studentProfile =
    user !== null && isRecord(user.studentProfile) ? user.studentProfile : null;
  const job = isRecord(application.job) ? application.job : null;
  const resume = isRecord(application.resume) ? application.resume : null;
  const analysis = isRecord(application.analysis) ? application.analysis : null;

  const originalText =
    resume !== null && typeof resume.originalText === "string"
      ? resume.originalText
      : null;

  const candidateLabel =
    nonEmptyString(studentProfile?.fullName) ?? nonEmptyString(user?.email) ?? null;

  return Object.freeze({
    applicationId,
    candidateLabel,
    status: readString(application.status),
    createdAt: readString(application.createdAt),
    jobTitle: nonEmptyString(job?.title),
    college: nonEmptyString(studentProfile?.college),
    degree: nonEmptyString(studentProfile?.degree),
    hasResume: originalText !== null && originalText.trim().length > 0,
    resumeTextLength: originalText !== null ? originalText.length : 0,
    ats: finiteScore(analysis?.atsScore),
    skills: finiteScore(analysis?.skillsMatchScore),
    experience: finiteScore(analysis?.experienceScore),
    education: finiteScore(analysis?.educationScore),
    formatting: finiteScore(analysis?.formattingScore),
    impactVerb: finiteScore(analysis?.impactVerbScore),
    strengths: stringArray(analysis?.strengths),
    weaknesses: stringArray(analysis?.weaknesses),
    hiddenSkills: stringArray(analysis?.hiddenSkills),
    keywordSuggestions: stringArray(analysis?.keywordSuggestions),
    summary: nonEmptyString(analysis?.summary),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The verbatim source string, or "" when absent/malformed (non-null field). */
function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** The verbatim source string when non-blank after trimming, otherwise null. */
function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/** A finite number within the 0-100 score range, otherwise null (never clamped). */
function finiteScore(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : null;
}

/**
 * The source array reduced to its non-blank string entries in source order, or
 * an empty frozen array for non-arrays / arrays without usable strings.
 */
function stringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return EMPTY;
  }

  const items: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim().length > 0) {
      items.push(entry);
    }
  }

  return items.length > 0 ? Object.freeze(items) : EMPTY;
}

const EMPTY: readonly string[] = Object.freeze([]);
