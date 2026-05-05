"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/app/lib/apiClient";
import { Dataset } from "@/app/lib/types/dataset";
import { EvalJob, AssistantConfig, Tab } from "@/app/lib/types/evaluation";
import { useAuth } from "@/app/lib/context/AuthContext";
import { Modal } from "@/app/components";
import EvalRunsList from "./EvalRunsList";
import RunEvaluationForm from "./RunEvaluationForm";

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assistantConfigs, setAssistantConfigs] = useState<
    Map<string, AssistantConfig>
  >(new Map());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const selectedDataset = storedDatasets.find(
    (d) => d.dataset_id.toString() === selectedDatasetId,
  );
  const canRun = Boolean(
    experimentName.trim() &&
    selectedDatasetId &&
    selectedConfigId &&
    selectedConfigVersion &&
    !isEvaluating,
  );

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
    else setIsLoading(false);
  }, [isAuthenticated, fetchEvaluations]);

  const handleRun = async () => {
    const success = await handleRunEvaluation();
    if (success) {
      fetchEvaluations();
      setIsFormModalOpen(false);
    }
  };

  const formProps = {
    storedDatasets,
    selectedDataset,
    selectedDatasetId,
    setSelectedDatasetId,
    selectedConfigId,
    selectedConfigVersion,
    onConfigSelect,
    experimentName,
    setExperimentName,
    isEvaluating,
    canRun,
    onRun: handleRun,
    setActiveTab,
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Evaluation Runs */}
      <EvalRunsList
        evalJobs={evalJobs}
        assistantConfigs={assistantConfigs}
        isLoading={isLoading}
        error={error}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onRefresh={fetchEvaluations}
        onCreateNew={() => setIsFormModalOpen(true)}
      />

      {/* Right Panel - Configuration (lg+ only) */}
      <div
        className="hidden lg:flex shrink-0 border-l flex-col overflow-hidden bg-bg-primary border-border"
        style={{ width: `${leftPanelWidth}px` }}
      >
        <RunEvaluationForm {...formProps} />
      </div>

      {/* Mobile/tablet — form rendered in a modal */}
      <Modal
        open={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title="Run New Evaluation"
        maxWidth="max-w-2xl"
        maxHeight="max-h-[90vh]"
      >
        <RunEvaluationForm {...formProps} />
      </Modal>
    </div>
  );
}
