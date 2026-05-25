// Result status utilities: status checks, counts, filters, and label formatting for assessment runs.
import type {
  AssessmentRun,
  ResultTone,
  ResultsCounts,
  StatusFilter,
} from "@/app/lib/types/assessment";
import {
  ACTIVE_ASSESSMENT_STATUSES,
  COMPLETED_ASSESSMENT_STATUSES,
  FAILED_ASSESSMENT_STATUSES,
  SPREADSHEET_STATE_SCHEMA_VERSION,
  SPREADSHEET_STATE_STORAGE_PREFIX,
} from "@/app/lib/assessment/constants";

export function isActiveStatus(status: string): boolean {
  return ACTIVE_ASSESSMENT_STATUSES.has(status);
}

export function isFailedStatus(status: string): boolean {
  return FAILED_ASSESSMENT_STATUSES.has(status);
}

export function isCompletedStatus(status: string): boolean {
  return COMPLETED_ASSESSMENT_STATUSES.has(status);
}

export function canRetryStatus(status: string): boolean {
  return isFailedStatus(status);
}

export function getResultTone(status: string): ResultTone {
  if (isCompletedStatus(status)) return "success";
  if (status === "failed") return "error";
  if (isActiveStatus(status) || status === "completed_with_errors") {
    return "warning";
  }
  return "default";
}

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function getAsyncErrorMessage(action: string, error: unknown): string {
  return `${action}: ${error instanceof Error ? error.message : "Unknown error"}`;
}

export function getResultsCounts(assessments: AssessmentRun[]): ResultsCounts {
  return {
    total: assessments.length,
    processing: assessments.filter((run) => isActiveStatus(run.status)).length,
    completed: assessments.filter((run) => isCompletedStatus(run.status))
      .length,
    failed: assessments.filter((run) => isFailedStatus(run.status)).length,
  };
}

export function filterAssessments(
  assessments: AssessmentRun[],
  statusFilter: StatusFilter,
): AssessmentRun[] {
  if (statusFilter === "all") return assessments;

  return assessments.filter((run) => {
    if (statusFilter === "processing") return isActiveStatus(run.status);
    if (statusFilter === "failed") return isFailedStatus(run.status);
    return run.status === statusFilter;
  });
}

export const PREVIEW_ROW_LIMIT = 10;

export function spreadsheetStorageKey(runId: number): string {
  return `${SPREADSHEET_STATE_STORAGE_PREFIX}${runId}`;
}

type SpreadsheetStateEnvelope = {
  v: number;
  ts: number;
  data: object;
};

export function loadSpreadsheetState(runId: number): object | null {
  try {
    const raw = localStorage.getItem(spreadsheetStorageKey(runId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SpreadsheetStateEnvelope>;
    if (parsed?.v !== SPREADSHEET_STATE_SCHEMA_VERSION || !parsed.data) {
      // schema mismatch — discard so we don't hand stale shape to Univer
      localStorage.removeItem(spreadsheetStorageKey(runId));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

// Evict oldest spreadsheet-state entries until below `keep` count.
function evictOldestSpreadsheetStates(keep: number): void {
  const entries: Array<{ key: string; ts: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(SPREADSHEET_STATE_STORAGE_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<SpreadsheetStateEnvelope>;
      entries.push({ key, ts: parsed?.ts ?? 0 });
    } catch {
      // malformed — treat as oldest so it gets dropped first
      entries.push({ key, ts: 0 });
    }
  }
  entries.sort((a, b) => a.ts - b.ts);
  const toDrop = Math.max(0, entries.length - keep);
  for (let i = 0; i < toDrop; i++) {
    localStorage.removeItem(entries[i].key);
  }
}

export function persistSpreadsheetState(runId: number, data: object): void {
  const envelope: SpreadsheetStateEnvelope = {
    v: SPREADSHEET_STATE_SCHEMA_VERSION,
    ts: Date.now(),
    data,
  };
  const key = spreadsheetStorageKey(runId);
  const payload = JSON.stringify(envelope);
  try {
    localStorage.setItem(key, payload);
  } catch (err) {
    // Quota exceeded — drop oldest sheets (keep current) and retry once
    const isQuota =
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED");
    if (!isQuota) return;
    try {
      localStorage.removeItem(key);
      evictOldestSpreadsheetStates(5);
      localStorage.setItem(key, payload);
    } catch {
      // still failing — give up silently; in-memory state remains intact
    }
  }
}

type SpreadsheetCellEntry = { v: string | number; t: number; s?: object };

export function buildSpreadsheetWorkbookData(
  headers: string[],
  rows: string[][],
) {
  const cellData: Record<number, Record<number, SpreadsheetCellEntry>> = {};

  cellData[0] = {};
  headers.forEach((h, col) => {
    cellData[0][col] = {
      v: h,
      t: 1,
      s: { bl: 1, bg: { rgb: "#EFF6FF" }, cl: { rgb: "#1E40AF" } },
    };
  });

  rows.forEach((row, rowIdx) => {
    cellData[rowIdx + 1] = {};
    row.forEach((cell, col) => {
      const numVal = Number(cell);
      const isNum = cell.trim() !== "" && !isNaN(numVal) && isFinite(numVal);
      cellData[rowIdx + 1][col] = isNum
        ? { v: numVal, t: 2 }
        : { v: cell, t: 1 };
    });
  });

  return {
    id: "assessment-results",
    locale: "enUS",
    name: "Assessment Results",
    appVersion: "0.5.0",
    sheets: {
      sheet1: {
        id: "sheet1",
        name: "Results",
        cellData,
        rowCount: Math.max(rows.length + 1, 100),
        columnCount: Math.max(headers.length, 26),
      },
    },
    styles: {},
  };
}

export function jsonResultsToTableData(
  results: Record<string, unknown>[],
  opts?: { skipFields?: Set<string>; rowLimit?: number },
): { headers: string[]; rows: string[][] } {
  if (results.length === 0) return { headers: [], rows: [] };

  const skipFields =
    opts?.skipFields ??
    new Set([
      "assessment_id",
      "dataset_id",
      "dataset_name",
      "run_id",
      "run_name",
      "run_status",
      "config_id",
      "config_version",
      "response_id",
      "input_tokens",
      "output_tokens",
      "total_tokens",
      "updated_at",
      "result_status",
      "error",
      "row_id",
      "experiment_name",
    ]);

  const allKeys = Array.from(new Set(results.flatMap((r) => Object.keys(r))));
  const displayKeys = allKeys.filter((k) => !skipFields.has(k));

  const nonEmptyKeys = displayKeys.filter((key) =>
    results.some((r) => {
      const v = r[key];
      return v != null && String(v).trim() !== "";
    }),
  );

  const limited =
    opts?.rowLimit != null ? results.slice(0, opts.rowLimit) : results;

  const rows = limited.map((r) =>
    nonEmptyKeys.map((key) => {
      const v = r[key];
      if (v == null) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return String(v);
    }),
  );

  return { headers: nonEmptyKeys, rows };
}
