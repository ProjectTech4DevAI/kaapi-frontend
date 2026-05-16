"use client";

import { Dataset, STTRun, STTResult } from "@/app/lib/types/speechToText";
import { APIKey } from "@/app/lib/types/credentials";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import STTRunsList from "./STTRunsList";
import RunSTTEvaluationForm from "./RunSTTEvaluationForm";
import { Tab } from "@/app/lib/types/evaluation";

export interface EvaluationsTabProps {
  leftPanelWidth: number;
  evaluationName: string;
  setEvaluationName: (name: string) => void;
  datasets: Dataset[];
  isLoadingDatasets: boolean;
  selectedDatasetId: number | null;
  setSelectedDatasetId: (id: number | null) => void;
  selectedDataset: Dataset | undefined;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  isRunning: boolean;
  handleRunEvaluation: () => void;
  runs: STTRun[];
  isLoadingRuns: boolean;
  loadRuns: () => void;
  selectedRunId: number | null;
  setSelectedRunId: (id: number | null) => void;
  results: STTResult[];
  setResults: React.Dispatch<React.SetStateAction<STTResult[]>>;
  isLoadingResults: boolean;
  loadResults: (runId: number) => void;
  apiKeys: APIKey[];
  toast: ReturnType<typeof import("@/app/components/ui/Toast").useToast>;
  setActiveTab: (tab: Tab) => void;
}

export default function EvaluationsTab({
  leftPanelWidth,
  evaluationName,
  setEvaluationName,
  datasets,
  isLoadingDatasets,
  selectedDatasetId,
  setSelectedDatasetId,
  selectedDataset,
  selectedModel,
  setSelectedModel,
  isRunning,
  handleRunEvaluation,
  runs,
  isLoadingRuns,
  loadRuns,
  selectedRunId,
  setSelectedRunId,
  results,
  setResults,
  isLoadingResults,
  loadResults,
  apiKeys,
  toast,
}: EvaluationsTabProps) {
  const { isAuthenticated } = useAuth();

  const updateFeedback = async (
    resultId: number,
    isCorrect: boolean | null | undefined,
    comment?: string,
  ) => {
    if (!isAuthenticated) return;

    try {
      const payload: { is_correct?: boolean | null; comment?: string } = {};
      if (isCorrect !== undefined) payload.is_correct = isCorrect;
      if (comment !== undefined) payload.comment = comment;

      await apiFetch<STTResult>(
        `/api/evaluations/stt/results/${resultId}`,
        apiKeys[0]?.key ?? "",
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      setResults((prev) =>
        prev.map((r) =>
          r.id === resultId
            ? {
                ...r,
                ...(isCorrect !== undefined ? { is_correct: isCorrect } : {}),
                ...(comment !== undefined && { comment }),
              }
            : r,
        ),
      );
    } catch (error) {
      console.error("Failed to update feedback:", error);
      toast.error("Failed to update feedback");
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Evaluation Runs List or Results */}
      <STTRunsList
        runs={runs}
        isLoadingRuns={isLoadingRuns}
        loadRuns={loadRuns}
        selectedRunId={selectedRunId}
        setSelectedRunId={setSelectedRunId}
        results={results}
        setResults={setResults}
        isLoadingResults={isLoadingResults}
        loadResults={loadResults}
        onUpdateFeedback={updateFeedback}
      />

      {/* Right Panel - Evaluation Configuration */}
      {selectedRunId === null && (
        <div
          className="shrink-0 border-l flex flex-col overflow-hidden bg-bg-primary border-border"
          style={{ width: `${leftPanelWidth}px` }}
        >
          <RunSTTEvaluationForm
            evaluationName={evaluationName}
            setEvaluationName={setEvaluationName}
            datasets={datasets}
            isLoadingDatasets={isLoadingDatasets}
            selectedDatasetId={selectedDatasetId}
            setSelectedDatasetId={setSelectedDatasetId}
            selectedDataset={selectedDataset}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            isRunning={isRunning}
            handleRunEvaluation={handleRunEvaluation}
          />
        </div>
      )}
    </div>
  );
}
