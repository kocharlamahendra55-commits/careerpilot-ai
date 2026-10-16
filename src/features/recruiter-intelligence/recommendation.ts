import type { RecommendationLevel } from "./types";

/**
 * Maps an overall match score to a recommendation level using fixed, inclusive
 * lower bounds: >= 85 highly recommended, >= 70 recommended, >= 50 consider,
 * otherwise low match. The thresholds are the single source of truth shared by
 * the insight sentence and every consumer that reasons about recommendations.
 */
export function getRecommendation(overallMatch: number): RecommendationLevel {
  if (overallMatch >= 85) {
    return "HIGHLY_RECOMMENDED";
  }
  if (overallMatch >= 70) {
    return "RECOMMENDED";
  }
  if (overallMatch >= 50) {
    return "CONSIDER";
  }
  return "LOW_MATCH";
}

/** Human-readable labels for each recommendation level. */
export const RECOMMENDATION_LABELS: Readonly<Record<RecommendationLevel, string>> =
  Object.freeze({
    HIGHLY_RECOMMENDED: "Highly Recommended",
    RECOMMENDED: "Recommended",
    CONSIDER: "Consider",
    LOW_MATCH: "Low Match",
  });

/**
 * A total ordering over the levels (higher is stronger) so predicates such as
 * "at least recommended" can be expressed without hard-coding string checks.
 */
export const RECOMMENDATION_ORDER: Readonly<Record<RecommendationLevel, number>> =
  Object.freeze({
    LOW_MATCH: 0,
    CONSIDER: 1,
    RECOMMENDED: 2,
    HIGHLY_RECOMMENDED: 3,
  });

export function getRecommendationLabel(level: RecommendationLevel): string {
  return RECOMMENDATION_LABELS[level];
}

/** True when `level` is at least as strong as `minimum`. */
export function isRecommendationAtLeast(
  level: RecommendationLevel,
  minimum: RecommendationLevel
): boolean {
  return RECOMMENDATION_ORDER[level] >= RECOMMENDATION_ORDER[minimum];
}
