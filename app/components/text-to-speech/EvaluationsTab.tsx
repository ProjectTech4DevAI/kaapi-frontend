"use client";

import {
  TTSTab,
  TTSDataset,
  TTSRun,
  TTSResult,
  TTSFeedbackPayload,
  TTSModelVoice,
  LoadOptions,
} from "@/app/lib/types/textToSpeech";
import { APIKey } from "@/app/lib/types/credentials";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import { useToast } from "@/app/hooks/useToast";
import TTSRunsList from "./TTSRunsList";
import RunTTSEvaluationForm from "./RunTTSEvaluationForm";

export interface EvaluationsTabProps {
  leftPanelWidth: number;
  evaluationName: string;
  setEvaluationName: (name: string) => void;
  datasets: TTSDataset[];
  isLoadingDatasets: boolean;
  selectedDatasetId: number | null;
  setSelectedDatasetId: (id: number | null) => void;
  selectedDataset: TTSDataset | undefined;
  selectedModels: TTSModelVoice[];
  setSelectedModels: (models: TTSModelVoice[]) => void;
  isRunning: boolean;
  handleRunEvaluation: () => void;
  runs: TTSRun[];
  isLoadingRuns: boolean;
  loadRuns: (opts?: LoadOptions) => void;
  selectedRunId: number | null;
  setSelectedRunId: (id: number | null) => void;
  results: TTSResult[];
  setResults: React.Dispatch<React.SetStateAction<TTSResult[]>>;
  isLoadingResults: boolean;
  loadResults: (runId: number, opts?: LoadOptions) => void;
  apiKeys: APIKey[];
  toast: ReturnType<typeof useToast>;
  setActiveTab: (tab: TTSTab) => void;
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
  selectedModels,
  setSelectedModels,
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
    payload: TTSFeedbackPayload,
  ) => {
    if (!isAuthenticated) return;

    try {
      await apiFetch<TTSResult>(
        `/api/evaluations/tts/results/${resultId}`,
        apiKeys[0]?.key ?? "",
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
    } catch (error) {
      console.error("Failed to update feedback:", error);
      toast.error("Failed to update feedback");
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <TTSRunsList
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

      {selectedRunId === null && (
        <div
          className="shrink-0 border-l flex flex-col overflow-hidden bg-bg-primary border-border"
          style={{ width: `${leftPanelWidth}px` }}
        >
          <RunTTSEvaluationForm
            evaluationName={evaluationName}
            setEvaluationName={setEvaluationName}
            datasets={datasets}
            isLoadingDatasets={isLoadingDatasets}
            selectedDatasetId={selectedDatasetId}
            setSelectedDatasetId={setSelectedDatasetId}
            selectedDataset={selectedDataset}
            selectedModels={selectedModels}
            setSelectedModels={setSelectedModels}
            isRunning={isRunning}
            handleRunEvaluation={handleRunEvaluation}
          />
        </div>
      )}
    </div>
  );
}
