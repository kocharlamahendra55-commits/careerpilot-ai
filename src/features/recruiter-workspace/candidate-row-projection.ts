import type { CandidateApplicationListItem } from "./candidate-query";
import {
  getCandidateDetailEnrichment,
  type CandidateDetailCache,
  type CandidateDetailEnrichment,
} from "./candidate-detail-cache";

/**
 * Why a cell has no value:
 * - `unavailable-source`: the list response itself omitted or malformed the value.
 * - `unavailable-in-list-data`: ATS/resume are never in the list response and no
 *   matching same-ID detail has been retrieved to supply them (D3).
 */
export type CandidateCellUnavailableReason =
  | "unavailable-source"
  | "unavailable-in-list-data";

export type CandidateNameOrigin = "student-full-name" | "user-email";

export interface CandidateNameCellAvailable {
  readonly available: true;
  readonly origin: CandidateNameOrigin;
  readonly text: string;
  readonly comparable: string;
}

export interface CandidateTextCellAvailable {
  readonly available: true;
  readonly text: string;
  readonly comparable: string;
}

export interface CandidateScoreCellAvailable {
  readonly available: true;
  readonly score: number;
}

export interface CandidateDateCellAvailable {
  readonly available: true;
  readonly iso: string;
  readonly timestamp: number;
}

export interface CandidateCellUnavailable {
  readonly available: false;
  readonly reason: CandidateCellUnavailableReason;
}

export type CandidateNameCell = CandidateNameCellAvailable | CandidateCellUnavailable;
export type CandidateTextCell = CandidateTextCellAvailable | CandidateCellUnavailable;
export type CandidateScoreCell = CandidateScoreCellAvailable | CandidateCellUnavailable;
export type CandidateDateCell = CandidateDateCellAvailable | CandidateCellUnavailable;

/**
 * A fully projected Candidate table row. Every cell is either an exact
 * source-backed value or an explicit unavailability marker; no identity, ATS,
 * filename, date, or status is ever fabricated.
 */
export interface CandidateRow {
  readonly applicationId: string;
  readonly candidate: CandidateNameCell;
  readonly ats: CandidateScoreCell;
  readonly appliedDate: CandidateDateCell;
  readonly resume: CandidateTextCell;
  readonly status: CandidateTextCell;
}

/**
 * Projects one list item into a row. Candidate/Applied Date/Status come only
 * from the list item; ATS and Resume come only from `enrichment`, which must be
 * the detail of the same application ID (or null when none has been retrieved).
 */
export function projectCandidateRow(
  item: CandidateApplicationListItem,
  enrichment: CandidateDetailEnrichment | null
): CandidateRow {
  return Object.freeze({
    applicationId: item.id,
    candidate: projectCandidateName(item),
    ats: projectAts(enrichment),
    appliedDate: projectAppliedDate(item.createdAt),
    resume: projectResume(enrichment),
    status: projectStatus(item.status),
  });
}

/**
 * Projects a page of list items, enriching each row only with a same-ID detail
 * cache entry. A row without a matching successful detail keeps its ATS/resume
 * cells unavailable rather than borrowing another application's values.
 */
export function projectCandidateRows(
  items: readonly CandidateApplicationListItem[],
  cache: CandidateDetailCache
): readonly CandidateRow[] {
  return Object.freeze(
    items.map((item) =>
      projectCandidateRow(item, getCandidateDetailEnrichment(cache, item.id))
    )
  );
}

function projectCandidateName(item: CandidateApplicationListItem): CandidateNameCell {
  const fullName = readAvailableText(item.fullName);
  if (fullName !== null) {
    return Object.freeze({
      available: true,
      origin: "student-full-name",
      text: fullName.text,
      comparable: fullName.comparable,
    });
  }

  const email = readAvailableText(item.email);
  if (email !== null) {
    return Object.freeze({
      available: true,
      origin: "user-email",
      text: email.text,
      comparable: email.comparable,
    });
  }

  return unavailable("unavailable-source");
}

function projectStatus(status: string | null): CandidateTextCell {
  const text = readAvailableText(status);
  return text === null
    ? unavailable("unavailable-source")
    : Object.freeze({ available: true, text: text.text, comparable: text.comparable });
}

function projectAppliedDate(createdAt: string | null): CandidateDateCell {
  if (typeof createdAt !== "string") {
    return unavailable("unavailable-source");
  }

  const trimmed = createdAt.trim();
  if (trimmed.length === 0) {
    return unavailable("unavailable-source");
  }

  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) {
    return unavailable("unavailable-source");
  }

  return Object.freeze({ available: true, iso: createdAt, timestamp });
}

function projectAts(enrichment: CandidateDetailEnrichment | null): CandidateScoreCell {
  if (
    enrichment !== null &&
    typeof enrichment.atsScore === "number" &&
    Number.isFinite(enrichment.atsScore)
  ) {
    return Object.freeze({ available: true, score: enrichment.atsScore });
  }

  return unavailable("unavailable-in-list-data");
}

function projectResume(enrichment: CandidateDetailEnrichment | null): CandidateTextCell {
  const filename = enrichment !== null ? readAvailableText(enrichment.resumeFilename) : null;
  if (filename === null) {
    return unavailable("unavailable-in-list-data");
  }

  return Object.freeze({
    available: true,
    text: filename.text,
    comparable: filename.comparable,
  });
}

/** Keeps the exact source text for display and a normalized key for sorting. */
function readAvailableText(
  value: unknown
): { readonly text: string; readonly comparable: string } | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return { text: value, comparable: value.trim().toLowerCase() };
}

function unavailable(reason: CandidateCellUnavailableReason): CandidateCellUnavailable {
  return Object.freeze({ available: false, reason });
}
