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
import type { SubmissionPreviewRows } from "@/app/lib/types/assessment";

export interface SubmissionInputs {
  headers: string[];
  records: Record<string, string>[];
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

/** Results may number rows from 0 or from 1; the lowest index tells us which. */
function rowIndexOffset(rows: Record<string, unknown>[]): number {
  let lowest = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    const index = row.row_index;
    if (typeof index === "number" && index < lowest) lowest = index;
  }
  return Number.isFinite(lowest) ? Math.max(0, lowest) : 0;
}

// A source column can already be called `assessment_x`, so the prefixed name
// is not automatically free. Number it until it is, rather than overwrite it.
function freeKey(base: string, taken: Record<string, unknown>): string {
  if (!(base in taken)) return base;
  let suffix = 2;
  while (`${base}_${suffix}` in taken) suffix += 1;
  return `${base}_${suffix}`;
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
      merged[freeKey(`${ASSESSMENT_OUTPUT_KEY_PREFIX}${key}`, merged)] = value;
    }
    return merged;
  });
}

/** Column names one schema property flattens to, mirroring `flattenOutput`. */
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

/** Output columns in the schema's own order, so they stop shuffling per run. */
export function outputSchemaColumns(
  schema: Record<string, unknown> | null,
): string[] {
  const properties = schema?.properties;
  if (!isPlainObject(properties)) return [];
  return Object.keys(properties).flatMap((key) =>
    schemaPropertyColumns(key, properties[key], 0),
  );
}

/**
 * The order the sheet reads in: source columns, the pre-filter verdict that
 * explains an empty row, then the model's output as the schema declares it.
 * Anything unaccounted for keeps its discovered order at the end.
 */
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
