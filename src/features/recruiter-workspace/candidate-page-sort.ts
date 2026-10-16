import type {
  CandidateDateCell,
  CandidateNameCell,
  CandidateRow,
  CandidateScoreCell,
  CandidateTextCell,
} from "./candidate-row-projection";

export const CANDIDATE_SORT_FIELDS = Object.freeze([
  "candidate",
  "ats",
  "appliedDate",
  "resume",
  "status",
] as const);

export type CandidateSortField = (typeof CANDIDATE_SORT_FIELDS)[number];

export const CANDIDATE_SORT_DIRECTIONS = Object.freeze(["asc", "desc"] as const);

export type CandidateSortDirection = (typeof CANDIDATE_SORT_DIRECTIONS)[number];

export interface CandidateSort {
  readonly field: CandidateSortField;
  readonly direction: CandidateSortDirection;
}

type SortValue =
  | { readonly valid: true; readonly value: string | number }
  | { readonly valid: false };

const INVALID_SORT_VALUE: SortValue = Object.freeze({ valid: false });

/**
 * Deterministically orders only the retrieved page. Sorting operates on the
 * projected rows and returns a new array, so it never mutates the input and
 * never touches the returned `total`, `page`, or `pageSize` pagination values.
 *
 * Unavailable values always sort after available ones in both directions, and
 * equal sort keys preserve the input order (a stable sort by original index).
 */
export function sortCandidatePage(
  rows: readonly CandidateRow[],
  sort: CandidateSort | null
): readonly CandidateRow[] {
  const normalizedSort = normalizeCandidateSort(sort);

  if (normalizedSort === null) {
    return Object.freeze(rows.slice());
  }

  const decorated = rows.map((row, index) => ({ row, index }));

  decorated.sort((left, right) => {
    const comparison = compareSortValues(
      getSortValue(left.row, normalizedSort.field),
      getSortValue(right.row, normalizedSort.field),
      normalizedSort.direction
    );

    return comparison !== 0 ? comparison : left.index - right.index;
  });

  return Object.freeze(decorated.map(({ row }) => row));
}

export function isCandidateSort(value: unknown): value is CandidateSort {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Object.keys(value).length === 2 &&
    Object.prototype.hasOwnProperty.call(value, "field") &&
    Object.prototype.hasOwnProperty.call(value, "direction") &&
    isCandidateSortField(value.field) &&
    isCandidateSortDirection(value.direction)
  );
}

export function isCandidateSortField(value: unknown): value is CandidateSortField {
  return (
    typeof value === "string" &&
    (CANDIDATE_SORT_FIELDS as readonly string[]).includes(value)
  );
}

export function isCandidateSortDirection(
  value: unknown
): value is CandidateSortDirection {
  return (
    typeof value === "string" &&
    (CANDIDATE_SORT_DIRECTIONS as readonly string[]).includes(value)
  );
}

function normalizeCandidateSort(value: unknown): CandidateSort | null {
  if (!isCandidateSort(value)) {
    return null;
  }

  return Object.freeze({ field: value.field, direction: value.direction });
}

function getSortValue(row: CandidateRow, field: CandidateSortField): SortValue {
  switch (field) {
    case "candidate":
      return textSortValue(row.candidate);
    case "ats":
      return scoreSortValue(row.ats);
    case "appliedDate":
      return dateSortValue(row.appliedDate);
    case "resume":
      return textSortValue(row.resume);
    case "status":
      return textSortValue(row.status);
    default:
      return assertNever(field);
  }
}

function textSortValue(cell: CandidateNameCell | CandidateTextCell): SortValue {
  return cell.available ? { valid: true, value: cell.comparable } : INVALID_SORT_VALUE;
}

function scoreSortValue(cell: CandidateScoreCell): SortValue {
  return cell.available ? { valid: true, value: cell.score } : INVALID_SORT_VALUE;
}

function dateSortValue(cell: CandidateDateCell): SortValue {
  return cell.available ? { valid: true, value: cell.timestamp } : INVALID_SORT_VALUE;
}

/**
 * Invalid/unavailable values are placed after valid values before direction is
 * applied, so they remain last for both ascending and descending sorts. Equal
 * valid values return 0 and defer to the caller's stable index tiebreak.
 */
function compareSortValues(
  left: SortValue,
  right: SortValue,
  direction: CandidateSortDirection
): number {
  if (!left.valid && !right.valid) {
    return 0;
  }

  if (!left.valid) {
    return 1;
  }

  if (!right.valid) {
    return -1;
  }

  const ascendingComparison = comparePrimitiveValues(left.value, right.value);
  return direction === "desc" ? -ascendingComparison : ascendingComparison;
}

function comparePrimitiveValues(left: string | number, right: string | number): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNever(value: never): never {
  throw new TypeError(`Unsupported candidate sort field: ${String(value)}`);
}
