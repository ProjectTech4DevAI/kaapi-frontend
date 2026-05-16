/**
 * Detailed evaluation report page
 * Shows metrics overview and per-item scores for a specific evaluation job
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/app/lib/apiClient";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useApp } from "@/app/lib/context/AppContext";
import type {
  EvalJob,
  EvalJobApiResponse,
  AssistantConfig,
} from "@/app/lib/types/evaluation";
import {
  hasSummaryScores,
  isNewScoreObjectV2,
  getScoreObject,
  normalizeToIndividualScores,
  isGroupedFormat,
} from "@/app/lib/utils/evaluation";
import {
  exportGroupedCSV,
  exportRowCSV,
} from "@/app/lib/utils/evaluationExport";
import ConfigModal from "@/app/components/ui/ConfigModal";
import Sidebar from "@/app/components/Sidebar";
import DetailedResultsTable from "@/app/components/evaluations/DetailedResultsTable";
import MetricsOverview from "@/app/components/evaluations/MetricsOverview";
import { Button, Modal, Loader } from "@/app/components/ui";
import { ResultsTableSkeleton } from "@/app/components";
import { useToast } from "@/app/components/ui/Toast";
import {
  MenuIcon,
  ChevronLeftIcon,
  DatabaseIcon,
  GroupIcon,
} from "@/app/components/icons";

export default function EvaluationReport() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const jobId = params.id as string;

  const [job, setJob] = useState<EvalJob | null>(null);
  const [assistantConfig, setAssistantConfig] = useState<
    AssistantConfig | undefined
  >(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormatSwitching, setIsFormatSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const { apiKeys, isAuthenticated } = useAuth();
  const apiKey = apiKeys[0]?.key ?? "";
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"row" | "grouped">("row");
  const [isResyncing, setIsResyncing] = useState(false);
  const [showNoTracesModal, setShowNoTracesModal] = useState(false);

  const fetchJobDetails = useCallback(async () => {
    if (!isAuthenticated || !jobId) return;

    const isFirstLoad = !hasLoadedRef.current;
    if (isFirstLoad) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsFormatSwitching(true);
    }

    try {
      const data = await apiFetch<EvalJobApiResponse>(
        `/api/evaluations/${jobId}?export_format=${exportFormat}`,
        apiKey,
      );

      if (data.success === false && data.error) {
        toast.error(data.error);
        setExportFormat("row");
        return;
      }

      const foundJob: EvalJob | undefined =
        data.data ?? (data as unknown as EvalJob);
      if (!foundJob) throw new Error("Evaluation job not found");

      setJob(foundJob);
      hasLoadedRef.current = true;

      if (foundJob.assistant_id) {
        fetchAssistantConfig(foundJob.assistant_id);
      }
      if (foundJob.config_id && foundJob.config_version) {
        fetchConfigInfo(foundJob.config_id, foundJob.config_version);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch evaluation job";
      if (isFirstLoad) {
        setError(message);
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
      setIsFormatSwitching(false);
    }
  }, [apiKey, isAuthenticated, jobId, exportFormat]);

  const fetchAssistantConfig = async (assistantId: string) => {
    try {
      const result = await apiFetch<{
        success: boolean;
        data?: AssistantConfig;
      }>(`/api/assistant/${assistantId}`, apiKey);
      if (result.success && result.data) setAssistantConfig(result.data);
    } catch (err) {
      console.error(
        `Failed to fetch assistant config for ${assistantId}:`,
        err,
      );
    }
  };

  const fetchConfigInfo = async (configId: string, configVersion: number) => {
    try {
      await apiFetch(`/api/configs/${configId}`, apiKey);
      await apiFetch(
        `/api/configs/${configId}/versions/${configVersion}`,
        apiKey,
      );
    } catch (error) {
      console.error("Error fetching config version info:", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated && jobId) fetchJobDetails();
  }, [isAuthenticated, jobId, fetchJobDetails]);

  const handleExportCSV = () => {
    if (!job || !scoreObject) {
      toast.error("No valid data available to export");
      return;
    }
    try {
      if (!isNewScoreObjectV2(scoreObject)) {
        toast.error("Export not available for this score format");
        return;
      }
      const traces = scoreObject.traces;
      if (!traces || traces.length === 0) {
        toast.error("No traces available to export");
        return;
      }
      if (isGroupedFormat(traces)) {
        const count = exportGroupedCSV(job, traces);
        toast.success(`Grouped CSV exported with ${count} questions`);
      } else {
        const count = exportRowCSV(job, scoreObject, assistantConfig);
        toast.success(`CSV exported successfully with ${count} rows`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to export CSV");
    }
  };

  const handleResync = async () => {
    if (!isAuthenticated || !jobId) return;

    setIsResyncing(true);
    try {
      const data = await apiFetch<EvalJobApiResponse>(
        `/api/evaluations/${jobId}?get_trace_info=true&resync_score=true&export_format=${exportFormat}`,
        apiKey,
      );
      const foundJob: EvalJob | undefined =
        data.data ?? (data as unknown as EvalJob);
      if (!foundJob) throw new Error("Evaluation job not found");

      const newScoreObject = getScoreObject(foundJob);
      if (!newScoreObject || !isNewScoreObjectV2(newScoreObject)) {
        setShowNoTracesModal(true);
        setIsResyncing(false);
        return;
      }

      setJob(foundJob);
      if (foundJob.assistant_id) fetchAssistantConfig(foundJob.assistant_id);
      if (foundJob.config_id && foundJob.config_version)
        fetchConfigInfo(foundJob.config_id, foundJob.config_version);
      toast.success("Metrics resynced successfully");
    } catch (error: unknown) {
      toast.error(
        `Failed to resync metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsResyncing(false);
    }
  };

  if (isLoading && !job) {
    return (
      <div className="w-full h-screen flex flex-col bg-bg-secondary">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />
          <div className="flex-1 flex items-center justify-center">
            <Loader size="lg" message="Loading evaluation report..." />
          </div>
        </div>
      </div>
    );
  }

  if ((error && !job) || !job) {
    return (
      <div className="w-full h-screen flex flex-col bg-bg-secondary">
        <div className="flex flex-1 overflow-hidden">
          <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm mb-4 text-status-error">
                {error || "Evaluation job not found"}
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push("/evaluations?tab=evaluations")}
              >
                Back to Evaluations
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scoreObject = getScoreObject(job);
  const hasScore = !!scoreObject;
  const isNewFormat = hasSummaryScores(scoreObject);
  const summaryScores =
    isNewFormat && scoreObject ? scoreObject.summary_scores || [] : [];

  const isJobInProgress =
    job.status.toLowerCase() !== "completed" &&
    job.status.toLowerCase() !== "failed";

  const segmentedClass =
    "inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer text-accent-primary/70 hover:text-accent-primary data-[selected=true]:bg-accent-primary data-[selected=true]:text-white data-[selected=true]:shadow-[0_1px_2px_rgba(0,0,0,0.12)] data-[selected=true]:hover:bg-accent-hover";

  return (
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-bg-primary border-border">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-1.5 rounded-md shrink-0 text-text-secondary hover:bg-neutral-100 transition-colors cursor-pointer"
                  aria-label="Open sidebar"
                >
                  <MenuIcon className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => router.push("/evaluations?tab=evaluations")}
                className="p-1.5 rounded-md shrink-0 text-text-secondary hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="Back to evaluations"
              >
                <ChevronLeftIcon />
              </button>
              <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-3 gap-y-1 overflow-hidden">
                <h1 className="text-base font-semibold truncate min-w-0 text-text-primary tracking-[-0.01em]">
                  {job.run_name}
                </h1>
                <span className="flex items-center gap-1 text-xs shrink-0 text-text-secondary">
                  <DatabaseIcon className="shrink-0" />
                  <span className="truncate max-w-[200px]">
                    {job.dataset_name}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 relative z-10">
              <div className="inline-flex rounded-full p-1 bg-accent-primary/10">
                <button
                  type="button"
                  onClick={() => setExportFormat("row")}
                  disabled={isFormatSwitching || isResyncing}
                  data-selected={exportFormat === "row"}
                  className={`${segmentedClass} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <MenuIcon className="w-3.5 h-3.5 pointer-events-none" />
                  <span className="hidden sm:inline">Individual Rows</span>
                  <span className="sm:hidden">Rows</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("grouped")}
                  disabled={isFormatSwitching || isResyncing}
                  data-selected={exportFormat === "grouped"}
                  className={`${segmentedClass} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <GroupIcon className="pointer-events-none" />
                  <span className="hidden sm:inline">Group by Questions</span>
                  <span className="sm:hidden">Grouped</span>
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfigModalOpen(true)}
              >
                <span className="hidden sm:inline">View Config</span>
                <span className="sm:hidden">Config</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportCSV}
                disabled={!hasScore || isFormatSwitching || isResyncing}
              >
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 bg-bg-secondary">
            <div className="max-w-7xl mx-auto space-y-6">
              {hasScore && isNewFormat ? (
                <MetricsOverview
                  job={job}
                  summaryScores={summaryScores}
                  isJobInProgress={isJobInProgress}
                  isResyncing={isResyncing || isFormatSwitching}
                  onResync={handleResync}
                />
              ) : (
                <div className="rounded-lg p-6 text-center bg-bg-primary shadow-sm">
                  <p
                    className={`text-sm ${job.error_message ? "text-status-error-text" : "text-text-secondary"}`}
                  >
                    {job.error_message || "No results available yet"}
                  </p>
                </div>
              )}

              {hasScore && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-text-secondary">
                      Detailed Results
                    </h3>
                    {isNewFormat && !isFormatSwitching && (
                      <span className="text-xs text-text-secondary">
                        ({normalizeToIndividualScores(scoreObject).length}{" "}
                        items)
                      </span>
                    )}
                  </div>
                  {isFormatSwitching ? (
                    <ResultsTableSkeleton rows={6} cols={4} />
                  ) : (
                    <DetailedResultsTable job={job} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        job={job}
        assistantConfig={assistantConfig}
      />

      <Modal
        open={showNoTracesModal}
        onClose={() => setShowNoTracesModal(false)}
        title="No Langfuse Traces Available"
        maxWidth="max-w-md"
        maxHeight="max-h-fit"
      >
        <div className="px-6 py-5">
          <p className="text-sm text-text-secondary">
            This evaluation does not have Langfuse traces.
          </p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowNoTracesModal(false)}
          >
            OK
          </Button>
        </div>
      </Modal>
    </div>
  );
}
