"use client";

import {
  TTSTab,
  TTSDataset,
  TTSRun,
  TTSResult,
  TTSScore,
  TTSFeedbackPayload,
} from "@/app/lib/types/textToSpeech";
import { APIKey } from "@/app/lib/types/credentials";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import { useToast } from "@/app/components/ui/Toast";
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
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  isRunning: boolean;
  handleRunEvaluation: () => void;
  runs: TTSRun[];
  isLoadingRuns: boolean;
  loadRuns: () => void;
  selectedRunId: number | null;
  setSelectedRunId: (id: number | null) => void;
  results: TTSResult[];
  setResults: React.Dispatch<React.SetStateAction<TTSResult[]>>;
  isLoadingResults: boolean;
  loadResults: (runId: number) => void;
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
    score?: TTSScore,
  ) => {
    if (!isAuthenticated) return;

    try {
      const payload: TTSFeedbackPayload = {};
      if (isCorrect !== undefined) payload.is_correct = isCorrect;
      if (comment !== undefined) payload.comment = comment;
      if (score !== undefined) payload.score = score;

      await apiFetch<TTSResult>(
        `/api/evaluations/tts/results/${resultId}`,
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
                ...(score !== undefined && {
                  score: { ...(r.score || {}), ...score },
                }),
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
