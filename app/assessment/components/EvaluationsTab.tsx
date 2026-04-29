"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/app/lib/apiClient";
import { colors } from "@/app/lib/colors";
import { useToast } from "@/app/components/Toast";
import {
  RefreshIcon,
  DatabaseIcon,
  ClipboardIcon,
  ChevronDownIcon,
  EyeIcon,
} from "@/app/components/icons";
import DataViewModal, { jsonResultsToTableData } from "./DataViewModal";
import { ConfigResponse, ConfigVersionResponse } from "@/app/lib/configTypes";
import { handleForbiddenApiError } from "../errorUtils";

interface EvaluationsTabProps {
  apiKey: string;
  onForbidden?: () => void;
  onStatusIndicatorChange?: (state: "none" | "processing") => void;
}

interface AssessmentRun {
  id: number;
  experiment_name: string;
  dataset_name: string | null;
  dataset_id: number | null;
  status: string;
  total_runs: number;
  pending_runs: number;
  processing_runs: number;
  completed_runs: number;
  failed_runs: number;
  run_stats: {
    run_id: number;
    config_id: string | null;
    config_version: number | null;
    status: string;
    total_items: number;
    error_message: string | null;
    updated_at: string | null;
  }[];
  error_message: string | null;
  inserted_at: string;
  updated_at: string;
}

interface EvaluationRun {
  id: number;
  assessment_id: number | null;
  run_name: string;
  dataset_name: string | null;
  dataset_id: number | null;
  config_id: string | null;
  config_version: number | null;
  status: string;
  total_items: number;
  error_message: string | null;
  organization_id: number;
  project_id: number;
  assessment_config: Record<string, unknown> | null;
  inserted_at: string;
  updated_at: string;
}

interface ConfigRunDetail {
  configId: string;
  version: number;
  name: string;
  description: string | null;
  commitMessage: string | null;
  provider: string | null;
  model: string | null;
}

type StatusFilter = "all" | "processing" | "completed" | "failed";
type ExportFormat = "csv" | "xlsx";
type AssessmentListResponse = AssessmentRun[] | { data?: AssessmentRun[] };
type EvaluationListResponse = EvaluationRun[] | { data?: EvaluationRun[] };
const RESULTS_POLL_INTERVAL_MS = 60_000;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "rgba(202, 138, 4, 0.1)", text: "#92400e" },
  processing: { bg: "rgba(202, 138, 4, 0.1)", text: "#92400e" },
  in_progress: { bg: "rgba(202, 138, 4, 0.1)", text: "#92400e" },
  completed: { bg: "rgba(22, 163, 74, 0.1)", text: "#166534" },
  completed_with_errors: { bg: "rgba(245, 158, 11, 0.12)", text: "#9a3412" },
  failed: { bg: "rgba(220, 38, 38, 0.1)", text: "#991b1b" },
  cancelled: { bg: "rgba(107, 114, 128, 0.1)", text: "#374151" },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `about ${diffMonths} month${diffMonths !== 1 ? "s" : ""} ago`;
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
        className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors"
        style={{
          borderColor: colors.border,
          color: disabled ? colors.text.secondary : colors.text.primary,
          backgroundColor: "transparent",
          opacity: disabled || loading ? 0.5 : 1,
        }}
        aria-label="Download results"
        aria-expanded={open}
      >
        {loading ? (
          <div
            className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
            style={{
              borderColor: colors.text.secondary,
              borderTopColor: "transparent",
            }}
          />
        ) : (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        )}
        Export
        <ChevronDownIcon className="w-3 h-3" />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 w-36 rounded-md shadow-lg border z-10 py-1"
          style={{
            backgroundColor: colors.bg.primary,
            borderColor: colors.border,
          }}
        >
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
              className="cursor-pointer w-full text-left px-3 py-2 text-xs hover:opacity-80 transition-opacity"
              style={{ color: colors.text.primary }}
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
  onStatusIndicatorChange,
}: EvaluationsTabProps) {
  const toast = useToast();
  const [assessments, setAssessments] = useState<AssessmentRun[]>([]);
  const [childRunsByAssessment, setChildRunsByAssessment] = useState<
    Record<number, EvaluationRun[]>
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
      const hasActive = list.some(
        (run) => run.status === "processing" || run.status === "pending",
      );
      onStatusIndicatorChange?.(hasActive ? "processing" : "none");
    } catch (e) {
      if (handleForbiddenApiError(e, onForbidden)) return;
      console.error("Failed to load assessments:", e);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, onForbidden, onStatusIndicatorChange]);

  const loadChildRuns = useCallback(
    async (assessmentId: number) => {
      if (!apiKey) return;
      try {
        const data = await apiFetch<EvaluationListResponse>(
          `/api/assessment/evaluations?assessment_id=${assessmentId}`,
          apiKey,
        );
        const list = Array.isArray(data) ? data : data.data || [];
        setChildRunsByAssessment((prev) => ({ ...prev, [assessmentId]: list }));
      } catch (e) {
        if (handleForbiddenApiError(e, onForbidden)) return;
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
    processing: assessments.filter(
      (r) => r.status === "processing" || r.status === "pending",
    ).length,
    completed: assessments.filter((r) => r.status === "completed").length,
    failed: assessments.filter(
      (r) => r.status === "failed" || r.status === "completed_with_errors",
    ).length,
  };

  const filteredRuns =
    statusFilter === "all"
      ? assessments
      : assessments.filter((r) => {
          if (statusFilter === "processing")
            return r.status === "processing" || r.status === "pending";
          if (statusFilter === "failed")
            return (
              r.status === "failed" || r.status === "completed_with_errors"
            );
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
        toast.error(
          `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } finally {
        setDownloadingId(null);
      }
    },
    [apiKey, buildAuthHeaders, onForbidden, toast],
  );

  const handleRerun = useCallback(
    async (run: EvaluationRun) => {
      if (!apiKey) {
        toast.error("Cannot retry without an API key");
        return;
      }

      setRerunningId(run.id);
      try {
        await apiFetch(`/api/assessment/evaluations/${run.id}/retry`, apiKey, {
          method: "POST",
        });

        toast.success("Evaluation re-submitted successfully!");
        loadAssessments();
        if (run.assessment_id) {
          loadChildRuns(run.assessment_id);
        }
      } catch (error) {
        if (handleForbiddenApiError(error, onForbidden)) return;
        toast.error(
          `Re-run failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
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
          { method: "POST" },
        );

        toast.success("Assessment re-submitted successfully!");
        void loadAssessments();
        if (expandedId !== null) {
          void loadChildRuns(expandedId);
        }
      } catch (error) {
        if (handleForbiddenApiError(error, onForbidden)) return;
        toast.error(
          `Retry failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
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
        >(
          `/api/assessment/evaluations/${runId}/results?export_format=json`,
          apiKey,
        );
        const results: Record<string, unknown>[] = Array.isArray(json)
          ? json
          : json.data || [];
        const { headers, rows } = jsonResultsToTableData(results);
        setPreviewModal({ title: label, headers, rows });
      } catch (error) {
        if (handleForbiddenApiError(error, onForbidden)) return;
        toast.error(
          `Preview failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } finally {
        setPreviewLoading(null);
      }
    },
    [apiKey, onForbidden, toast],
  );

  const formatStatusLabel = (status: string) => status.replace(/_/g, " ");

  return (
    <div className="flex-1 overflow-auto">
      <div
        className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
        style={{
          backgroundColor: colors.bg.primary,
          borderColor: colors.border,
        }}
      >
        <div className="flex items-center gap-3">
          <h2
            className="text-base font-semibold"
            style={{ color: colors.text.primary }}
          >
            Assessments
          </h2>
          <div className="flex items-center gap-2 ml-2">
            {[
              {
                label: "Total",
                value: counts.total,
                color: colors.text.primary,
              },
              {
                label: "Processing",
                value: counts.processing,
                color: "#92400e",
              },
              { label: "Completed", value: counts.completed, color: "#166534" },
              { label: "Failed", value: counts.failed, color: "#991b1b" },
            ].map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                style={{
                  backgroundColor: colors.bg.secondary,
                  color: item.color,
                }}
              >
                <span className="font-semibold">{item.value}</span>
                <span style={{ color: colors.text.secondary }}>
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
            className="px-3 py-1.5 border rounded-md text-sm cursor-pointer"
            style={{
              backgroundColor: colors.bg.primary,
              borderColor: colors.border,
              color: colors.text.primary,
            }}
          >
            <option value="all">All Status</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>

          <button
            onClick={loadAssessments}
            disabled={isLoading}
            className="cursor-pointer p-2 rounded-md border transition-colors"
            style={{ borderColor: colors.border, color: colors.text.secondary }}
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
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
              style={{
                borderColor: colors.text.secondary,
                borderTopColor: "transparent",
              }}
            />
            <p className="text-sm" style={{ color: colors.text.secondary }}>
              Loading assessments...
            </p>
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="py-16 text-center">
            <span
              className="block mx-auto mb-3 w-12 h-12"
              style={{ color: colors.border }}
            >
              <ClipboardIcon className="w-12 h-12" />
            </span>
            <p
              className="text-sm font-medium mb-1"
              style={{ color: colors.text.primary }}
            >
              {statusFilter === "all"
                ? "No assessments yet"
                : `No ${statusFilter} assessments`}
            </p>
            <p className="text-xs" style={{ color: colors.text.secondary }}>
              {statusFilter === "all"
                ? "Submit an assessment from the Config tab to get started"
                : "Try changing the status filter"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRuns.map((run) => {
              const statusStyle =
                STATUS_COLORS[run.status] || STATUS_COLORS.processing;
              const isExpanded = expandedId === run.id;
              const childRuns = childRunsByAssessment[run.id] || [];
              const canRetryAssessment =
                run.status === "failed" ||
                run.status === "completed_with_errors";
              const isRetryingAssessment = retryingAssessmentId === run.id;
              const hasCompletedRuns = run.completed_runs > 0;

              return (
                <div
                  key={run.id}
                  className="rounded-xl border transition-shadow"
                  style={{
                    backgroundColor: colors.bg.primary,
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                    borderColor: colors.border,
                    borderLeft: `3px solid ${
                      run.status === "completed"
                        ? "#22c55e"
                        : run.status === "failed"
                          ? "#ef4444"
                          : run.status === "completed_with_errors"
                            ? "#f59e0b"
                            : "#eab308"
                    }`,
                  }}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span
                            className="text-sm font-bold truncate"
                            style={{ color: colors.text.primary }}
                          >
                            {run.experiment_name}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                            style={{
                              backgroundColor: colors.bg.secondary,
                              color: colors.text.secondary,
                            }}
                          >
                            {run.total_runs} configs
                          </span>
                        </div>

                        <div
                          className="text-xs mb-3"
                          style={{ color: colors.text.secondary }}
                        >
                          {formatRelativeTime(run.inserted_at)}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {run.dataset_name && (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
                              style={{
                                backgroundColor: colors.bg.secondary,
                                color: colors.text.secondary,
                              }}
                            >
                              <DatabaseIcon className="w-3.5 h-3.5 flex-shrink-0" />
                              {run.dataset_name}
                            </span>
                          )}

                          <span
                            className="rounded-full px-2.5 py-1 text-xs"
                            style={{
                              backgroundColor: colors.bg.secondary,
                              color: colors.text.secondary,
                            }}
                          >
                            {run.completed_runs} completed
                          </span>
                          <span
                            className="rounded-full px-2.5 py-1 text-xs"
                            style={{
                              backgroundColor: colors.bg.secondary,
                              color: colors.text.secondary,
                            }}
                          >
                            {run.processing_runs + run.pending_runs} active
                          </span>
                          {run.failed_runs > 0 && (
                            <span
                              className="rounded-full px-2.5 py-1 text-xs"
                              style={{
                                backgroundColor: "rgba(220, 38, 38, 0.08)",
                                color: "#991b1b",
                              }}
                            >
                              {run.failed_runs} failed
                            </span>
                          )}
                        </div>

                        {(run.status === "failed" ||
                          run.status === "completed_with_errors") &&
                          run.error_message && (
                            <div
                              className="mt-2 text-xs px-3 py-2 rounded-md"
                              style={{
                                backgroundColor: "rgba(220, 38, 38, 0.05)",
                                color: "#991b1b",
                              }}
                            >
                              {run.error_message}
                            </div>
                          )}
                      </div>

                      <div className="flex flex-col items-end gap-3 flex-shrink-0">
                        <span
                          className="text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wide"
                          style={{
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.text,
                          }}
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
                              className="px-3 py-1.5 rounded-lg text-xs font-medium"
                              style={{
                                backgroundColor: isRetryingAssessment
                                  ? colors.border
                                  : colors.text.primary,
                                color: "#ffffff",
                                opacity: isRetryingAssessment ? 0.7 : 1,
                              }}
                            >
                              {isRetryingAssessment ? "Retrying..." : "Retry"}
                            </button>
                          )}
                          <button
                            onClick={() => handleExpand(run.id)}
                            className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                            style={{
                              backgroundColor: isExpanded
                                ? colors.bg.secondary
                                : "transparent",
                              borderColor: colors.border,
                              color: colors.text.primary,
                            }}
                          >
                            {isExpanded ? "Hide details" : "View details"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div
                        className="mt-5 space-y-3 border-t pt-4"
                        style={{ borderColor: colors.border }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div
                              className="text-sm font-semibold"
                              style={{ color: colors.text.primary }}
                            >
                              Configurations in this assessment
                            </div>
                            <div
                              className="mt-1 text-xs"
                              style={{ color: colors.text.secondary }}
                            >
                              Each configuration keeps its own status, preview,
                              and export actions.
                            </div>
                          </div>
                          <div
                            className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                            style={{
                              backgroundColor: colors.bg.secondary,
                              color: colors.text.secondary,
                            }}
                          >
                            {childRuns.length} run
                            {childRuns.length !== 1 ? "s" : ""}
                          </div>
                        </div>

                        {childRuns.length === 0 ? (
                          <div
                            className="text-sm"
                            style={{ color: colors.text.secondary }}
                          >
                            Loading child evaluation runs...
                          </div>
                        ) : (
                          childRuns.map((childRun) => {
                            const childStatusStyle =
                              STATUS_COLORS[childRun.status] ||
                              STATUS_COLORS.processing;
                            const isFailedChild = childRun.status === "failed";
                            const isCompletedChild =
                              childRun.status === "completed";
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
                                className="rounded-xl border p-4"
                                style={{
                                  borderColor: colors.border,
                                  backgroundColor: colors.bg.secondary,
                                }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className="text-sm font-semibold"
                                        style={{ color: colors.text.primary }}
                                      >
                                        {configName}
                                      </span>
                                      {childRun.config_version !== null && (
                                        <span
                                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                                          style={{
                                            backgroundColor: colors.bg.primary,
                                            color: colors.text.secondary,
                                          }}
                                        >
                                          v{childRun.config_version}
                                        </span>
                                      )}
                                      {configDetail?.provider &&
                                        configDetail?.model && (
                                          <span
                                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                                            style={{
                                              backgroundColor:
                                                "rgba(23, 23, 23, 0.05)",
                                              color: colors.text.secondary,
                                            }}
                                          >
                                            {configDetail.provider}/
                                            {configDetail.model}
                                          </span>
                                        )}
                                    </div>

                                    <div
                                      className="mt-1 text-sm"
                                      style={{ color: colors.text.secondary }}
                                    >
                                      {isConfigLoading
                                        ? "Loading configuration details..."
                                        : configDetail?.description ||
                                          configDetail?.commitMessage ||
                                          "No description available for this configuration."}
                                    </div>

                                    <div
                                      className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                                      style={{ color: colors.text.secondary }}
                                    >
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
                                      <div
                                        className="mt-2 text-xs"
                                        style={{ color: "#991b1b" }}
                                      >
                                        {configError}
                                      </div>
                                    )}
                                    {isFailedChild &&
                                      childRun.error_message && (
                                        <div
                                          className="mt-2 text-xs"
                                          style={{ color: "#991b1b" }}
                                        >
                                          {childRun.error_message}
                                        </div>
                                      )}
                                  </div>

                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span
                                      className="text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide"
                                      style={{
                                        backgroundColor: childStatusStyle.bg,
                                        color: childStatusStyle.text,
                                      }}
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
                                        className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors"
                                        style={{
                                          borderColor: colors.border,
                                          color: colors.text.primary,
                                          backgroundColor: "transparent",
                                          opacity:
                                            previewLoading === childRun.id
                                              ? 0.5
                                              : 1,
                                        }}
                                      >
                                        {previewLoading === childRun.id ? (
                                          <div
                                            className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"
                                            style={{
                                              borderColor:
                                                colors.text.secondary,
                                              borderTopColor: "transparent",
                                            }}
                                          />
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
                                            `/api/assessment/evaluations/${childRun.id}/results`,
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
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                                        style={{
                                          backgroundColor: isRerunning
                                            ? colors.border
                                            : colors.text.primary,
                                          color: "#ffffff",
                                          opacity: isRerunning ? 0.7 : 1,
                                        }}
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
