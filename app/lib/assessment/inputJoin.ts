import {
  ASSESSMENT_OUTPUT_KEY_PREFIX,
  MAX_OUTPUT_FLATTEN_DEPTH,
  PREFILTER_DECISION_KEY,
  PREFILTER_REASONING_KEY,
  REASON_OBJECT_KEYS,
  RESULT_REASON_SUFFIX,
  RESULT_SCORE_SUFFIX,
  SCORE_OBJECT_KEYS,
} from "@/app/lib/assessment/constants";
import { isPlainObject } from "@/app/lib/utils";
import type {
  SubmissionInputs,
  SubmissionPreviewRows,
} from "@/app/lib/types/assessment";

export function previewToInputs(
  preview: SubmissionPreviewRows | undefined,
): SubmissionInputs {
  const headers = preview?.headers ?? [];
  const rows = preview?.rows ?? [];
  if (headers.length === 0) return { headers: [], records: [] };

  const records = rows.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, column) => {
      record[header] = row[column] ?? "";
    });
    return record;
  });
  return { headers, records };
}

function rowIndexOffset(rows: Record<string, unknown>[]): number {
  let lowest = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    const index = row.row_index;
    if (typeof index === "number" && index < lowest) lowest = index;
  }
  return Number.isFinite(lowest) ? Math.max(0, lowest) : 0;
}

export function mergeSubmissionInputs(
  rows: Record<string, unknown>[],
  inputs: SubmissionInputs,
): Record<string, unknown>[] {
  if (inputs.records.length === 0) return rows;
  const offset = rowIndexOffset(rows);

  return rows.map((row) => {
    const index = typeof row.row_index === "number" ? row.row_index : -1;
    const source = index < 0 ? undefined : inputs.records[index - offset];
    if (!source) return row;

    const merged: Record<string, unknown> = { ...source };
    for (const [key, value] of Object.entries(row)) {
      if (!(key in merged)) {
        merged[key] = value;
        continue;
      }
      if (String(merged[key]) === String(value ?? "")) continue;
      merged[`${ASSESSMENT_OUTPUT_KEY_PREFIX}${key}`] = value;
    }
    return merged;
  });
}

function schemaPropertyColumns(
  key: string,
  property: unknown,
  depth: number,
): string[] {
  if (!isPlainObject(property)) return [key];

  const nested = property.properties;
  if (!isPlainObject(nested)) return [key];

  const nestedKeys = Object.keys(nested);
  const hasScore = SCORE_OBJECT_KEYS.some((name) => nestedKeys.includes(name));
  if (hasScore) {
    const columns = [`${key}${RESULT_SCORE_SUFFIX}`];
    if (REASON_OBJECT_KEYS.some((name) => nestedKeys.includes(name))) {
      columns.push(`${key}${RESULT_REASON_SUFFIX}`);
    }
    return columns;
  }

  if (depth >= MAX_OUTPUT_FLATTEN_DEPTH) return [key];
  return nestedKeys.flatMap((nestedKey) =>
    schemaPropertyColumns(`${key}_${nestedKey}`, nested[nestedKey], depth + 1),
  );
}

export function outputSchemaColumns(
  schema: Record<string, unknown> | null,
): string[] {
  const properties = schema?.properties;
  if (!isPlainObject(properties)) return [];
  return Object.keys(properties).flatMap((key) =>
    schemaPropertyColumns(key, properties[key], 0),
  );
}

export function buildColumnOrder(
  submissionHeaders: string[],
  outputSchema: Record<string, unknown> | null,
): string[] {
  return [
    ...submissionHeaders,
    PREFILTER_DECISION_KEY,
    PREFILTER_REASONING_KEY,
    ...outputSchemaColumns(outputSchema),
  ];
}
