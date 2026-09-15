/**
 * Flattens the nested BATCH result into the wide row the results table and detail
 * modal already read. No React, no network.
 *
 * Kept on this side deliberately: `output.assessment` keys come from the user's own
 * json_output_schema, and the `X_score`/`X_reason` pairing is this UI's convention,
 * not something to freeze into a public API contract.
 */
import {
  ASSESSMENT_OUTPUT_KEY_PREFIX,
  MAX_OUTPUT_FLATTEN_DEPTH,
  REASON_OBJECT_KEYS,
  RESULT_REASON_SUFFIX,
  RESULT_SCORE_SUFFIX,
  SCORE_OBJECT_KEYS,
  PREFILTER_DECISION_KEY,
  PREFILTER_REASONING_KEY,
} from "@/app/lib/assessment/constants";
import type {
  AssessmentDetail,
  BatchItemOutput,
  BatchResultRow,
} from "@/app/lib/types/assessment";

type FlatRow = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const pick = (source: Record<string, unknown>, keys: readonly string[]) =>
  keys.map((key) => source[key]).find((value) => value !== undefined);

const asCell = (value: unknown): unknown =>
  Array.isArray(value) || isPlainObject(value) ? JSON.stringify(value) : value;

/** `{score, reason}` under one key becomes the `X_score` / `X_reason` pair. */
function writeScorePair(
  target: FlatRow,
  key: string,
  value: Record<string, unknown>,
): boolean {
  const score = pick(value, SCORE_OBJECT_KEYS);
  if (score === undefined) return false;

  target[`${key}${RESULT_SCORE_SUFFIX}`] = score;
  const reason = pick(value, REASON_OBJECT_KEYS);
  if (reason !== undefined) {
    target[`${key}${RESULT_REASON_SUFFIX}`] = reason;
  }
  return true;
}

function flattenOutput(
  target: FlatRow,
  output: Record<string, unknown>,
  taken: Set<string>,
  prefix = "",
  depth = 0,
): void {
  for (const [rawKey, value] of Object.entries(output)) {
    const key = `${prefix}${rawKey}`;

    if (isPlainObject(value)) {
      if (writeScorePair(target, key, value)) continue;
      if (depth < MAX_OUTPUT_FLATTEN_DEPTH) {
        flattenOutput(target, value, taken, `${key}_`, depth + 1);
        continue;
      }
    }

    // An output key colliding with an input column keeps both, prefixed.
    const safeKey = taken.has(key)
      ? `${ASSESSMENT_OUTPUT_KEY_PREFIX}${key}`
      : key;
    target[safeKey] = asCell(value);
  }
}

function writeAssessment(target: FlatRow, output: BatchItemOutput): void {
  const assessment = output.assessment;
  if (assessment === null || assessment === undefined) return;

  if (typeof assessment === "string") {
    target.assessment_output = assessment;
    return;
  }
  flattenOutput(target, assessment, new Set(Object.keys(target)));
}

function writePreFilter(target: FlatRow, output: BatchItemOutput): void {
  const verdict = output.pre_filter?.topic_relevance;
  if (!verdict) return;

  target[PREFILTER_DECISION_KEY] = verdict.verdict ? "pass" : "fail";
  target[PREFILTER_REASONING_KEY] = verdict.reasoning;
}

function rowStatus(row: BatchResultRow): string {
  if (row.error) return "error";
  if (row.output.pre_filter?.topic_relevance?.verdict === false)
    return "filtered";
  return row.output.assessment == null ? "processing" : "assessed";
}

/** One flat record per row: input columns first, then verdicts, then the output. */
export function flattenBatchRow(row: BatchResultRow): FlatRow {
  const flat: FlatRow = { ...(row.input ?? {}) };
  writePreFilter(flat, row.output);
  writeAssessment(flat, row.output);

  flat.row_index = row.row_index;
  flat.error = row.error ?? null;
  flat.result_status = rowStatus(row);
  return flat;
}

export function flattenBatchDetail(detail: AssessmentDetail): FlatRow[] {
  return detail.items.map(flattenBatchRow);
}
