"use client";

// Assessment Evaluations tab — shows run cards with status, retry, and CSV export.
import { Button, Select } from "@/app/components/ui";
import { RunsListSkeleton } from "@/app/components";
import { useToast } from "@/app/hooks/useToast";
import {
  DatabaseIcon,
  ClipboardIcon,
  RefreshIcon,
} from "@/app/components/icons";
import DataViewModal from "./DataViewModal";
import DownloadDropdown from "./DownloadDropdown";
import RunResultCard from "./RunResultCard";
import {
  canRetryStatus,
  formatStatusLabel,
  getResultTone,
} from "@/app/lib/assessment/results";
import {
  ASSESSMENT_CARD_CLASSES,
  STATUS_BADGE_CLASSES,
  STATUS_FILTER_OPTIONS,
} from "@/app/lib/assessment/constants";
import { formatRelativeTime } from "@/app/lib/utils";
import type { EvaluationsTabProps } from "@/app/lib/types/assessment";
import useAssessmentResults from "@/app/hooks/useAssessmentResults";

export default function EvaluationsTab({ onForbidden }: EvaluationsTabProps) {
  const toast = useToast();
  const {
    assessments,
    filteredRuns,
    childRunsByAssessment,
    configDetailsByKey,
    configLoadingKeys,
    configErrorKeys,
    isLoading,
    statusFilter,
    setStatusFilter,
    rerunningId,
    retryingAssessmentId,
    expandedId,
    downloadingId,
    previewLoading,
    previewModal,
    setPreviewModal,
    loadAssessments,
    handleExpand,
    handleRetryAssessment,
    handleRerun,
    handlePreview,
    handleAssessmentDownload,
    handleRunDownload,
  } = useAssessmentResults({ onForbidden, toast });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-secondary">
      <div className="flex-1 overflow-auto p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">
            Evaluation Runs
          </h2>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as typeof statusFilter)
              }
              options={STATUS_FILTER_OPTIONS}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={loadAssessments}
              disabled={isLoading}
              aria-label="Refresh assessments"
              className="!p-1.5 !rounded !rounded-md"
            >
              <RefreshIcon
                className={`w-4 h-4 -scale-x-100 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        <div className="rounded-lg overflow-visible bg-bg-primary shadow-sm">
          {isLoading && assessments.length === 0 && <RunsListSkeleton />}

          {!isLoading && assessments.length === 0 && (
            <div className="p-16 text-center">
              <ClipboardIcon className="w-12 h-12 mx-auto mb-3 text-border" />
              <p className="text-sm font-medium mb-1 text-text-primary">
                No evaluation runs yet
              </p>
              <p className="text-xs text-text-secondary">
                Submit an assessment from the Config tab to get started
              </p>
            </div>
          )}

          {assessments.length > 0 &&
            (filteredRuns.length > 0 ? (
              <div className="p-4 space-y-3">
                {filteredRuns.map((run) => {
                  const statusTone = getResultTone(run.status);
                  const statusClass = STATUS_BADGE_CLASSES[statusTone];
                  const isExpanded = expandedId === run.id;
                  const childRuns = childRunsByAssessment[run.id] || [];
                  const canRetryAssessment = canRetryStatus(run.status);
                  const isRetryingAssessment = retryingAssessmentId === run.id;
                  const hasCompletedRuns = run.completed_runs > 0;

                  return (
                    <div
                      key={run.id}
                      className={`rounded-lg overflow-hidden bg-bg-primary shadow-sm border-l-[3px] ${
                        ASSESSMENT_CARD_CLASSES[statusTone]
                      }`}
                    >
                      <div className="px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-text-primary">
                              {run.experiment_name}
                            </div>
                            <div className="mt-0.5 text-xs text-text-secondary">
                              {formatRelativeTime(run.inserted_at)}
                            </div>

                            {(run.status === "failed" ||
                              run.status === "completed_with_errors") &&
                              run.error_message && (
                                <div className="mt-2 text-xs wrap-break-word overflow-hidden text-status-error-text">
                                  {run.error_message}
                                </div>
                              )}
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide shrink-0 ${statusClass}`}
                          >
                            {formatStatusLabel(run.status)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4 mt-3">
                          <div className="flex items-center gap-3 text-xs text-text-secondary">
                            {run.dataset_name && (
                              <span className="flex items-center gap-1.5">
                                <DatabaseIcon className="shrink-0" />
                                {run.dataset_name}
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-bg-secondary">
                              {run.total_runs} configs
                            </span>
                            <span>{run.completed_runs} completed</span>
                            <span>
                              {run.processing_runs + run.pending_runs} active
                            </span>
                            {run.failed_runs > 0 && (
                              <span className="text-status-error-text">
                                {run.failed_runs} failed
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {hasCompletedRuns && (
                              <DownloadDropdown
                                onDownload={(fmt) =>
                                  handleAssessmentDownload(run.id, fmt)
                                }
                                disabled={!hasCompletedRuns}
                                loading={
                                  downloadingId === `assessment-${run.id}`
                                }
                              />
                            )}
                            {canRetryAssessment && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleRetryAssessment(run.id)}
                                disabled={isRetryingAssessment}
                              >
                                {isRetryingAssessment ? "Retrying..." : "Retry"}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleExpand(run.id)}
                            >
                              {isExpanded ? "Hide Details" : "View Results"}
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-5 space-y-3 border-t border-border pt-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-text-primary">
                                  Configurations in this assessment
                                </div>
                                <div className="mt-1 text-xs text-text-secondary">
                                  Each configuration keeps its own status,
                                  preview, and export actions.
                                </div>
                              </div>
                              <div className="rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                                {childRuns.length} run
                                {childRuns.length !== 1 ? "s" : ""}
                              </div>
                            </div>

                            {childRuns.length === 0 ? (
                              <div className="rounded-xl border border-border bg-bg-secondary">
                                <RunsListSkeleton count={2} />
                              </div>
                            ) : (
                              childRuns.map((childRun) => (
                                <RunResultCard
                                  key={childRun.id}
                                  childRun={childRun}
                                  configDetailsByKey={configDetailsByKey}
                                  configLoadingKeys={configLoadingKeys}
                                  configErrorKeys={configErrorKeys}
                                  rerunningId={rerunningId}
                                  previewLoading={previewLoading}
                                  downloadingId={downloadingId}
                                  onPreview={handlePreview}
                                  onDownload={handleRunDownload}
                                  onRerun={handleRerun}
                                />
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-16 text-center">
                <p className="text-sm font-medium mb-1 text-text-primary">
                  No {statusFilter} runs
                </p>
                <p className="text-xs text-text-secondary">
                  No evaluation runs with status &quot;{statusFilter}&quot;
                </p>
              </div>
            ))}
        </div>
      </div>

      {previewModal && (
        <DataViewModal
          title={previewModal.title}
          subtitle={`${previewModal.rows.length} rows · ${previewModal.headers.length} columns`}
          headers={previewModal.headers}
          rows={previewModal.rows}
          onClose={() => setPreviewModal(null)}
        />
      )}
    </div>
  );
}
