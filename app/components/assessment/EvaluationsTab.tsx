"use client";

// Evaluations tab for the Assessment page. Displays assessment run cards with status,
// supports retry via /api/assessment/assessments/:id/retry, and exports results via
// /api/assessment/assessments/:id/results.
import { useEffect, useRef, useState } from "react";
import { Button, RunsListSkeleton } from "@/app/components";
import Select from "@/app/components/Select";
import { useToast } from "@/app/components/Toast";
import {
  DatabaseIcon,
  ClipboardIcon,
  ChevronDownIcon,
  EyeIcon,
  RefreshIcon,
} from "@/app/components/icons";
import DownloadIcon from "@/app/components/icons/assessment/DownloadIcon";
import DataViewModal from "./DataViewModal";
import {
  canRetryStatus,
  formatStatusLabel,
  getResultTone,
  isCompletedStatus,
  isFailedStatus,
} from "@/app/lib/assessment/results";
import {
  ASSESSMENT_CARD_CLASSES,
  STATUS_BADGE_CLASSES,
  STATUS_FILTER_OPTIONS,
} from "@/app/lib/assessment/constants";
import { formatRelativeTime } from "@/app/lib/utils";
import type {
  EvaluationsTabProps,
  ExportFormat,
} from "@/app/lib/types/assessment";

interface LoadingSpinnerProps {
  className: string;
  centered?: boolean;
}

interface DownloadDropdownProps {
  onDownload: (format: ExportFormat) => void;
  disabled?: boolean;
  loading?: boolean;
}
import useAssessmentResults from "./results/useAssessmentResults";

function LoadingSpinner({ className, centered = false }: LoadingSpinnerProps) {
  return (
    <div
      className={`${className} rounded-full border-2 border-accent-primary border-t-transparent animate-spin ${
        centered ? "mx-auto" : ""
      }`}
    />
  );
}

function DownloadDropdown({
  onDownload,
  disabled,
  loading,
}: DownloadDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        disabled={disabled || loading}
        className="!rounded-md !px-2.5 !py-1.5 !text-xs"
        aria-label="Download results"
        aria-expanded={open}
      >
        {loading ? (
          <LoadingSpinner className="w-3.5 h-3.5" />
        ) : (
          <DownloadIcon className="w-3.5 h-3.5" />
        )}
        Export
        <ChevronDownIcon className="w-3 h-3" />
      </Button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-36 rounded-md border border-border bg-bg-primary py-1 shadow-lg">
          {(
            [
              ["csv", "CSV File"],
              ["xlsx", "Excel Sheet"],
            ] as const
          ).map(([fmt, label]) => (
            <Button
              key={fmt}
              type="button"
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => {
                onDownload(fmt);
                setOpen(false);
              }}
              className="!justify-start !rounded-none !px-3 !py-2 !text-xs !text-text-primary"
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

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
            <button
              type="button"
              onClick={loadAssessments}
              disabled={isLoading}
              className="p-1.5 rounded text-text-secondary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh assessments"
            >
              <RefreshIcon
                className={`w-4 h-4 -scale-x-100 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
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
                              childRuns.map((childRun) => {
                                const childStatusClass =
                                  STATUS_BADGE_CLASSES[
                                    getResultTone(childRun.status)
                                  ];
                                const isFailedChild = isFailedStatus(
                                  childRun.status,
                                );
                                const isCompletedChild = isCompletedStatus(
                                  childRun.status,
                                );
                                const isRerunning = rerunningId === childRun.id;
                                const configKey =
                                  childRun.config_id && childRun.config_version
                                    ? `${childRun.config_id}:${childRun.config_version}`
                                    : null;
                                const configDetail = configKey
                                  ? configDetailsByKey[configKey]
                                  : null;
                                const isConfigLoading = configKey
                                  ? Boolean(configLoadingKeys[configKey])
                                  : false;
                                const configError = configKey
                                  ? configErrorKeys[configKey]
                                  : null;
                                const fallbackName = childRun.config_id
                                  ? `Config ${childRun.config_id.slice(0, 8)}`
                                  : "Configuration";
                                const configName =
                                  configDetail?.name || fallbackName;
                                const previewLabel = `${configName}${childRun.config_version ? ` v${childRun.config_version}` : ""}`;

                                return (
                                  <div
                                    key={childRun.id}
                                    className="rounded-xl border border-border bg-bg-secondary p-4"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-sm font-semibold text-text-primary">
                                            {configName}
                                          </span>
                                          {childRun.config_version !== null && (
                                            <span className="rounded-full bg-bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                                              v{childRun.config_version}
                                            </span>
                                          )}
                                          {configDetail?.provider &&
                                            configDetail?.model && (
                                              <span className="rounded-full bg-bg-primary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                                                {configDetail.provider}/
                                                {configDetail.model}
                                              </span>
                                            )}
                                        </div>

                                        <div className="mt-1 text-sm text-text-secondary">
                                          {isConfigLoading
                                            ? "Loading configuration details..."
                                            : configDetail?.description ||
                                              configDetail?.commitMessage ||
                                              "No description available for this configuration."}
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                                          <span>
                                            {childRun.total_items} items
                                          </span>
                                          {childRun.updated_at && (
                                            <span>
                                              {formatRelativeTime(
                                                childRun.updated_at,
                                              )}
                                            </span>
                                          )}
                                          {childRun.config_id && (
                                            <span className="font-mono">
                                              ID{" "}
                                              {childRun.config_id.slice(0, 8)}
                                            </span>
                                          )}
                                        </div>

                                        {configError && (
                                          <div className="mt-2 text-xs text-status-error-text">
                                            {configError}
                                          </div>
                                        )}
                                        {isFailedChild &&
                                          childRun.error_message && (
                                            <div className="mt-2 text-xs text-status-error-text">
                                              {childRun.error_message}
                                            </div>
                                          )}
                                      </div>

                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span
                                          className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${childStatusClass}`}
                                        >
                                          {formatStatusLabel(childRun.status)}
                                        </span>
                                        {isCompletedChild && (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              handlePreview(
                                                childRun.id,
                                                previewLabel,
                                              )
                                            }
                                            disabled={
                                              previewLoading === childRun.id
                                            }
                                            className={`!rounded-md !px-2.5 !py-1.5 !text-xs ${
                                              previewLoading === childRun.id
                                                ? "opacity-50"
                                                : ""
                                            }`}
                                          >
                                            {previewLoading === childRun.id ? (
                                              <LoadingSpinner className="w-3.5 h-3.5" />
                                            ) : (
                                              <EyeIcon className="w-3.5 h-3.5" />
                                            )}
                                            Preview
                                          </Button>
                                        )}
                                        {isCompletedChild && (
                                          <DownloadDropdown
                                            onDownload={(fmt) =>
                                              handleRunDownload(
                                                childRun.id,
                                                fmt,
                                              )
                                            }
                                            loading={
                                              downloadingId ===
                                              `run-${childRun.id}`
                                            }
                                          />
                                        )}
                                        {isFailedChild && (
                                          <Button
                                            type="button"
                                            size="sm"
                                            onClick={() =>
                                              handleRerun(childRun)
                                            }
                                            disabled={isRerunning}
                                            className="!rounded-lg !px-3 !py-1.5 !text-xs"
                                          >
                                            {isRerunning
                                              ? "Re-running..."
                                              : "Re-run"}
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
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
