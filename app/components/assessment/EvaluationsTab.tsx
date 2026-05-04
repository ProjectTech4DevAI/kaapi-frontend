"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/app/lib/apiClient";
import { handleForbiddenError } from "@/app/lib/assessment/access";
import { useToast } from "@/app/components/Toast";
import {
  RefreshIcon,
  DatabaseIcon,
  ClipboardIcon,
  ChevronDownIcon,
  EyeIcon,
} from "@/app/components/icons";
import DownloadIcon from "@/app/components/icons/assessment/DownloadIcon";
import DataViewModal, { jsonResultsToTableData } from "./DataViewModal";
import { ConfigResponse, ConfigVersionResponse } from "@/app/lib/types/configs";
import { formatRelativeTime } from "@/app/lib/utils";
import type {
  AssessmentChildRun,
  AssessmentChildRunListResponse,
  AssessmentListResponse,
  AssessmentRun,
  ConfigRunDetail,
  EvaluationsTabProps,
  ExportFormat,
  StatusFilter,
} from "@/app/lib/types/assessment";
const RESULTS_POLL_INTERVAL_MS = 60_000;
const ACTIVE_STATUSES = new Set(["processing", "pending"]);
const FAILED_STATUSES = new Set(["failed", "completed_with_errors"]);
const COMPLETED_STATUSES = new Set(["completed"]);

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-status-warning-bg text-status-warning-text",
  processing: "bg-status-warning-bg text-status-warning-text",
  in_progress: "bg-status-warning-bg text-status-warning-text",
  completed: "bg-status-success-bg text-status-success-text",
  completed_with_errors: "bg-status-warning-bg text-status-warning-text",
  failed: "bg-status-error-bg text-status-error-text",
  cancelled: "bg-status-default-bg text-status-default-text",
};

const ASSESSMENT_CARD_CLASSES: Record<string, string> = {
  completed: "border-l-status-success",
  failed: "border-l-status-error",
  completed_with_errors: "border-l-status-warning",
  pending: "border-l-status-warning",
  processing: "border-l-status-warning",
  in_progress: "border-l-status-warning",
  cancelled: "border-l-border",
};

const SUMMARY_BADGE_CLASSES: Record<string, string> = {
  total: "bg-bg-secondary text-text-primary",
  processing: "bg-bg-secondary text-status-warning-text",
  completed: "bg-bg-secondary text-status-success-text",
  failed: "bg-bg-secondary text-status-error-text",
};

function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.has(status);
}

function isFailedStatus(status: string): boolean {
  return FAILED_STATUSES.has(status);
}

function isCompletedStatus(status: string): boolean {
  return COMPLETED_STATUSES.has(status);
}

function canRetryStatus(status: string): boolean {
  return isFailedStatus(status);
}

function LoadingSpinner({
  className,
  centered = false,
}: {
  className: string;
  centered?: boolean;
}) {
  return (
    <div
      className={`${className} rounded-full border-2 border-accent-primary border-t-transparent animate-spin ${
        centered ? "mx-auto" : ""
      }`}
    />
  );
}

function getAsyncErrorMessage(action: string, error: unknown): string {
  return `${action}: ${error instanceof Error ? error.message : "Unknown error"}`;
}

function DownloadDropdown({
  onDownload,
  disabled,
  loading,
}: {
  onDownload: (format: ExportFormat) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
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
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || loading}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-xs font-medium transition-colors ${
          disabled || loading
            ? "text-text-secondary opacity-50"
            : "text-text-primary"
        }`}
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
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-36 rounded-md border border-border bg-bg-primary py-1 shadow-lg">
          {(
            [
              ["csv", "CSV File"],
              ["xlsx", "Excel Sheet"],
            ] as const
          ).map(([fmt, label]) => (
            <button
              key={fmt}
              onClick={() => {
                onDownload(fmt);
                setOpen(false);
              }}
              className="w-full cursor-pointer px-3 py-2 text-left text-xs text-text-primary transition-opacity hover:opacity-80"
            >
              {label}
            </button>
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
  const [assessments, setAssessments] = useState<AssessmentRun[]>([]);
  const [childRunsByAssessment, setChildRunsByAssessment] = useState<
    Record<number, AssessmentChildRun[]>
  >({});
  const [configDetailsByKey, setConfigDetailsByKey] = useState<
    Record<string, ConfigRunDetail>
  >({});
  const [configLoadingKeys, setConfigLoadingKeys] = useState<
    Record<string, boolean>
  >({});
  const [configErrorKeys, setConfigErrorKeys] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rerunningId, setRerunningId] = useState<number | null>(null);
  const [retryingAssessmentId, setRetryingAssessmentId] = useState<
    number | null
  >(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<number | null>(null);
  const [previewModal, setPreviewModal] = useState<{
    title: string;
    headers: string[];
    rows: string[][];
  } | null>(null);

  const buildAuthHeaders = useCallback(() => {
    const headers = new Headers();
    if (apiKey) headers.set("X-API-KEY", apiKey);
    return headers;
  }, [apiKey]);

  const loadAssessments = useCallback(async () => {
    if (!apiKey) return;
    setIsLoading(true);
    try {
      const data = await apiFetch<AssessmentListResponse>(
        "/api/assessment/assessments",
        apiKey,
      );
      const list = Array.isArray(data) ? data : data.data || [];
      setAssessments(list);
    } catch (e) {
      if (handleForbiddenError(e, onForbidden)) return;
      console.error("Failed to load assessments:", e);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, onForbidden]);

  const loadChildRuns = useCallback(
    async (assessmentId: number) => {
      if (!apiKey) return;
      try {
        const data = await apiFetch<AssessmentChildRunListResponse>(
          `/api/assessment/runs?assessment_id=${assessmentId}`,
          apiKey,
        );
        const list = Array.isArray(data) ? data : data.data || [];
        setChildRunsByAssessment((prev) => ({ ...prev, [assessmentId]: list }));
      } catch (e) {
        if (handleForbiddenError(e, onForbidden)) return;
        console.error("Failed to load child runs:", e);
      }
    },
    [apiKey, onForbidden],
  );

  const loadConfigDetail = useCallback(
    async (configId: string, version: number) => {
      if (!apiKey) return;

      const key = `${configId}:${version}`;
      if (configDetailsByKey[key] || configLoadingKeys[key]) return;

      setConfigLoadingKeys((prev) => ({ ...prev, [key]: true }));
      setConfigErrorKeys((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      try {
        const [configResponse, versionResponse] = await Promise.all([
          apiFetch<ConfigResponse>(`/api/configs/${configId}`, apiKey),
          apiFetch<ConfigVersionResponse>(
            `/api/configs/${configId}/versions/${version}`,
            apiKey,
          ),
        ]);
        const configJson = configResponse;
        const versionJson = versionResponse;

        if (
          !configJson.success ||
          !configJson.data ||
          !versionJson.success ||
          !versionJson.data
        ) {
          throw new Error(
            configJson.error ||
              versionJson.error ||
              "Configuration details unavailable",
          );
        }

        const detail: ConfigRunDetail = {
          configId,
          version,
          name: configJson.data.name,
          description: configJson.data.description,
          commitMessage: versionJson.data.commit_message,
          provider: versionJson.data.config_blob?.completion?.provider || null,
          model:
            versionJson.data.config_blob?.completion?.params?.model || null,
        };

        setConfigDetailsByKey((prev) => ({ ...prev, [key]: detail }));
      } catch (error) {
        setConfigErrorKeys((prev) => ({
          ...prev,
          [key]:
            error instanceof Error
              ? error.message
              : "Failed to load configuration details",
        }));
      } finally {
        setConfigLoadingKeys((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [apiKey, configDetailsByKey, configLoadingKeys],
  );

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  useEffect(() => {
    if (!apiKey) return;
    const timer = setInterval(() => {
      void loadAssessments();
      if (expandedId !== null) {
        void loadChildRuns(expandedId);
      }
    }, RESULTS_POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [apiKey, expandedId, loadAssessments, loadChildRuns]);

  useEffect(() => {
    if (expandedId === null) return;
    const runs = childRunsByAssessment[expandedId] || [];
    runs.forEach((run) => {
      if (run.config_id && run.config_version) {
        void loadConfigDetail(run.config_id, run.config_version);
      }
    });
  }, [childRunsByAssessment, expandedId, loadConfigDetail]);

  const counts = {
    total: assessments.length,
    processing: assessments.filter((run) => isActiveStatus(run.status)).length,
    completed: assessments.filter((run) => isCompletedStatus(run.status))
      .length,
    failed: assessments.filter((run) => isFailedStatus(run.status)).length,
  };

  const filteredRuns =
    statusFilter === "all"
      ? assessments
      : assessments.filter((r) => {
          if (statusFilter === "processing") return isActiveStatus(r.status);
          if (statusFilter === "failed") return isFailedStatus(r.status);
          return r.status === statusFilter;
        });

  const triggerDownload = useCallback(
    async (url: string, format: ExportFormat, key: string) => {
      if (!apiKey) return;
      setDownloadingId(key);
      try {
        const response = await fetch(`${url}?export_format=${format}`, {
          headers: buildAuthHeaders(),
          credentials: "include",
        });
        if (response.status === 403) {
          onForbidden?.();
          return;
        }
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            err.error ||
              err.message ||
              err.detail ||
              `Export failed (${response.status})`,
          );
        }
        const blob = await response.blob();
        const disposition = response.headers.get("content-disposition") || "";
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
        const filename = filenameMatch?.[1] || `export.${format}`;

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
        toast.success("Download started");
      } catch (error) {
        toast.error(getAsyncErrorMessage("Export failed", error));
      } finally {
        setDownloadingId(null);
      }
    },
    [apiKey, buildAuthHeaders, onForbidden, toast],
  );

  const handleRerun = useCallback(
    async (run: AssessmentChildRun) => {
      if (!apiKey) {
        toast.error("Cannot retry without an API key");
        return;
      }

      setRerunningId(run.id);
      try {
        await apiFetch(`/api/assessment/runs/${run.id}/retry`, apiKey, {
          method: "POST",
        });

        toast.success("Run re-submitted successfully!");
        loadAssessments();
        if (run.assessment_id) {
          loadChildRuns(run.assessment_id);
        }
      } catch (error) {
        if (handleForbiddenError(error, onForbidden)) return;
        toast.error(getAsyncErrorMessage("Re-run failed", error));
      } finally {
        setRerunningId(null);
      }
    },
    [apiKey, loadAssessments, loadChildRuns, onForbidden, toast],
  );

  const handleRetryAssessment = useCallback(
    async (assessmentId: number) => {
      if (!apiKey) {
        toast.error("Cannot retry without an API key");
        return;
      }

      setRetryingAssessmentId(assessmentId);
      try {
        await apiFetch(
          `/api/assessment/assessments/${assessmentId}/retry`,
          apiKey,
          {
            method: "POST",
          },
        );

        toast.success("Assessment re-submitted successfully!");
        void loadAssessments();
        if (expandedId !== null) {
          void loadChildRuns(expandedId);
        }
      } catch (error) {
        if (handleForbiddenError(error, onForbidden)) return;
        toast.error(getAsyncErrorMessage("Retry failed", error));
      } finally {
        setRetryingAssessmentId(null);
      }
    },
    [apiKey, expandedId, loadAssessments, loadChildRuns, onForbidden, toast],
  );

  const handleExpand = useCallback(
    (assessmentId: number) => {
      const next = expandedId === assessmentId ? null : assessmentId;
      setExpandedId(next);
      if (next !== null && !childRunsByAssessment[next]) {
        loadChildRuns(next);
      }
    },
    [childRunsByAssessment, expandedId, loadChildRuns],
  );

  const handlePreview = useCallback(
    async (runId: number, label: string) => {
      if (!apiKey) return;
      setPreviewLoading(runId);
      try {
        const json = await apiFetch<
          { data?: Record<string, unknown>[] } | Record<string, unknown>[]
        >(`/api/assessment/runs/${runId}/results?export_format=json`, apiKey);
        const results: Record<string, unknown>[] = Array.isArray(json)
          ? json
          : json.data || [];
        const { headers, rows } = jsonResultsToTableData(results);
        setPreviewModal({ title: label, headers, rows });
      } catch (error) {
        if (handleForbiddenError(error, onForbidden)) return;
        toast.error(getAsyncErrorMessage("Preview failed", error));
      } finally {
        setPreviewLoading(null);
      }
    },
    [apiKey, onForbidden, toast],
  );

  const formatStatusLabel = (status: string) => status.replace(/_/g, " ");

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg-primary px-6 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-text-primary">
            Assessments
          </h2>
          <div className="flex items-center gap-2 ml-2">
            {[
              {
                label: "Total",
                value: counts.total,
                tone: "total",
              },
              {
                label: "Processing",
                value: counts.processing,
                tone: "processing",
              },
              {
                label: "Completed",
                value: counts.completed,
                tone: "completed",
              },
              { label: "Failed", value: counts.failed, tone: "failed" },
            ].map((item) => (
              <span
                key={item.label}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${SUMMARY_BADGE_CLASSES[item.tone]}`}
              >
                <span className="font-semibold">{item.value}</span>
                <span className="text-text-secondary">
                  {item.label.toLowerCase()}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="cursor-pointer rounded-md border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary"
          >
            <option value="all">All Status</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          <button
            onClick={loadAssessments}
            disabled={isLoading}
            className="cursor-pointer rounded-md border border-border p-2 text-text-secondary transition-colors"
            aria-label="Refresh assessments"
          >
            <RefreshIcon
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

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
              const statusClass =
                STATUS_CLASSES[run.status] || STATUS_CLASSES.processing;
              const isExpanded = expandedId === run.id;
              const childRuns = childRunsByAssessment[run.id] || [];
              const canRetryAssessment = canRetryStatus(run.status);
              const isRetryingAssessment = retryingAssessmentId === run.id;
              const hasCompletedRuns = run.completed_runs > 0;

              return (
                <div
                  key={run.id}
                  className={`rounded-xl border border-border border-l-[3px] bg-bg-primary shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow ${
                    ASSESSMENT_CARD_CLASSES[run.status] ||
                    ASSESSMENT_CARD_CLASSES.processing
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
                          {run.status.replace("_", " ")}
                        </span>

                        <div className="flex items-center gap-2">
                          {hasCompletedRuns && (
                            <DownloadDropdown
                              onDownload={(fmt) =>
                                triggerDownload(
                                  `/api/assessment/assessments/${run.id}/results`,
                                  fmt,
                                  `assessment-${run.id}`,
                                )
                              }
                              disabled={!hasCompletedRuns}
                              loading={downloadingId === `assessment-${run.id}`}
                            />
                          )}
                          {canRetryAssessment && (
                            <button
                              onClick={() => handleRetryAssessment(run.id)}
                              disabled={isRetryingAssessment}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
                                isRetryingAssessment
                                  ? "bg-neutral-200 opacity-70"
                                  : "bg-accent-primary hover:bg-accent-hover"
                              }`}
                            >
                              {isRetryingAssessment ? "Retrying..." : "Retry"}
                            </button>
                          )}
                          <button
                            onClick={() => handleExpand(run.id)}
                            className={`cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary transition-colors ${
                              isExpanded ? "bg-bg-secondary" : "bg-transparent"
                            }`}
                          >
                            {isExpanded ? "Hide details" : "View details"}
                          </button>
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
                              STATUS_CLASSES[childRun.status] ||
                              STATUS_CLASSES.processing;
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
                                      <button
                                        onClick={() =>
                                          handlePreview(
                                            childRun.id,
                                            previewLabel,
                                          )
                                        }
                                        disabled={
                                          previewLoading === childRun.id
                                        }
                                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-xs font-medium text-text-primary transition-colors ${
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
                                      </button>
                                    )}
                                    {isCompletedChild && (
                                      <DownloadDropdown
                                        onDownload={(fmt) =>
                                          triggerDownload(
                                            `/api/assessment/runs/${childRun.id}/results`,
                                            fmt,
                                            `run-${childRun.id}`,
                                          )
                                        }
                                        loading={
                                          downloadingId === `run-${childRun.id}`
                                        }
                                      />
                                    )}
                                    {isFailedChild && (
                                      <button
                                        onClick={() => handleRerun(childRun)}
                                        disabled={isRerunning}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
                                          isRerunning
                                            ? "bg-neutral-200 opacity-70"
                                            : "bg-accent-primary hover:bg-accent-hover"
                                        }`}
                                      >
                                        {isRerunning
                                          ? "Re-running..."
                                          : "Re-run"}
                                      </button>
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
