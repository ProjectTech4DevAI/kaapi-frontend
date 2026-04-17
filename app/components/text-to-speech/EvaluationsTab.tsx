"use client";

import { useState, useEffect } from "react";
import { colors } from "@/app/lib/colors";
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
import Loader, { LoaderBox } from "@/app/components/Loader";
import { getStatusColor } from "@/app/components/utils";
import { RefreshIcon } from "@/app/components/icons";
import AudioPlayerFromUrl from "./AudioPlayerFromUrl";
import { useToast } from "@/app/components/Toast";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setActiveTab,
}: EvaluationsTabProps) {
  const { isAuthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [playingResultId, setPlayingResultId] = useState<number | null>(null);
  const [loadingRunId, setLoadingRunId] = useState<number | null>(null);

  useEffect(() => {
    setLoadingRunId(null);
  }, [selectedRunId]);
  const [openScoreInfo, setOpenScoreInfo] = useState<string | null>(null);
  const [scoreInfoPos, setScoreInfoPos] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });

  // Close score info tooltip on outside click or scroll
  useEffect(() => {
    if (!openScoreInfo) return;
    const handleClose = () => setOpenScoreInfo(null);
    document.addEventListener("click", handleClose);
    document.addEventListener("scroll", handleClose, true);
    return () => {
      document.removeEventListener("click", handleClose);
      document.removeEventListener("scroll", handleClose, true);
    };
  }, [openScoreInfo]);

  const updateFeedback = async (
    resultId: number,
    isCorrect: boolean | null,
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
      {/* Left Panel - Evaluation Configuration */}
      {selectedRunId === null && (
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
                Evaluate speech synthesis quality across TTS models
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
                value={evaluationName}
                onChange={(e) => setEvaluationName(e.target.value)}
                placeholder="e.g., Hindi TTS Evaluation v1"
                className="w-full px-3 py-2 border rounded-md text-sm"
                style={{
                  backgroundColor: colors.bg.primary,
                  borderColor: colors.border,
                  color: colors.text.primary,
                }}
              />
            </div>

            {/* Model Selection */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: colors.text.secondary }}
              >
                Model *
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
                style={{
                  backgroundColor: colors.bg.primary,
                  borderColor: colors.border,
                  color: colors.text.primary,
                }}
              >
                <option value="gemini-2.5-pro-preview-tts">
                  gemini-2.5-pro-preview-tts
                </option>
              </select>
            </div>

            {/* Dataset Selection */}
            <div className="pt-2">
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ color: colors.text.secondary }}
              >
                Select Dataset *
              </label>
              {isLoadingDatasets ? (
                <LoaderBox message="Loading datasets..." size="sm" />
              ) : datasets.length === 0 ? (
                <div
                  className="border rounded-md p-8 text-center"
                  style={{ borderColor: colors.border }}
                >
                  <p
                    className="text-sm"
                    style={{ color: colors.text.secondary }}
                  >
                    No datasets available
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: colors.text.secondary }}
                  >
                    Create a dataset first in the Datasets tab
                  </p>
                </div>
              ) : (
                <select
                  value={selectedDatasetId || ""}
                  onChange={(e) =>
                    setSelectedDatasetId(
                      e.target.value ? parseInt(e.target.value) : null,
                    )
                  }
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  style={{
                    backgroundColor: colors.bg.primary,
                    borderColor: colors.border,
                    color: colors.text.primary,
                  }}
                >
                  <option value="">-- Select a dataset --</option>
                  {datasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.name} (
                      {dataset.dataset_metadata?.sample_count || 0} samples)
                    </option>
                  ))}
                </select>
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
                      {selectedDataset.name}
                    </div>
                    <div
                      className="text-xs mt-1 space-y-0.5"
                      style={{ color: colors.text.secondary }}
                    >
                      <div>
                        {selectedDataset.dataset_metadata?.sample_count || 0}{" "}
                        samples
                      </div>
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
              onClick={handleRunEvaluation}
              disabled={
                isRunning || !evaluationName.trim() || !selectedDatasetId
              }
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{
                backgroundColor:
                  isRunning || !evaluationName.trim() || !selectedDatasetId
                    ? colors.bg.secondary
                    : colors.accent.primary,
                color:
                  isRunning || !evaluationName.trim() || !selectedDatasetId
                    ? colors.text.secondary
                    : "#fff",
                cursor:
                  isRunning || !evaluationName.trim() || !selectedDatasetId
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {isRunning ? (
                <>
                  <div
                    className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                    style={{
                      borderColor: colors.text.secondary,
                      borderTopColor: "transparent",
                    }}
                  />
                  Starting Evaluation...
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
      )}

      {/* Right Panel - Evaluation Runs List or Results */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ backgroundColor: colors.bg.secondary }}
      >
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              {selectedRunId !== null ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedRunId(null)}
                    className="p-1 rounded"
                    style={{ color: colors.text.secondary }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <h2
                    className="text-base font-semibold"
                    style={{ color: colors.text.primary }}
                  >
                    {runs.find((r) => r.id === selectedRunId)?.run_name}
                  </h2>
                </div>
              ) : (
                <h2
                  className="text-base font-semibold"
                  style={{ color: colors.text.primary }}
                >
                  Evaluation Runs
                </h2>
              )}
            </div>
            {selectedRunId === null && (
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
                  onClick={loadRuns}
                  disabled={isLoadingRuns}
                  className="p-1.5 rounded text-text-secondary"
                >
                  <RefreshIcon
                    className={`w-4 h-4 ${isLoadingRuns ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            )}
          </div>

          <div
            className="rounded-lg overflow-visible"
            style={{
              backgroundColor: colors.bg.primary,
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
            }}
          >
            {selectedRunId !== null ? (
              // Results View
              isLoadingResults ? (
                <div className="p-16">
                  <Loader size="md" message="Loading results..." />
                </div>
              ) : results.length === 0 ? (
                <div className="p-16 text-center">
                  <p
                    className="text-sm font-medium mb-1"
                    style={{ color: colors.text.primary }}
                  >
                    No results found
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: colors.text.secondary }}
                  >
                    This evaluation has no results yet
                  </p>
                </div>
              ) : (
                <table className="w-full" style={{ minWidth: "900px" }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: colors.bg.secondary,
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      <th
                        className="text-left px-4 py-3 text-xs font-medium align-top"
                        style={{ color: colors.text.secondary, width: "24%" }}
                      >
                        Text
                      </th>
                      <th
                        className="text-left px-4 py-3 text-xs font-medium align-top"
                        style={{ color: colors.text.secondary, width: "18%" }}
                      >
                        Audio
                      </th>
                      <th
                        className="text-left px-3 py-3 text-xs font-medium align-top"
                        style={{ color: colors.text.secondary, width: "12%" }}
                      >
                        <div>
                          <div>Speech</div>
                          <div>
                            Naturalness{" "}
                            <span
                              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-normal cursor-pointer align-middle"
                              style={{
                                backgroundColor: colors.bg.primary,
                                border: `1px solid ${colors.border}`,
                                color: colors.text.secondary,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setScoreInfoPos({
                                  top: rect.bottom + 4,
                                  left: rect.left,
                                });
                                setOpenScoreInfo(
                                  openScoreInfo === "speech_naturalness"
                                    ? null
                                    : "speech_naturalness",
                                );
                              }}
                            >
                              i
                            </span>
                            {openScoreInfo === "speech_naturalness" && (
                              <div
                                className="fixed z-50 rounded-lg shadow-lg border text-xs"
                                style={{
                                  backgroundColor: colors.bg.primary,
                                  borderColor: colors.border,
                                  width: "340px",
                                  top: scoreInfoPos.top,
                                  left: scoreInfoPos.left,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-3">
                                  <div
                                    className="font-semibold mb-2"
                                    style={{ color: colors.text.primary }}
                                  >
                                    Speech Naturalness
                                  </div>
                                  <p
                                    className="mb-3"
                                    style={{
                                      color: colors.text.secondary,
                                      fontFamily: "system-ui, sans-serif",
                                    }}
                                  >
                                    Assesses how human-like the generated speech
                                    sounds.
                                  </p>
                                  <div
                                    className="mb-1 font-semibold"
                                    style={{ color: colors.text.primary }}
                                  >
                                    Scoring
                                  </div>
                                  <div
                                    className="space-y-2 p-2 rounded"
                                    style={{
                                      backgroundColor: colors.bg.secondary,
                                    }}
                                  >
                                    <div className="flex">
                                      <span
                                        className="font-semibold shrink-0"
                                        style={{
                                          color: colors.status.success,
                                          width: "62px",
                                        }}
                                      >
                                        High:
                                      </span>
                                      <span
                                        style={{ color: colors.text.primary }}
                                      >
                                        Very human-like, natural flow with
                                        appropriate pauses and inflections.
                                      </span>
                                    </div>
                                    <div className="flex">
                                      <span
                                        className="font-semibold shrink-0"
                                        style={{
                                          color: "#ca8a04",
                                          width: "62px",
                                        }}
                                      >
                                        Medium:
                                      </span>
                                      <span
                                        style={{ color: colors.text.primary }}
                                      >
                                        Some human qualities but with occasional
                                        robotic or awkward elements.
                                      </span>
                                    </div>
                                    <div className="flex">
                                      <span
                                        className="font-semibold shrink-0"
                                        style={{
                                          color: colors.status.error,
                                          width: "62px",
                                        }}
                                      >
                                        Low:
                                      </span>
                                      <span
                                        style={{ color: colors.text.primary }}
                                      >
                                        Clearly robotic or artificial, with
                                        choppy or monotone speech.
                                      </span>
                                    </div>
                                  </div>
                                  <div
                                    className="mt-2 font-semibold"
                                    style={{ color: colors.status.success }}
                                  >
                                    Higher is better.
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </th>
                      <th
                        className="text-left px-3 py-3 text-xs font-medium align-top"
                        style={{ color: colors.text.secondary, width: "12%" }}
                      >
                        <div>
                          <div>Pronunciation</div>
                          <div>
                            Accuracy{" "}
                            <span
                              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-normal cursor-pointer align-middle"
                              style={{
                                backgroundColor: colors.bg.primary,
                                border: `1px solid ${colors.border}`,
                                color: colors.text.secondary,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setScoreInfoPos({
                                  top: rect.bottom + 4,
                                  left: rect.left,
                                });
                                setOpenScoreInfo(
                                  openScoreInfo === "pronunciation_accuracy"
                                    ? null
                                    : "pronunciation_accuracy",
                                );
                              }}
                            >
                              i
                            </span>
                            {openScoreInfo === "pronunciation_accuracy" && (
                              <div
                                className="fixed z-50 rounded-lg shadow-lg border text-xs"
                                style={{
                                  backgroundColor: colors.bg.primary,
                                  borderColor: colors.border,
                                  width: "340px",
                                  top: scoreInfoPos.top,
                                  left: scoreInfoPos.left,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-3">
                                  <div
                                    className="font-semibold mb-2"
                                    style={{ color: colors.text.primary }}
                                  >
                                    Pronunciation Accuracy
                                  </div>
                                  <p
                                    className="mb-3"
                                    style={{
                                      color: colors.text.secondary,
                                      fontFamily: "system-ui, sans-serif",
                                    }}
                                  >
                                    Evaluates how clearly and correctly words
                                    are pronounced in the TTS output.
                                  </p>
                                  <div
                                    className="mb-1 font-semibold"
                                    style={{ color: colors.text.primary }}
                                  >
                                    Scoring
                                  </div>
                                  <div
                                    className="space-y-2 p-2 rounded"
                                    style={{
                                      backgroundColor: colors.bg.secondary,
                                    }}
                                  >
                                    <div className="flex">
                                      <span
                                        className="font-semibold shrink-0"
                                        style={{
                                          color: colors.status.success,
                                          width: "62px",
                                        }}
                                      >
                                        High:
                                      </span>
                                      <span
                                        style={{ color: colors.text.primary }}
                                      >
                                        All words are pronounced clearly and
                                        correctly.
                                      </span>
                                    </div>
                                    <div className="flex">
                                      <span
                                        className="font-semibold shrink-0"
                                        style={{
                                          color: "#ca8a04",
                                          width: "62px",
                                        }}
                                      >
                                        Medium:
                                      </span>
                                      <span
                                        style={{ color: colors.text.primary }}
                                      >
                                        1-2 words are mispronounced or unclear.
                                      </span>
                                    </div>
                                    <div className="flex">
                                      <span
                                        className="font-semibold shrink-0"
                                        style={{
                                          color: colors.status.error,
                                          width: "62px",
                                        }}
                                      >
                                        Low:
                                      </span>
                                      <span
                                        style={{ color: colors.text.primary }}
                                      >
                                        3 or more words are mispronounced or
                                        difficult to understand.
                                      </span>
                                    </div>
                                  </div>
                                  <div
                                    className="mt-2 font-semibold"
                                    style={{ color: colors.status.success }}
                                  >
                                    Higher is better.
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </th>
                      <th
                        className="text-left px-3 py-3 text-xs font-medium align-top"
                        style={{ color: colors.text.secondary, width: "12%" }}
                      >
                        Is Correct
                      </th>
                      <th
                        className="text-left px-4 py-3 text-xs font-medium align-top"
                        style={{ color: colors.text.secondary, width: "18%" }}
                      >
                        Comment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, idx) => {
                      return (
                        <tr
                          key={result.id}
                          style={{ borderBottom: `1px solid ${colors.border}` }}
                        >
                          <td
                            className="px-4 py-3 text-sm align-top"
                            style={{ color: colors.text.primary }}
                          >
                            <div
                              className="overflow-y-auto"
                              style={{
                                maxHeight: "80px",
                                lineHeight: "1.5",
                              }}
                            >
                              {result.sample_text || "-"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm align-top">
                            {result.signedUrl ? (
                              <AudioPlayerFromUrl
                                signedUrl={result.signedUrl}
                                isPlaying={playingResultId === result.id}
                                onPlayToggle={() =>
                                  setPlayingResultId(
                                    playingResultId === result.id
                                      ? null
                                      : result.id,
                                  )
                                }
                                sampleLabel={`Sample ${idx + 1}`}
                                durationSeconds={result.duration_seconds}
                                sizeBytes={result.size_bytes}
                              />
                            ) : (
                              <span
                                className="text-xs"
                                style={{ color: colors.text.secondary }}
                              >
                                {result.status === "SUCCESS"
                                  ? "No audio available"
                                  : "-"}
                              </span>
                            )}
                          </td>
                          {(() => {
                            const snVal =
                              result.score?.["Speech Naturalness"] ||
                              result.score?.speech_naturalness ||
                              "";
                            const normalizedSn = snVal
                              ? snVal.charAt(0).toUpperCase() +
                                snVal.slice(1).toLowerCase()
                              : "";
                            return (
                              <td className="px-3 py-3 text-sm align-top">
                                <select
                                  value={normalizedSn}
                                  onChange={(e) => {
                                    const value = e.target.value || null;
                                    const newScore = {
                                      ...(result.score || {}),
                                      "Speech Naturalness": value,
                                    };
                                    setResults((prev) =>
                                      prev.map((r) =>
                                        r.id === result.id
                                          ? { ...r, score: newScore }
                                          : r,
                                      ),
                                    );
                                    updateFeedback(
                                      result.id,
                                      result.is_correct,
                                      undefined,
                                      { "Speech Naturalness": value },
                                    );
                                  }}
                                  disabled={result.status !== "SUCCESS"}
                                  className="w-full px-2 py-1.5 border rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: !normalizedSn
                                      ? colors.bg.primary
                                      : normalizedSn === "High"
                                        ? "rgba(22, 163, 74, 0.1)"
                                        : normalizedSn === "Medium"
                                          ? "rgba(234, 179, 8, 0.1)"
                                          : "rgba(239, 68, 68, 0.1)",
                                    borderColor: !normalizedSn
                                      ? colors.border
                                      : normalizedSn === "High"
                                        ? colors.status.success
                                        : normalizedSn === "Medium"
                                          ? "#eab308"
                                          : colors.status.error,
                                    color: !normalizedSn
                                      ? colors.text.primary
                                      : normalizedSn === "High"
                                        ? colors.status.success
                                        : normalizedSn === "Medium"
                                          ? "#ca8a04"
                                          : colors.status.error,
                                    cursor:
                                      result.status === "SUCCESS"
                                        ? "pointer"
                                        : "not-allowed",
                                    opacity:
                                      result.status === "SUCCESS" ? 1 : 0.5,
                                  }}
                                >
                                  <option value="">-</option>
                                  <option value="High">High</option>
                                  <option value="Medium">Medium</option>
                                  <option value="Low">Low</option>
                                </select>
                              </td>
                            );
                          })()}
                          {(() => {
                            const paVal =
                              result.score?.["Pronunciation Accuracy"] ||
                              result.score?.pronunciation_accuracy ||
                              "";
                            const normalizedPa = paVal
                              ? paVal.charAt(0).toUpperCase() +
                                paVal.slice(1).toLowerCase()
                              : "";
                            return (
                              <td className="px-3 py-3 text-sm align-top">
                                <select
                                  value={normalizedPa}
                                  onChange={(e) => {
                                    const value = e.target.value || null;
                                    const newScore = {
                                      ...(result.score || {}),
                                      "Pronunciation Accuracy": value,
                                    };
                                    setResults((prev) =>
                                      prev.map((r) =>
                                        r.id === result.id
                                          ? { ...r, score: newScore }
                                          : r,
                                      ),
                                    );
                                    updateFeedback(
                                      result.id,
                                      result.is_correct,
                                      undefined,
                                      { "Pronunciation Accuracy": value },
                                    );
                                  }}
                                  disabled={result.status !== "SUCCESS"}
                                  className="w-full px-2 py-1.5 border rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: !normalizedPa
                                      ? colors.bg.primary
                                      : normalizedPa === "High"
                                        ? "rgba(22, 163, 74, 0.1)"
                                        : normalizedPa === "Medium"
                                          ? "rgba(234, 179, 8, 0.1)"
                                          : "rgba(239, 68, 68, 0.1)",
                                    borderColor: !normalizedPa
                                      ? colors.border
                                      : normalizedPa === "High"
                                        ? colors.status.success
                                        : normalizedPa === "Medium"
                                          ? "#eab308"
                                          : colors.status.error,
                                    color: !normalizedPa
                                      ? colors.text.primary
                                      : normalizedPa === "High"
                                        ? colors.status.success
                                        : normalizedPa === "Medium"
                                          ? "#ca8a04"
                                          : colors.status.error,
                                    cursor:
                                      result.status === "SUCCESS"
                                        ? "pointer"
                                        : "not-allowed",
                                    opacity:
                                      result.status === "SUCCESS" ? 1 : 0.5,
                                  }}
                                >
                                  <option value="">-</option>
                                  <option value="High">High</option>
                                  <option value="Medium">Medium</option>
                                  <option value="Low">Low</option>
                                </select>
                              </td>
                            );
                          })()}
                          <td className="px-3 py-3 text-sm align-top">
                            <select
                              value={
                                result.is_correct === null
                                  ? ""
                                  : result.is_correct
                                    ? "true"
                                    : "false"
                              }
                              onChange={(e) => {
                                const value = e.target.value;
                                updateFeedback(
                                  result.id,
                                  value === "" ? null : value === "true",
                                );
                              }}
                              disabled={result.status !== "SUCCESS"}
                              className="w-full px-2 py-1.5 border rounded text-xs font-medium"
                              style={{
                                backgroundColor:
                                  result.is_correct === null
                                    ? colors.bg.primary
                                    : result.is_correct
                                      ? "rgba(22, 163, 74, 0.1)"
                                      : "rgba(239, 68, 68, 0.1)",
                                borderColor:
                                  result.is_correct === null
                                    ? colors.border
                                    : result.is_correct
                                      ? colors.status.success
                                      : colors.status.error,
                                color:
                                  result.is_correct === null
                                    ? colors.text.primary
                                    : result.is_correct
                                      ? colors.status.success
                                      : colors.status.error,
                                cursor:
                                  result.status === "SUCCESS"
                                    ? "pointer"
                                    : "not-allowed",
                                opacity: result.status === "SUCCESS" ? 1 : 0.5,
                              }}
                            >
                              <option value="">-</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-sm align-top">
                            <textarea
                              value={result.comment || ""}
                              onChange={(e) => {
                                setResults((prev) =>
                                  prev.map((r) =>
                                    r.id === result.id
                                      ? { ...r, comment: e.target.value }
                                      : r,
                                  ),
                                );
                              }}
                              onBlur={(e) => {
                                if (result.status === "SUCCESS") {
                                  updateFeedback(
                                    result.id,
                                    result.is_correct,
                                    e.target.value,
                                  );
                                }
                              }}
                              placeholder="Add comment..."
                              rows={2}
                              disabled={result.status !== "SUCCESS"}
                              className="w-full px-2 py-1.5 border rounded text-xs"
                              style={{
                                backgroundColor: colors.bg.primary,
                                borderColor: colors.border,
                                color: colors.text.primary,
                                resize: "vertical",
                                opacity: result.status === "SUCCESS" ? 1 : 0.5,
                                cursor:
                                  result.status === "SUCCESS"
                                    ? "text"
                                    : "not-allowed",
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : // Runs List View
            isLoadingRuns ? (
              <div className="p-16">
                <Loader size="md" message="Loading evaluation runs..." />
              </div>
            ) : runs.length === 0 ? (
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
                  Run your first evaluation to get started
                </p>
              </div>
            ) : (
              (() => {
                const filteredRuns =
                  statusFilter === "all"
                    ? runs
                    : runs.filter(
                        (r) => r.status.toLowerCase() === statusFilter,
                      );
                return filteredRuns.length > 0 ? (
                  <div className="p-4 space-y-3">
                    {filteredRuns.map((run) => {
                      const isCompleted =
                        run.status.toLowerCase() === "completed";
                      const statusColor = getStatusColor(run.status);
                      return (
                        <div
                          key={run.id}
                          className={`rounded-lg overflow-hidden bg-bg-primary shadow-sm border-l-3 ${statusColor.border}`}
                        >
                          <div className="px-5 py-4">
                            {/* Row 1: Run Name + Status */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold truncate text-text-primary">
                                  {run.run_name}
                                </div>
                                {/* Error message */}
                                {run.error_message && (
                                  <div className="mt-2 text-xs wrap-break-word overflow-hidden text-status-error-text">
                                    {run.error_message}
                                  </div>
                                )}
                              </div>
                              <span
                                className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide shrink-0 ${statusColor.bg} ${statusColor.text}`}
                              >
                                {run.status}
                              </span>
                            </div>

                            {/* Row 2: Dataset + Models (left) | Actions (right) */}
                            <div className="flex items-center justify-between gap-4 mt-3">
                              <div
                                className="flex items-center gap-3 text-xs"
                                style={{ color: colors.text.secondary }}
                              >
                                <span className="flex items-center gap-1.5">
                                  <svg
                                    className="w-3.5 h-3.5 flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M4 7v10c0 2 3.6 3 8 3s8-1 8-3V7M4 7c0 2 3.6 3 8 3s8-1 8-3M4 7c0-2 3.6-3 8-3s8 1 8 3M4 12c0 2 3.6 3 8 3s8-1 8-3"
                                    />
                                  </svg>
                                  {run.dataset_name}
                                </span>
                                {run.models && run.models.length > 0 && (
                                  <span
                                    className="px-1.5 py-0.5 rounded"
                                    style={{
                                      backgroundColor: colors.bg.secondary,
                                    }}
                                  >
                                    {run.models.join(", ")}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={
                                  isCompleted && loadingRunId === null
                                    ? () => {
                                        setLoadingRunId(run.id);
                                        loadResults(run.id);
                                      }
                                    : undefined
                                }
                                disabled={!isCompleted || loadingRunId !== null}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium border flex-shrink-0 flex items-center gap-1.5"
                                style={{
                                  backgroundColor: "transparent",
                                  borderColor: colors.border,
                                  color: isCompleted
                                    ? colors.text.primary
                                    : colors.text.secondary,
                                  cursor:
                                    isCompleted && loadingRunId === null
                                      ? "pointer"
                                      : "not-allowed",
                                  opacity:
                                    isCompleted && loadingRunId === null
                                      ? 1
                                      : 0.5,
                                }}
                              >
                                {loadingRunId === run.id && (
                                  <div
                                    className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                                    style={{
                                      borderColor: colors.text.secondary,
                                      borderTopColor: "transparent",
                                    }}
                                  />
                                )}
                                {loadingRunId === run.id
                                  ? "Loading..."
                                  : "View Results"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
              })()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
