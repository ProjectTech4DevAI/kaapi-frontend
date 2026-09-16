/**
 * Reads one result row for the detail view: pairs `X_score` with `X_reason`,
 * separates the long-form text fields from the short ones, and picks out
 * document links. Pure — the modal only renders what this returns.
 */
import {
  RESULT_REASON_SUFFIX,
  RESULT_SCORE_SUFFIX,
} from "@/app/lib/assessment/constants";

export interface ResultScore {
  metric: string;
  score: string;
  reason: string;
}

export interface ResultField {
  label: string;
  value: string;
}

export interface ResultRowDetail {
  scores: ResultScore[];
  longText: ResultField[];
  meta: ResultField[];
  documents: string[];
}

const SCORE_SUFFIX = RESULT_SCORE_SUFFIX;
const REASON_SUFFIX = RESULT_REASON_SUFFIX;
const LONG_TEXT_MIN = 160;
const DOCUMENT_KEYS = ["documents", "document", "attachments"];
const HIDDEN_KEYS = new Set([
  "run_id",
  "run_name",
  "assessment_id",
  "dataset_id",
  "dataset_name",
  "config_id",
  "config_version",
  "response_id",
  "row_id",
  "row_index",
  "result_status",
  "error",
]);

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

const humanize = (key: string) => key.replace(/_/g, " ");

function documentLinks(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(asText).filter(Boolean);
  return asText(value)
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function readResultRow(row: Record<string, unknown>): ResultRowDetail {
  const scores: ResultScore[] = [];
  const longText: ResultField[] = [];
  const meta: ResultField[] = [];
  let documents: string[] = [];

  Object.entries(row).forEach(([key, raw]) => {
    const lower = key.toLowerCase();
    if (HIDDEN_KEYS.has(lower) || key.endsWith(REASON_SUFFIX)) return;

    if (DOCUMENT_KEYS.includes(lower)) {
      documents = documentLinks(raw);
      return;
    }

    if (key.endsWith(SCORE_SUFFIX)) {
      const metric = key.slice(0, -SCORE_SUFFIX.length);
      scores.push({
        metric: humanize(metric),
        score: asText(raw),
        reason: asText(row[`${metric}${REASON_SUFFIX}`]),
      });
      return;
    }

    const value = asText(raw);
    if (!value) return;
    const field = { label: humanize(key), value };
    if (value.length >= LONG_TEXT_MIN) longText.push(field);
    else meta.push(field);
  });

  return { scores, longText, meta, documents };
}

/** A short, human title for the row — its first identifying text field. */
export function resultRowTitle(row: Record<string, unknown>): string {
  const candidates = ["title", "name", "cid", "id"];
  for (const key of candidates) {
    const match = Object.keys(row).find((item) => item.toLowerCase() === key);
    if (match && asText(row[match])) return asText(row[match]);
  }
  return "Submission";
}
