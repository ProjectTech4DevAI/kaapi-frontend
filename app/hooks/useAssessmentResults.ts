"use client";

// Fetches, polls, and manages assessment run list state including filtering and retry.
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/app/lib/apiClient";
import { useAuth } from "@/app/lib/context/AuthContext";
import {
  getConfigDetailErrorMessage,
  handleForbiddenError,
  isAbortError,
} from "@/app/lib/utils/assessment";
import {
  filterAssessments,
  getAsyncErrorMessage,
  getResultsCounts,
  isActiveStatus,
  isCompletedStatus,
  isFailedStatus,
  jsonResultsToTableData,
  PREVIEW_ROW_LIMIT,
} from "@/app/lib/assessment/results";
import {
  ASSESSMENT_TAG,
  RESULTS_POLL_INTERVAL_MS,
} from "@/app/lib/assessment/constants";
import type {
  ConfigResponse,
  ConfigVersionResponse,
} from "@/app/lib/types/configs";
import type {
  AssessmentChildRun,
  AssessmentChildRunListResponse,
  AssessmentListResponse,
  AssessmentResultsPreview,
  AssessmentRun,
  ConfigRunDetail,
  ExportFormat,
  StatusFilter,
} from "@/app/lib/types/assessment";
import type { ToastContextType } from "@/app/lib/types/toast";

interface UseAssessmentResultsParams {
  onForbidden?: () => void;
  toast: ToastContextType;
}

function safeCount(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeAssessmentRun(run: AssessmentRun): AssessmentRun {
  const runStats = Array.isArray(run.run_stats) ? run.run_stats : [];
  const pendingRuns = safeCount(
    run.pending_runs,
    runStats.filter((item) => item.status === "pending").length,
  );
  const processingRuns = safeCount(
    run.processing_runs,
    Math.max(
      0,
      runStats.filter((item) => isActiveStatus(item.status)).length -
        pendingRuns,
    ),
  );
  const completedRuns = safeCount(
    run.completed_runs,
    runStats.filter((item) => isCompletedStatus(item.status)).length,
  );
  const failedRuns = safeCount(
    run.failed_runs,
    runStats.filter((item) => isFailedStatus(item.status)).length,
  );
  const totalRuns = safeCount(
    run.total_runs,
    runStats.length ||
      pendingRuns + processingRuns + completedRuns + failedRuns,
  );

  return {
    ...run,
    total_runs: totalRuns,
    pending_runs: pendingRuns,
    processing_runs: processingRuns,
    completed_runs: completedRuns,
    failed_runs: failedRuns,
  };
}

export default function useAssessmentResults({
  onForbidden,
  toast,
}: UseAssessmentResultsParams) {
  const { activeKey, isAuthenticated } = useAuth();
  const apiKey = activeKey?.key ?? "";
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
  const [previewModal, setPreviewModal] =
    useState<AssessmentResultsPreview | null>(null);
  const configDetailControllersRef = useRef<Record<string, AbortController>>(
    {},
  );
  const configDetailFetchedRef = useRef<Record<string, boolean>>({});

  const buildAuthHeaders = useCallback(() => {
    const headers = new Headers();
    if (apiKey) headers.set("X-API-KEY", apiKey);
    return headers;
  }, [apiKey]);

  const loadAssessments = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await apiFetch<AssessmentListResponse>(
        "/api/assessment/assessments",
        apiKey,
      );
      const list = Array.isArray(data) ? data : data.data || [];
      setAssessments(list.map(normalizeAssessmentRun));
    } catch (e) {
      if (handleForbiddenError(e, onForbidden)) return;
      console.error("Failed to load assessments:", e);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, isAuthenticated, onForbidden]);

  const loadChildRuns = useCallback(
    async (assessmentId: number) => {
      if (!isAuthenticated) return;
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
    [apiKey, isAuthenticated, onForbidden],
  );

  const loadConfigDetail = useCallback(
    async (configId: string, version: number) => {
      if (!isAuthenticated) return;

      const key = `${configId}:${version}`;
      if (configDetailFetchedRef.current[key]) return;
      configDetailFetchedRef.current[key] = true;

      setConfigLoadingKeys((prev) => ({ ...prev, [key]: true }));
      setConfigErrorKeys((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      configDetailControllersRef.current[key]?.abort();
      const controller = new AbortController();
      configDetailControllersRef.current[key] = controller;

      try {
        const query = new URLSearchParams({ tag: ASSESSMENT_TAG });
        const [configResponse, versionResponse] = await Promise.all([
          apiFetch<ConfigResponse>(
            `/api/configs/${configId}?${query.toString()}`,
            apiKey,
            { signal: controller.signal },
          ),
          apiFetch<ConfigVersionResponse>(
            `/api/configs/${configId}/versions/${version}?${query.toString()}`,
            apiKey,
            { signal: controller.signal },
          ),
        ]);

        if (
          !configResponse.success ||
          !configResponse.data ||
          !versionResponse.success ||
          !versionResponse.data
        ) {
          throw new Error(
            configResponse.error ||
              versionResponse.error ||
              "Configuration details unavailable",
          );
        }

        const detail: ConfigRunDetail = {
          configId,
          version,
          name: configResponse.data.name,
          description: configResponse.data.description,
          commitMessage: versionResponse.data.commit_message,
          provider:
            versionResponse.data.config_blob?.completion?.provider || null,
          model:
            versionResponse.data.config_blob?.completion?.params?.model || null,
        };

        setConfigDetailsByKey((prev) => ({ ...prev, [key]: detail }));
      } catch (error) {
        if (isAbortError(error)) return;
        setConfigErrorKeys((prev) => ({
          ...prev,
          [key]: getConfigDetailErrorMessage(error),
        }));
      } finally {
        if (configDetailControllersRef.current[key] === controller) {
          delete configDetailControllersRef.current[key];
        }
        setConfigLoadingKeys((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [apiKey, isAuthenticated],
  );

  useEffect(() => {
    const controllers = configDetailControllersRef.current;
    return () => {
      Object.values(controllers).forEach((controller) => controller.abort());
    };
  }, []);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setInterval(() => {
      void loadAssessments();
      if (expandedId !== null) {
        void loadChildRuns(expandedId);
      }
    }, RESULTS_POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [expandedId, isAuthenticated, loadAssessments, loadChildRuns]);

  useEffect(() => {
    if (expandedId === null) return;
    const runs = childRunsByAssessment[expandedId] || [];
    runs.forEach((run) => {
      if (run.config_id && run.config_version) {
        void loadConfigDetail(run.config_id, run.config_version);
      }
    });
  }, [childRunsByAssessment, expandedId, loadConfigDetail]);

  const triggerDownload = useCallback(
    async (url: string, format: ExportFormat, key: string) => {
      if (!isAuthenticated) return;
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
    [buildAuthHeaders, isAuthenticated, onForbidden, toast],
  );

  const handleAssessmentDownload = useCallback(
    (assessmentId: number, format: ExportFormat) =>
      triggerDownload(
        `/api/assessment/assessments/${assessmentId}/results`,
        format,
        `assessment-${assessmentId}`,
      ),
    [triggerDownload],
  );

  const handleRunDownload = useCallback(
    (runId: number, format: ExportFormat) =>
      triggerDownload(
        `/api/assessment/runs/${runId}/results`,
        format,
        `run-${runId}`,
      ),
    [triggerDownload],
  );

  const handleRerun = useCallback(
    async (run: AssessmentChildRun) => {
      if (!isAuthenticated) {
        toast.error("Please sign in to retry this run");
        return;
      }

      setRerunningId(run.id);
      try {
        await apiFetch(`/api/assessment/runs/${run.id}/retry`, apiKey, {
          method: "POST",
        });

        toast.success("Run re-submitted successfully!");
        void loadAssessments();
        if (run.assessment_id) {
          void loadChildRuns(run.assessment_id);
        }
      } catch (error) {
        if (handleForbiddenError(error, onForbidden)) return;
        toast.error(getAsyncErrorMessage("Re-run failed", error));
      } finally {
        setRerunningId(null);
      }
    },
    [
      apiKey,
      isAuthenticated,
      loadAssessments,
      loadChildRuns,
      onForbidden,
      toast,
    ],
  );

  const handleRetryAssessment = useCallback(
    async (assessmentId: number) => {
      if (!isAuthenticated) {
        toast.error("Please sign in to retry this assessment");
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
    [
      apiKey,
      expandedId,
      isAuthenticated,
      loadAssessments,
      loadChildRuns,
      onForbidden,
      toast,
    ],
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
      if (!isAuthenticated) return;
      setPreviewLoading(runId);
      try {
        const json = await apiFetch<
          { data?: Record<string, unknown>[] } | Record<string, unknown>[]
        >(`/api/assessment/runs/${runId}/results?export_format=json`, apiKey);
        const results: Record<string, unknown>[] = Array.isArray(json)
          ? json
          : json.data || [];
        const { headers, rows } = jsonResultsToTableData(results, {
          rowLimit: PREVIEW_ROW_LIMIT,
        });
        setPreviewModal({ title: label, headers, rows });
      } catch (error) {
        if (handleForbiddenError(error, onForbidden)) return;
        toast.error(getAsyncErrorMessage("Preview failed", error));
      } finally {
        setPreviewLoading(null);
      }
    },
    [apiKey, isAuthenticated, onForbidden, toast],
  );

  return {
    assessments,
    counts: getResultsCounts(assessments),
    filteredRuns: filterAssessments(assessments, statusFilter),
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
  };
}
