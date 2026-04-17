/**
 * Detailed evaluation report page
 * Shows metrics overview and per-item scores for a specific evaluation job
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/app/lib/apiClient";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useApp } from "@/app/lib/context/AppContext";
import type {
  EvalJob,
  AssistantConfig,
  GroupedTraceItem,
} from "@/app/lib/types/evaluation";
import {
  hasSummaryScores,
  isNewScoreObjectV2,
  getScoreObject,
  normalizeToIndividualScores,
  isGroupedFormat,
} from "@/app/lib/utils/evaluation";
import ConfigModal from "@/app/components/ConfigModal";
import Sidebar from "@/app/components/Sidebar";
import DetailedResultsTable from "@/app/components/evaluations/DetailedResultsTable";
import { colors } from "@/app/lib/colors";
import { useToast } from "@/app/components/Toast";
import Loader from "@/app/components/Loader";
import {
  WarningTriangleIcon,
  MenuIcon,
  ChevronLeftIcon,
  DatabaseIcon,
  GroupIcon,
  RefreshIcon,
} from "@/app/components/icons";
import { sanitizeCSVCell } from "@/app/lib/utils";

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
  const [error, setError] = useState<string | null>(null);
  const { apiKeys, isAuthenticated } = useAuth();
  const apiKey = apiKeys[0]?.key ?? "";
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"row" | "grouped">("row");
  const [isResyncing, setIsResyncing] = useState(false);
  const [showNoTracesModal, setShowNoTracesModal] = useState(false);

  const fetchJobDetails = useCallback(async () => {
    if (!isAuthenticated || !jobId) return;

    setIsLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await apiFetch<any>(
        `/api/evaluations/${jobId}?export_format=${exportFormat}`,
        apiKey,
      );

      if (data.success === false && data.error) {
        toast.error(data.error);
        setExportFormat("row");
        return;
      }

      const foundJob = data.data || data;
      if (!foundJob) throw new Error("Evaluation job not found");

      setJob(foundJob);

      if (foundJob.assistant_id) {
        fetchAssistantConfig(foundJob.assistant_id);
      }
      if (foundJob.config_id && foundJob.config_version) {
        fetchConfigInfo(foundJob.config_id, foundJob.config_version);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch evaluation job",
      );
    } finally {
      setIsLoading(false);
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

  const exportGroupedCSV = (traces: GroupedTraceItem[]) => {
    if (!job) return;
    try {
      const maxAnswers = Math.max(...traces.map((g) => g.llm_answers.length));
      const scoreNames = traces[0]?.scores[0]?.map((s) => s.name) || [];
      let csvContent = "Question ID,Question,Ground Truth";
      for (let i = 1; i <= maxAnswers; i++) {
        csvContent += `,LLM Answer ${i},Trace ID ${i}`;
        scoreNames.forEach((name) => {
          csvContent += `,${name} (${i}),${sanitizeCSVCell(`${name} (${i}) Comment`)}`;
        });
      }
      csvContent += "\n";
      traces.forEach((group) => {
        const row: string[] = [
          String(group.question_id),
          sanitizeCSVCell(group.question || ""),
          sanitizeCSVCell(group.ground_truth_answer || ""),
        ];
        for (let i = 0; i < maxAnswers; i++) {
          row.push(
            `"${(group.llm_answers[i] || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
          );
          row.push(group.trace_ids[i] || "");
          scoreNames.forEach((name) => {
            const score = group.scores[i]?.find((s) => s.name === name);
            row.push(score ? String(score.value) : "");
            row.push(
              score?.comment ? sanitizeCSVCell(score.comment, true) : "",
            );
          });
        }
        csvContent += row.join(",") + "\n";
      });
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `evaluation_${job.id}_${job.run_name.replace(/[^a-z0-9]/gi, "_")}_grouped.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Grouped CSV exported with ${traces.length} questions`);
    } catch (_error) {
      toast.error("Failed to export grouped CSV");
    }
  };

  // Export row format CSV
  const exportRowCSV = () => {
    if (!job || !scoreObject) return;
    try {
      const individual_scores = normalizeToIndividualScores(scoreObject);
      if (!individual_scores || individual_scores.length === 0) {
        toast.error("No valid data available to export");
        return;
      }
      let csvContent = "";
      const firstItem = individual_scores[0];
      const scoreNames = firstItem?.trace_scores?.map((s) => s.name) || [];
      csvContent +=
        "Counter,Trace ID,Job ID,Run Name,Dataset,Model,Status,Total Items,";
      csvContent += "Question,Answer,Ground Truth,";
      csvContent +=
        scoreNames.map((name) => `${name},${name} (comment)`).join(",") + "\n";
      let rowCount = 0;
      individual_scores.forEach((item, index) => {
        const row = [
          index + 1,
          item.trace_id || "N/A",
          job.id,
          `"${job.run_name.replace(/"/g, '""')}"`,
          `"${job.dataset_name.replace(/"/g, '""')}"`,
          assistantConfig?.model || job.config?.model || "N/A",
          job.status,
          job.total_items,
          `"${(item.input?.question || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
          `"${(item.output?.answer || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
          `"${(item.metadata?.ground_truth || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
          ...scoreNames.flatMap((name) => {
            const score = item.trace_scores?.find((s) => s.name === name);
            return [
              score ? score.value : "N/A",
              score?.comment ? sanitizeCSVCell(score.comment, true) : "",
            ];
          }),
        ].join(",");
        csvContent += row + "\n";
        rowCount++;
      });
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `evaluation_${job.id}_${job.run_name.replace(/[^a-z0-9]/gi, "_")}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`CSV exported successfully with ${rowCount} rows`);
    } catch (_error) {
      toast.error("Failed to export CSV");
    }
  };

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
        exportGroupedCSV(traces);
      } else {
        exportRowCSV();
      }
    } catch (_error) {
      toast.error(
        "Failed to export CSV. Please check the console for details.",
      );
    }
  };

  const handleResync = async () => {
    if (!isAuthenticated || !jobId) return;

    setIsResyncing(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await apiFetch<any>(
        `/api/evaluations/${jobId}?get_trace_info=true&resync_score=true&export_format=${exportFormat}`,
        apiKey,
      );
      const foundJob = data.data || data;
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

  if (isLoading) {
    return (
      <div
        className="w-full h-screen flex flex-col"
        style={{ backgroundColor: colors.bg.secondary }}
      >
        <div className="flex flex-1 overflow-hidden">
          <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />
          <div className="flex-1 flex items-center justify-center">
            <Loader size="lg" message="Loading evaluation report..." />
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div
        className="w-full h-screen flex flex-col"
        style={{ backgroundColor: colors.bg.secondary }}
      >
        <div className="flex flex-1 overflow-hidden">
          <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p
                className="text-sm mb-4"
                style={{ color: colors.status.error }}
              >
                {error || "Evaluation job not found"}
              </p>
              <button
                onClick={() => router.push("/evaluations?tab=evaluations")}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: colors.accent.primary,
                  color: "#ffffff",
                }}
              >
                Back to Evaluations
              </button>
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

  return (
    <div
      className="w-full h-screen flex flex-col"
      style={{ backgroundColor: colors.bg.secondary }}
    >
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div
            className="border-b px-4 py-3 flex items-center justify-between flex-shrink-0"
            style={{
              backgroundColor: colors.bg.primary,
              borderColor: colors.border,
            }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-md flex-shrink-0"
                style={{ color: colors.text.secondary }}
              >
                <MenuIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push("/evaluations?tab=evaluations")}
                className="p-1.5 rounded-md flex-shrink-0"
                style={{ color: colors.text.secondary }}
              >
                <ChevronLeftIcon />
              </button>
              <div className="min-w-0 flex-1 flex items-center gap-3 overflow-hidden">
                <h1
                  className="text-base font-semibold truncate min-w-0"
                  style={{
                    color: colors.text.primary,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {job.run_name}
                </h1>
                <span
                  className="flex items-center gap-1 text-xs flex-shrink-0"
                  style={{ color: colors.text.secondary }}
                >
                  <DatabaseIcon className="flex-shrink-0" />
                  {job.dataset_name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 relative z-10">
              <div
                className="inline-flex rounded-lg p-0.5"
                style={{ backgroundColor: colors.bg.secondary }}
              >
                <button
                  type="button"
                  onClick={() => setExportFormat("row")}
                  data-selected={exportFormat === "row"}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer border border-transparent text-text-primary hover:bg-black/4 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.06)] data-[selected=true]:bg-bg-primary data-[selected=true]:border-border data-[selected=true]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] data-[selected=true]:hover:bg-bg-primary data-[selected=true]:hover:shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                >
                  <MenuIcon className="w-3.5 h-3.5 pointer-events-none" />
                  Individual Rows
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("grouped")}
                  data-selected={exportFormat === "grouped"}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer border border-transparent text-text-primary hover:bg-black/4 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.06)] data-[selected=true]:bg-bg-primary data-[selected=true]:border-border data-[selected=true]:shadow-[0_1px_2px_rgba(0,0,0,0.08)] data-[selected=true]:hover:bg-bg-primary data-[selected=true]:hover:shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                >
                  <GroupIcon className="pointer-events-none" />
                  Group by Questions
                </button>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="px-3 py-1.5 rounded-md text-xs font-medium border bg-transparent border-border text-text-primary"
              >
                View Config
              </button>
              <button
                onClick={handleExportCSV}
                disabled={!hasScore}
                className="px-3 py-1.5 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: hasScore
                    ? colors.accent.primary
                    : colors.bg.secondary,
                  color: hasScore ? "#fff" : colors.text.secondary,
                  cursor: hasScore ? "pointer" : "not-allowed",
                }}
              >
                Export CSV
              </button>
            </div>
          </div>

          <div
            className="flex-1 overflow-auto p-6"
            style={{ backgroundColor: colors.bg.secondary }}
          >
            <div className="max-w-7xl mx-auto space-y-6">
              {hasScore && isNewFormat ? (
                <div>
                  {summaryScores.some(
                    (s) => job.total_items && s.total_pairs < job.total_items,
                  ) &&
                    isJobInProgress && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-xs bg-amber-500/10 border border-amber-500/30 text-status-warning">
                        <WarningTriangleIcon className="shrink-0" />
                        Some traces are still being scored. Scores shown are
                        partial and may change - click{" "}
                        <strong className="font-semibold">Resync</strong> to get
                        the latest.
                      </div>
                    )}
                  <div className="flex items-center justify-between mb-3">
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: colors.text.secondary }}
                    >
                      Metrics Overview
                    </h3>
                    <button
                      onClick={handleResync}
                      disabled={isResyncing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#171717] text-white disabled:opacity-50"
                    >
                      <RefreshIcon
                        className={isResyncing ? "animate-spin" : ""}
                      />
                      {isResyncing ? "Resyncing..." : "Resync"}
                    </button>
                  </div>
                  {summaryScores.length > 0 ? (
                    <div className="flex gap-4 flex-wrap">
                      {summaryScores
                        .filter((s) => s.data_type === "NUMERIC")
                        .map((summary) => (
                          <div
                            key={summary.name}
                            className="rounded-lg px-6 py-5 text-center flex-1 min-w-[180px] relative"
                            style={{
                              backgroundColor: colors.bg.primary,
                              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
                            }}
                          >
                            <div
                              className="text-xs font-medium mb-2"
                              style={{ color: colors.text.secondary }}
                            >
                              {summary.name}
                            </div>
                            <div
                              className="text-2xl font-bold"
                              style={{ color: colors.text.primary }}
                            >
                              {summary.avg !== undefined
                                ? summary.avg.toFixed(3)
                                : "N/A"}
                            </div>
                            <div
                              className="text-xs mt-1"
                              style={{ color: colors.text.secondary }}
                            >
                              {summary.std !== undefined &&
                                `±${summary.std.toFixed(3)} · `}
                              <span>
                                {summary.total_pairs}
                                {job.total_items &&
                                  summary.total_pairs < job.total_items &&
                                  `/${job.total_items}`}{" "}
                                pairs
                              </span>
                            </div>
                          </div>
                        ))}
                      {summaryScores
                        .filter((s) => s.data_type === "CATEGORICAL")
                        .map((summary) => (
                          <div
                            key={summary.name}
                            className="rounded-lg px-6 py-5 flex-1 min-w-[180px] relative bg-bg-primary"
                            style={{
                              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
                            }}
                          >
                            <div className="text-xs font-medium mb-3 text-center text-text-secondary">
                              {summary.name}
                            </div>
                            <div className="space-y-1">
                              {summary.distribution &&
                                Object.entries(summary.distribution).map(
                                  ([key, value]) => (
                                    <div
                                      key={key}
                                      className="flex justify-between items-center px-3 py-1 rounded bg-bg-secondary"
                                    >
                                      <span className="text-xs font-medium text-text-primary">
                                        {key}
                                      </span>
                                      <span
                                        className="text-xs font-bold"
                                        style={{ color: colors.text.primary }}
                                      >
                                        {value}
                                      </span>
                                    </div>
                                  ),
                                )}
                            </div>
                            <div className="text-xs mt-2 text-center text-text-secondary">
                              <span>
                                {summary.total_pairs}
                                {job.total_items &&
                                  summary.total_pairs < job.total_items &&
                                  `/${job.total_items}`}{" "}
                                pairs
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div
                      className="rounded-lg p-8 text-center"
                      style={{
                        backgroundColor: colors.bg.primary,
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
                      }}
                    >
                      <p
                        className="text-sm"
                        style={{ color: colors.text.secondary }}
                      >
                        No summary scores available
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="rounded-lg p-6 text-center"
                  style={{
                    backgroundColor: colors.bg.primary,
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <p
                    className="text-sm"
                    style={{
                      color: job.error_message
                        ? "hsl(8, 86%, 40%)"
                        : colors.text.secondary,
                    }}
                  >
                    {job.error_message || "No results available yet"}
                  </p>
                </div>
              )}

              {/* Detailed Results */}
              {hasScore && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: colors.text.secondary }}
                    >
                      Detailed Results
                    </h3>
                    {isNewFormat && (
                      <span
                        className="text-xs"
                        style={{ color: colors.text.secondary }}
                      >
                        ({normalizeToIndividualScores(scoreObject).length}{" "}
                        items)
                      </span>
                    )}
                  </div>
                  <DetailedResultsTable job={job} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        job={job}
        assistantConfig={assistantConfig}
      />

      {/* No Traces Modal */}
      {showNoTracesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => setShowNoTracesModal(false)}
        >
          <div
            className="rounded-lg shadow-lg p-6 max-w-md mx-4"
            style={{ backgroundColor: colors.bg.primary }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: colors.text.primary }}
            >
              No Langfuse Traces Available
            </h3>
            <p
              className="text-xs mb-4"
              style={{ color: colors.text.secondary }}
            >
              This evaluation does not have Langfuse traces.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowNoTracesModal(false)}
                className="px-4 py-2 rounded-md text-sm font-medium text-white"
                style={{
                  backgroundColor: colors.accent.primary,
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
