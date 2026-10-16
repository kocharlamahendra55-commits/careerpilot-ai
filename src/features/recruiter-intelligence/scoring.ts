/**
 * Pure, deterministic ranking math for a single candidate.
 *
 * Six weighted factors drive the overall match: ATS, skills, experience,
 * education, a derived resume-quality score, and a derived profile-completeness
 * score. A factor is "available" only when it resolves to a real number; missing
 * factors are dropped from both the numerator and the denominator so an absent
 * ATS score never counts as a zero. Completeness is always computable, which
 * guarantees at least one available factor (denominator >= 8, never zero).
 *
 * Projects and certifications are appended as explicit unavailable rows (weight
 * 0, value null, contribution 0): the data source exposes nothing for them, so
 * they are shown as "not available" rather than invented.
 */

import type {
  CandidateIntelligenceInput,
  RankingBreakdown,
  RankingFactorKey,
  RankingFactorRow,
} from "./types";

/** Weights for the six contributing factors; they sum to 100. */
export const RANKING_WEIGHTS = Object.freeze({
  ats: 30,
  skills: 25,
  experience: 15,
  education: 10,
  resumeQuality: 12,
  completeness: 8,
});

/**
 * Resume quality is the mean of the formatting and impact-verb scores when both
 * are present, the single present score when only one is, and null when neither
 * is available.
 */
function deriveResumeQuality(input: CandidateIntelligenceInput): number | null {
  const { formatting, impactVerb } = input;
  if (formatting !== null && impactVerb !== null) {
    return (formatting + impactVerb) / 2;
  }
  if (formatting !== null) {
    return formatting;
  }
  if (impactVerb !== null) {
    return impactVerb;
  }
  return null;
}

/**
 * Completeness is always a number in [0, 100]: up to 50 points scale with the
 * resume text length (capped at 300 chars), 25 points when any analysis signal
 * is present, and 25 points when a college or degree is known.
 */
function deriveCompleteness(input: CandidateIntelligenceInput): number {
  const resumePart =
    input.resumeTextLength >= 300
      ? 50
      : Math.round((50 * input.resumeTextLength) / 300);

  const analysisPresent =
    input.ats !== null ||
    input.skills !== null ||
    input.experience !== null ||
    input.education !== null ||
    input.formatting !== null ||
    input.impactVerb !== null ||
    input.strengths.length > 0 ||
    input.weaknesses.length > 0 ||
    input.hiddenSkills.length > 0 ||
    input.keywordSuggestions.length > 0 ||
    input.summary !== null;

  const analysisPart = analysisPresent ? 25 : 0;
  const educationPart = input.college !== null || input.degree !== null ? 25 : 0;

  return clamp(resumePart + analysisPart + educationPart, 0, 100);
}

interface WeightedFactor {
  readonly key: RankingFactorKey;
  readonly label: string;
  readonly weightPercent: number;
  readonly value: number | null;
}

/**
 * Computes the full ranking breakdown for one candidate. `overallMatch` is the
 * weight-normalized mean over available factors; `confidence` reflects how much
 * of the total weight was actually available.
 */
export function computeRanking(input: CandidateIntelligenceInput): RankingBreakdown {
  const factors: readonly WeightedFactor[] = [
    { key: "ats", label: "ATS Score", weightPercent: RANKING_WEIGHTS.ats, value: input.ats },
    { key: "skills", label: "Skills Match", weightPercent: RANKING_WEIGHTS.skills, value: input.skills },
    { key: "experience", label: "Experience", weightPercent: RANKING_WEIGHTS.experience, value: input.experience },
    { key: "education", label: "Education", weightPercent: RANKING_WEIGHTS.education, value: input.education },
    {
      key: "resumeQuality",
      label: "Resume Quality",
      weightPercent: RANKING_WEIGHTS.resumeQuality,
      value: deriveResumeQuality(input),
    },
    {
      key: "completeness",
      label: "Profile Completeness",
      weightPercent: RANKING_WEIGHTS.completeness,
      value: deriveCompleteness(input),
    },
  ];

  let sumAvailableWeights = 0;
  let sumWeightedValues = 0;
  for (const factor of factors) {
    if (factor.value !== null) {
      sumAvailableWeights += factor.weightPercent;
      sumWeightedValues += factor.value * factor.weightPercent;
    }
  }

  // completeness is always numeric, so sumAvailableWeights >= 8 and is never 0.
  const overallMatch = Math.round(sumWeightedValues / sumAvailableWeights);
  const confidence = Math.round((100 * sumAvailableWeights) / 100);

  const weightedRows: readonly RankingFactorRow[] = factors.map((factor): RankingFactorRow => {
    const value = factor.value;
    return Object.freeze({
      key: factor.key,
      label: factor.label,
      weightPercent: factor.weightPercent,
      available: value !== null,
      value,
      contribution:
        value !== null ? Math.round((value * factor.weightPercent) / sumAvailableWeights) : 0,
    });
  });

  const unavailableRows: readonly RankingFactorRow[] = [
    unavailableRow("projects", "Projects"),
    unavailableRow("certifications", "Certifications"),
  ];

  return Object.freeze({
    rows: Object.freeze([...weightedRows, ...unavailableRows]),
    overallMatch,
    confidence,
  });
}

function unavailableRow(key: RankingFactorKey, label: string): RankingFactorRow {
  return Object.freeze({
    key,
    label,
    weightPercent: 0,
    available: false,
    value: null,
    contribution: 0,
  });
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
