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
