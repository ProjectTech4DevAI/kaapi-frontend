"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/apiClient";
import { useAuth } from "@/app/lib/context/AuthContext";
import { handleForbiddenError } from "@/app/lib/assessment/access";
import {
  filterAssessments,
  getAsyncErrorMessage,
  getResultsCounts,
} from "@/app/lib/assessment/results";
import { RESULTS_POLL_INTERVAL_MS } from "@/app/lib/assessment/constants";
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
import { jsonResultsToTableData } from "../DataViewModal";

export default function useAssessmentResults({
  onForbidden,
  toast,
}: UseAssessmentResultsParams) {
  const { activeKey } = useAuth();
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
