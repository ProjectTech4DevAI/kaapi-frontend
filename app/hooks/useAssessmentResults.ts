"use client";

// Fetches, polls, and manages assessment run list state including filtering and retry.
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/apiClient";
import { useAuth } from "@/app/lib/context/AuthContext";
import { handleForbiddenError } from "@/app/lib/utils/assessment";
import {
  filterAssessments,
  getAsyncErrorMessage,
  getResultsCounts,
  normalizeAssessmentRun,
} from "@/app/lib/assessment/results";
import { RESULTS_POLL_INTERVAL_MS } from "@/app/lib/assessment/constants";
import useConfigRunDetails from "@/app/hooks/useConfigRunDetails";
import useAssessmentDownload from "@/app/hooks/useAssessmentDownload";
import type {
  AssessmentChildRun,
  AssessmentChildRunListResponse,
  AssessmentListResponse,
  AssessmentRun,
  PostProcessingConfig,
  StatusFilter,
} from "@/app/lib/types/assessment";
import type { ToastContextType } from "@/app/lib/types/toast";

interface UseAssessmentResultsParams {
  onForbidden?: () => void;
  toast: ToastContextType;
}

const POST_PROCESSING_NON_DATA_FIELDS = new Set([
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
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rerunningId, setRerunningId] = useState<number | null>(null);
  const [resumingId, setResumingId] = useState<number | null>(null);
  const [retryingAssessmentId, setRetryingAssessmentId] = useState<
    number | null
  >(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const {
    configDetailsByKey,
    configLoadingKeys,
    configErrorKeys,
    loadConfigDetail,
  } = useConfigRunDetails({ apiKey, isAuthenticated });

  const { downloadingId, handleAssessmentDownload, handleRunDownload } =
    useAssessmentDownload({ apiKey, isAuthenticated, onForbidden, toast });

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

  const handleResume = useCallback(
    async (run: AssessmentChildRun) => {
      if (!isAuthenticated) {
        toast.error("Please sign in to resume this run");
        return;
      }

      setResumingId(run.id);
      try {
        await apiFetch(`/api/assessment/runs/${run.id}/resume`, apiKey, {
          method: "POST",
        });

        toast.success("Run resumed from failed stage!");
        void loadAssessments();
        if (run.assessment_id) {
          void loadChildRuns(run.assessment_id);
        }
      } catch (error) {
        if (handleForbiddenError(error, onForbidden)) return;
        toast.error(getAsyncErrorMessage("Resume failed", error));
      } finally {
        setResumingId(null);
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
    (runId: number, label: string) => {
      if (!isAuthenticated) return;
      const url = `/assessment/results/${runId}?title=${encodeURIComponent(label)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [isAuthenticated],
  );

  const handleSavePostProcessing = useCallback(
    async (runId: number, config: PostProcessingConfig | null) => {
      await apiFetch(`/api/assessment/runs/${runId}/post-processing`, apiKey, {
        method: "PATCH",
        body: JSON.stringify(config),
      });
      if (expandedId !== null) void loadChildRuns(expandedId);
    },
    [apiKey, expandedId, loadChildRuns],
  );

  const handleFetchRunColumns = useCallback(
    async (runId: number): Promise<string[]> => {
      try {
        const res = await apiFetch<
          { data?: Record<string, unknown>[] } | Record<string, unknown>[]
        >(`/api/assessment/runs/${runId}/results?export_format=json`, apiKey);
        const rows: Record<string, unknown>[] = Array.isArray(res)
          ? res
          : (res.data ?? []);
        if (rows.length === 0) return [];
        return Object.keys(rows[0]).filter(
          (k) => !POST_PROCESSING_NON_DATA_FIELDS.has(k),
        );
      } catch {
        return [];
      }
    },
    [apiKey],
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
    resumingId,
    retryingAssessmentId,
    expandedId,
    downloadingId,
    loadAssessments,
    handleExpand,
    handleRetryAssessment,
    handleRerun,
    handleResume,
    handlePreview,
    handleAssessmentDownload,
    handleRunDownload,
    handleSavePostProcessing,
    handleFetchRunColumns,
  };
}
