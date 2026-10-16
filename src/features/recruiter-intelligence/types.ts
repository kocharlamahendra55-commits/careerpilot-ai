/**
 * Types for the recruiter candidate-ranking intelligence engine (core).
 *
 * The engine is pure and deterministic: every value is derived only from the
 * recruiter application-detail body. Data the detail endpoint does not expose
 * (structured projects, certifications, an explicit job-match percentage, and an
 * explicit missing-skills list) is never invented. Those concepts are surfaced
 * as explicit `available: false` rows so a consumer can render an honest
 * "not available" state instead of a fabricated, source-looking value.
 */

/**
 * The normalized, source-backed per-candidate input. This is the sole shape the
 * scoring stage reads from. Every analysis-derived number is nullable; a missing
 * or malformed analysis leaves those numbers null and the analysis arrays empty.
 */
export interface CandidateIntelligenceInput {
  readonly applicationId: string;
  /** studentProfile.fullName -> user.email -> null; chosen defensively, never fabricated. */
  readonly candidateLabel: string | null;
  readonly status: string;
  readonly createdAt: string;
  readonly jobTitle: string | null;
  readonly college: string | null;
  readonly degree: string | null;
  readonly hasResume: boolean;
  readonly resumeTextLength: number;
  readonly ats: number | null;
  readonly skills: number | null;
  readonly experience: number | null;
  readonly education: number | null;
  readonly formatting: number | null;
  readonly impactVerb: number | null;
  readonly strengths: readonly string[];
  readonly weaknesses: readonly string[];
  readonly hiddenSkills: readonly string[];
  readonly keywordSuggestions: readonly string[];
  readonly summary: string | null;
}

/**
 * Every breakdown row key. The first six are weighted factors that contribute to
 * the overall match; `projects` and `certifications` exist only as explicit
 * unavailable rows (weight 0, never counted) because the data source exposes no
 * data for them.
 */
export type RankingFactorKey =
  | "ats"
  | "skills"
  | "experience"
  | "education"
  | "resumeQuality"
  | "completeness"
  | "projects"
  | "certifications";

/**
 * One row of the ranking breakdown. `available` is false for a weighted factor
 * whose source value was absent and always false for the projects/certifications
 * rows. `contribution` is the factor's share of the overall match and is 0 for
 * any unavailable row.
 */
export interface RankingFactorRow {
  readonly key: RankingFactorKey;
  readonly label: string;
  readonly weightPercent: number;
  readonly available: boolean;
  readonly value: number | null;
  readonly contribution: number;
}

/** The pure ranking output for a single candidate. */
export interface RankingBreakdown {
  readonly rows: readonly RankingFactorRow[];
  readonly overallMatch: number;
  readonly confidence: number;
}

export type RecommendationLevel =
  | "HIGHLY_RECOMMENDED"
  | "RECOMMENDED"
  | "CONSIDER"
  | "LOW_MATCH";
