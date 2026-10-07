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
import { isPlainObject } from "@/app/lib/utils";
import type {
  AssessmentDetail,
  BatchItemOutput,
  BatchResultRow,
  FlatResultRow,
} from "@/app/lib/types/assessment";

const pick = (source: Record<string, unknown>, keys: readonly string[]) =>
  keys.map((key) => source[key]).find((value) => value !== undefined);

const asCell = (value: unknown): unknown =>
  Array.isArray(value) || isPlainObject(value) ? JSON.stringify(value) : value;

function writeScorePair(
  target: FlatResultRow,
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
  target: FlatResultRow,
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

    const safeKey = taken.has(key)
      ? `${ASSESSMENT_OUTPUT_KEY_PREFIX}${key}`
      : key;
    target[safeKey] = asCell(value);
  }
}

function writeAssessment(target: FlatResultRow, output: BatchItemOutput): void {
  const assessment = output.assessment;
  if (assessment === null || assessment === undefined) return;

  if (typeof assessment === "string") {
    target.assessment_output = assessment;
    return;
  }
  flattenOutput(target, assessment, new Set(Object.keys(target)));
}

function writePreFilter(target: FlatResultRow, output: BatchItemOutput): void {
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

export function flattenBatchRow(row: BatchResultRow): FlatResultRow {
  const flat: FlatResultRow = { ...(row.input ?? {}) };
  writePreFilter(flat, row.output);
  writeAssessment(flat, row.output);

  flat.row_index = row.row_index;
  flat.error = row.error ?? null;
  flat.result_status = rowStatus(row);
  return flat;
}

export function flattenBatchDetail(detail: AssessmentDetail): FlatResultRow[] {
  return detail.items.map(flattenBatchRow);
}
