"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/components";
import { useToast } from "@/app/components/Toast";
import {
  DatabaseIcon,
  ClipboardIcon,
  ChevronDownIcon,
  EyeIcon,
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
} from "@/app/lib/assessment/constants";
import { formatRelativeTime } from "@/app/lib/utils";
import type {
  DownloadDropdownProps,
  EvaluationsTabProps,
  LoadingSpinnerProps,
} from "@/app/lib/types/assessment";
import ResultsHeader from "./results/ResultsHeader";
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

export default function EvaluationsTab({
  apiKey,
  onForbidden,
}: EvaluationsTabProps) {
  const toast = useToast();
  const {
    assessments,
    counts,
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
  } = useAssessmentResults({ apiKey, onForbidden, toast });

  return (
    <div className="flex-1 overflow-auto">
      <ResultsHeader
        counts={counts}
        statusFilter={statusFilter}
        isLoading={isLoading}
        onStatusFilterChange={setStatusFilter}
        onRefresh={loadAssessments}
      />

      <div className="p-6">
        {isLoading && assessments.length === 0 ? (
          <div className="py-16 text-center">
            <LoadingSpinner className="w-6 h-6 mb-3" centered />
            <p className="text-sm text-text-secondary">
              Loading assessments...
            </p>
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="py-16 text-center">
            <span className="block mx-auto mb-3 h-12 w-12 text-border">
              <ClipboardIcon className="w-12 h-12" />
            </span>
            <p className="mb-1 text-sm font-medium text-text-primary">
              {statusFilter === "all"
                ? "No assessments yet"
                : `No ${statusFilter} assessments`}
            </p>
            <p className="text-xs text-text-secondary">
              {statusFilter === "all"
                ? "Submit an assessment from the Config tab to get started"
                : "Try changing the status filter"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
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
                  className={`rounded-xl border border-border border-l-[3px] bg-bg-primary shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow ${
                    ASSESSMENT_CARD_CLASSES[statusTone]
                  }`}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="truncate text-sm font-bold text-text-primary">
                            {run.experiment_name}
                          </span>
                          <span className="flex-shrink-0 rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                            {run.total_runs} configs
                          </span>
                        </div>

                        <div className="mb-3 text-xs text-text-secondary">
                          {formatRelativeTime(run.inserted_at)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {run.dataset_name && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-secondary px-2.5 py-1 text-xs text-text-secondary">
                              <DatabaseIcon className="w-3.5 h-3.5 flex-shrink-0" />
                              {run.dataset_name}
                            </span>
                          )}

                          <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-xs text-text-secondary">
                            {run.completed_runs} completed
                          </span>
                          <span className="rounded-full bg-bg-secondary px-2.5 py-1 text-xs text-text-secondary">
                            {run.processing_runs + run.pending_runs} active
                          </span>
                          {run.failed_runs > 0 && (
                            <span className="rounded-full bg-status-error-bg px-2.5 py-1 text-xs text-status-error-text">
                              {run.failed_runs} failed
                            </span>
                          )}
                        </div>

                        {(run.status === "failed" ||
                          run.status === "completed_with_errors") &&
                          run.error_message && (
                            <div className="mt-2 rounded-md bg-status-error-bg px-3 py-2 text-xs text-status-error-text">
                              {run.error_message}
                            </div>
                          )}
                      </div>

                      <div className="flex flex-col items-end gap-3 flex-shrink-0">
                        <span
                          className={`rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusClass}`}
                        >
                          {formatStatusLabel(run.status)}
                        </span>

                        <div className="flex items-center gap-2">
                          {hasCompletedRuns && (
                            <DownloadDropdown
                              onDownload={(fmt) =>
                                handleAssessmentDownload(run.id, fmt)
                              }
                              disabled={!hasCompletedRuns}
                              loading={downloadingId === `assessment-${run.id}`}
                            />
                          )}
                          {canRetryAssessment && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleRetryAssessment(run.id)}
                              disabled={isRetryingAssessment}
                              className="!rounded-lg !px-3 !py-1.5 !text-xs"
                            >
                              {isRetryingAssessment ? "Retrying..." : "Retry"}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleExpand(run.id)}
                            className={`!rounded-lg !px-3 !py-1.5 !text-xs ${
                              isExpanded
                                ? "!bg-bg-secondary"
                                : "!bg-transparent"
                            }`}
                          >
                            {isExpanded ? "Hide details" : "View details"}
                          </Button>
                        </div>
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
                              Each configuration keeps its own status, preview,
                              and export actions.
                            </div>
                          </div>
                          <div className="rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                            {childRuns.length} run
                            {childRuns.length !== 1 ? "s" : ""}
                          </div>
                        </div>

                        {childRuns.length === 0 ? (
                          <div className="text-sm text-text-secondary">
                            Loading child runs...
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
                                      <span>{childRun.total_items} items</span>
                                      {childRun.updated_at && (
                                        <span>
                                          {formatRelativeTime(
                                            childRun.updated_at,
                                          )}
                                        </span>
                                      )}
                                      {childRun.config_id && (
                                        <span className="font-mono">
                                          ID {childRun.config_id.slice(0, 8)}
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
                                          handleRunDownload(childRun.id, fmt)
                                        }
                                        loading={
                                          downloadingId === `run-${childRun.id}`
                                        }
                                      />
                                    )}
                                    {isFailedChild && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleRerun(childRun)}
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
        )}
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
