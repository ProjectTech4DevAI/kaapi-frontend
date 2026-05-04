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
