"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/app/lib/apiClient";
import { colors } from "@/app/lib/colors";
import { Dataset } from "@/app/lib/types/dataset";
import { EvalJob, AssistantConfig } from "@/app/lib/types/evaluation";
import ConfigSelector from "@/app/components/ConfigSelector";
import Loader from "@/app/components/Loader";
import EvalRunCard from "./EvalRunCard";
import EvalDatasetDescription from "./EvalDatasetDescription";
import { useAuth } from "@/app/lib/context/AuthContext";
import { RefreshIcon } from "@/app/components/icons";

type Tab = "datasets" | "evaluations";

export interface EvaluationsTabProps {
  leftPanelWidth: number;
  apiKey: string;
  storedDatasets: Dataset[];
  selectedDatasetId: string;
  setSelectedDatasetId: (id: string) => void;
  selectedConfigId: string;
  selectedConfigVersion: number;
  onConfigSelect: (configId: string, configVersion: number) => void;
  experimentName: string;
  setExperimentName: (name: string) => void;
  isEvaluating: boolean;
  handleRunEvaluation: () => Promise<boolean>;
  setActiveTab: (tab: Tab) => void;
}

export default function EvaluationsTab({
  leftPanelWidth,
  apiKey,
  storedDatasets,
  selectedDatasetId,
  setSelectedDatasetId,
  selectedConfigId,
  selectedConfigVersion,
  onConfigSelect,
  experimentName,
  setExperimentName,
  isEvaluating,
  handleRunEvaluation,
  setActiveTab,
}: EvaluationsTabProps) {
  const [evalJobs, setEvalJobs] = useState<EvalJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistantConfigs, setAssistantConfigs] = useState<
    Map<string, AssistantConfig>
  >(new Map());
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const selectedDataset = storedDatasets.find(
    (d) => d.dataset_id.toString() === selectedDatasetId,
  );
  const canRun =
    experimentName.trim() &&
    selectedDatasetId &&
    selectedConfigId &&
    selectedConfigVersion &&
    !isEvaluating;

  const { isAuthenticated } = useAuth();

  const fetchEvaluations = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<EvalJob[] | { data: EvalJob[] }>(
        "/api/evaluations",
        apiKey,
      );
      setEvalJobs(Array.isArray(data) ? data : data.data || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch evaluation jobs",
      );
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, isAuthenticated]);

  const fetchAssistantConfig = useCallback(
    async (assistantId: string) => {
      if (!isAuthenticated) return;

      try {
        const result = await apiFetch<{
          success: boolean;
          data?: AssistantConfig;
        }>(`/api/assistant/${assistantId}`, apiKey);
        if (result.success && result.data) {
          setAssistantConfigs((prev) =>
            new Map(prev).set(assistantId, result.data!),
          );
        }
      } catch (err) {
        console.error(
          `Failed to fetch assistant config for ${assistantId}:`,
          err,
        );
      }
    },
    [apiKey, isAuthenticated],
  );

  useEffect(() => {
    evalJobs.forEach((job) => {
      if (job.assistant_id && !assistantConfigs.has(job.assistant_id)) {
        fetchAssistantConfig(job.assistant_id);
      }
    });
  }, [evalJobs, assistantConfigs, fetchAssistantConfig]);

  useEffect(() => {
    if (isAuthenticated) fetchEvaluations();
  }, [isAuthenticated, fetchEvaluations]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Configuration */}
      <div
        className="flex-shrink-0 border-r flex flex-col overflow-hidden"
        style={{
          width: `${leftPanelWidth}px`,
          backgroundColor: colors.bg.primary,
          borderColor: colors.border,
        }}
      >
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Page Title */}
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: colors.text.primary }}
            >
              Run New Evaluation
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: colors.text.secondary }}
            >
              Test model responses against your golden datasets
            </p>
          </div>

          {/* Evaluation Name */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: colors.text.secondary }}
            >
              Name *
            </label>
            <input
              type="text"
              value={experimentName}
              onChange={(e) => setExperimentName(e.target.value)}
              placeholder="e.g., test_run_1"
              disabled={isEvaluating}
              className="w-full px-3 py-2 border rounded-md text-sm"
              style={{
                backgroundColor: isEvaluating
                  ? colors.bg.secondary
                  : colors.bg.primary,
                borderColor: colors.border,
                color: colors.text.primary,
              }}
            />
          </div>

          {/* Config Selector */}
          <ConfigSelector
            selectedConfigId={selectedConfigId}
            selectedVersion={selectedConfigVersion}
            onConfigSelect={onConfigSelect}
            disabled={isEvaluating}
            compact
            datasetId={selectedDatasetId}
            experimentName={experimentName}
          />

          {/* Dataset Selection */}
          <div className="pt-2">
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: colors.text.secondary }}
            >
              Select Dataset *
            </label>
            {storedDatasets.length === 0 ? (
              <div
                className="border rounded-md p-8 text-center"
                style={{ borderColor: colors.border }}
              >
                <p className="text-sm" style={{ color: colors.text.secondary }}>
                  No datasets available
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: colors.text.secondary }}
                >
                  Create a dataset first in the{" "}
                  <button
                    onClick={() => setActiveTab("datasets")}
                    className="underline"
                    style={{ color: colors.accent.primary }}
                  >
                    Datasets tab
                  </button>
                </p>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm appearance-none pr-8"
                  style={{
                    backgroundColor: colors.bg.primary,
                    borderColor: colors.border,
                    color: selectedDatasetId
                      ? colors.text.primary
                      : colors.text.secondary,
                  }}
                >
                  <option value="">-- Select a dataset --</option>
                  {storedDatasets.map((dataset) => (
                    <option key={dataset.dataset_id} value={dataset.dataset_id}>
                      {dataset.dataset_name} ({dataset.total_items} items)
                    </option>
                  ))}
                </select>
                <svg
                  className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: colors.text.secondary }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Selected Dataset Info */}
          {selectedDataset && (
            <div
              className="border rounded-lg p-3"
              style={{
                borderColor: colors.status.success,
                backgroundColor: "rgba(22, 163, 74, 0.02)",
              }}
            >
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: colors.status.success }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <div
                    className="text-sm font-medium"
                    style={{ color: colors.text.primary }}
                  >
                    {selectedDataset.dataset_name}
                  </div>
                  {selectedDataset.description && (
                    <EvalDatasetDescription
                      description={selectedDataset.description}
                    />
                  )}
                  <div
                    className="text-xs mt-1"
                    style={{ color: colors.text.secondary }}
                  >
                    {selectedDataset.total_items} items · x
                    {selectedDataset.duplication_factor} duplication
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Run Evaluation Button */}
        <div
          className="flex-shrink-0 border-t px-4 py-3"
          style={{
            borderColor: colors.border,
            backgroundColor: colors.bg.primary,
          }}
        >
          <button
            onClick={async () => {
              const success = await handleRunEvaluation();
              if (success) fetchEvaluations();
            }}
            disabled={!canRun}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: canRun
                ? colors.accent.primary
                : colors.bg.secondary,
              color: canRun ? "#fff" : colors.text.secondary,
              cursor: canRun ? "pointer" : "not-allowed",
            }}
          >
            {isEvaluating ? (
              <>
                <div
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{
                    borderColor: colors.text.secondary,
                    borderTopColor: "transparent",
                  }}
                />
                Running Evaluation...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                Run Evaluation
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Panel - Evaluation Runs */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ backgroundColor: colors.bg.secondary }}
      >
        <div className="flex-1 overflow-auto p-4">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-base font-semibold"
              style={{ color: colors.text.primary }}
            >
              Evaluation Runs
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1 rounded-md text-xs font-medium border appearance-none cursor-pointer pr-7"
                style={{
                  backgroundColor: colors.bg.primary,
                  borderColor: colors.border,
                  color: colors.text.primary,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 6px center",
                }}
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <button
                onClick={fetchEvaluations}
                disabled={isLoading}
                className="p-1.5 rounded text-text-secondary cursor-pointer"
                aria-label="Refresh evaluations"
              >
                <RefreshIcon
                  className={`w-4 h-4 -scale-x-100 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          <div
            className="rounded-lg overflow-visible"
            style={{
              backgroundColor: colors.bg.primary,
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
            }}
          >
            {isLoading && evalJobs.length === 0 && (
              <div className="p-16">
                <Loader size="md" message="Loading evaluation runs..." />
              </div>
            )}

            {error && (
              <div className="p-4">
                <div
                  className="rounded-lg p-3"
                  style={{ backgroundColor: "hsl(8, 86%, 95%)" }}
                >
                  <p className="text-sm" style={{ color: "hsl(8, 86%, 40%)" }}>
                    Error: {error}
                  </p>
                </div>
              </div>
            )}

            {!isLoading && evalJobs.length === 0 && !error && (
              <div className="p-16 text-center">
                <svg
                  className="w-12 h-12 mx-auto mb-3"
                  style={{ color: colors.border }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p
                  className="text-sm font-medium mb-1"
                  style={{ color: colors.text.primary }}
                >
                  No evaluation runs yet
                </p>
                <p className="text-xs" style={{ color: colors.text.secondary }}>
                  Select a dataset and configuration, then run your first
                  evaluation
                </p>
              </div>
            )}

            {evalJobs.length > 0 &&
              (() => {
                const filteredJobs =
                  statusFilter === "all"
                    ? evalJobs
                    : evalJobs.filter(
                        (job) => job.status.toLowerCase() === statusFilter,
                      );
                return filteredJobs.length > 0 ? (
                  <div className="p-4 space-y-3">
                    {filteredJobs.map((job) => (
                      <EvalRunCard
                        key={job.id}
                        job={job}
                        assistantConfig={
                          job.assistant_id
                            ? assistantConfigs.get(job.assistant_id)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-16 text-center">
                    <p
                      className="text-sm font-medium mb-1"
                      style={{ color: colors.text.primary }}
                    >
                      No {statusFilter} runs
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: colors.text.secondary }}
                    >
                      No evaluation runs with status &quot;{statusFilter}&quot;
                    </p>
                  </div>
                );
              })()}
          </div>
        </div>
      </div>
    </div>
  );
}
