"use client";

import { useState, useEffect } from "react";
import { colors } from "@/app/lib/colors";
import { Tab, Dataset, STTRun, STTResult } from "@/app/lib/types/speechToText";
import { APIKey } from "@/app/lib/types/credentials";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import Loader, { LoaderBox } from "@/app/components/Loader";
import StatusBadge from "@/app/components/StatusBadge";
import { computeWordDiff } from "./TranscriptionDiffViewer";
import { getStatusColor } from "@/app/components/utils";
import AudioPlayerFromUrl from "./AudioPlayerFromUrl";

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
  toast: ReturnType<typeof import("@/app/components/Toast").useToast>;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setActiveTab,
}: EvaluationsTabProps) {
  const { isAuthenticated } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedTranscriptions, setExpandedTranscriptions] = useState<
    Set<number>
  >(new Set());
  const [openScoreInfo, setOpenScoreInfo] = useState<string | null>(null);
  const [scoreInfoPos, setScoreInfoPos] = useState({ top: 0, left: 0 });
  const [playingResultId, setPlayingResultId] = useState<number | null>(null);
  const [loadingRunId, setLoadingRunId] = useState<number | null>(null);

  useEffect(() => {
    setLoadingRunId(null);
  }, [selectedRunId]);

  useEffect(() => {
    if (!openScoreInfo) return;
    const handleClick = () => setOpenScoreInfo(null);
    const handleScroll = () => setOpenScoreInfo(null);
    document.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [openScoreInfo]);

  const toggleTranscription = (resultId: number) => {
    setExpandedTranscriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  const updateFeedback = async (
    resultId: number,
    isCorrect: boolean | null,
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

      // Update local state
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
                Compare transcription quality across STT models
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
                placeholder="e.g., English Podcast Evaluation v1"
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
                <option value="gemini-2.5-pro">gemini-2.5-pro</option>
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
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
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
                  className="p-1.5 rounded"
                  style={{ color: colors.text.secondary }}
                >
                  <svg
                    className={`w-4 h-4 ${isLoadingRuns ? "animate-spin" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
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
                <table className="w-full">
                  <thead>
                    <tr
                      style={{
                        backgroundColor: colors.bg.secondary,
                        borderBottom: `1px solid ${colors.border}`,
                      }}
                    >
                      <th
                        className="text-left px-4 py-3 text-xs font-medium align-top"
                        style={{ color: colors.text.secondary, width: "10%" }}
                      >
                        Sample
                      </th>
                      <th
                        className="text-left px-4 py-3 text-xs font-medium align-top"
                        style={{ color: colors.text.secondary, width: "40%" }}
                      >
                        <div>
                          <div>Ground Truth vs Transcription</div>
                          <div className="flex items-center gap-2 font-normal mt-1">
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="inline-block w-2 h-2 rounded"
                                style={{ backgroundColor: "#fee2e2" }}
                              />
                              <span style={{ color: colors.text.secondary }}>
                                Deletion
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="inline-block w-2 h-2 rounded"
                                style={{ backgroundColor: "#dcfce7" }}
                              />
                              <span style={{ color: colors.text.secondary }}>
                                Insertion
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="inline-block w-2 h-2 rounded"
                                style={{ backgroundColor: "#fef3c7" }}
                              />
                              <span style={{ color: colors.text.secondary }}>
                                Substitution
                              </span>
                            </span>
                          </div>
                        </div>
                      </th>
                      <th
                        className="text-left px-4 py-3 text-xs font-medium align-top"
                        style={{ color: colors.text.secondary, width: "15%" }}
                      >
                        <span className="inline-flex items-center gap-1">
                          Score
                          <span
                            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-normal cursor-pointer shrink-0"
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
                                openScoreInfo ? null : "accuracy",
                              );
                            }}
                          >
                            i
                          </span>
                          {openScoreInfo &&
                            (() => {
                              const metrics = [
                                {
                                  key: "accuracy",
                                  title:
                                    "Accuracy (Word Information Preserved)",
                                  desc: "Measures how much of the original information was correctly captured.",
                                  formula: "WIP = (C / N) × (C / H)",
                                  formulaDesc:
                                    "C = correct words\nN = total words in reference\nH = total words in hypothesis",
                                  example: `Reference:  "the cat sat on the mat" (N=6)\nHypothesis: "a cat sit on mat" (H=5)\nC = 3 (cat, on, mat)\n\nWIP = (3/6) × (3/5)\n    = 0.5 × 0.6 = 0.30 = 30%`,
                                  direction: "Higher is better.",
                                  directionColor: colors.status.success,
                                },
                                {
                                  key: "wer",
                                  title: "WER (Word Error Rate)",
                                  desc: "The most widely used metric in STT evaluation.",
                                  formula: "WER = (S + D + I) / N",
                                  formulaDesc:
                                    "S = substitutions, D = deletions\nI = insertions, N = total words in reference",
                                  example: `Reference:  "the cat sat on the mat" (N=6)\nHypothesis: "a cat sit on mat"\n\nthe → a    (Substitution)\ncat → cat  (Correct)\nsat → sit  (Substitution)\non  → on   (Correct)\nthe → ∅    (Deletion)\nmat → mat  (Correct)\n\nS=2, D=1, I=0\nWER = (2+1+0) / 6 = 0.50 = 50%`,
                                  direction: "Lower is better.",
                                  directionColor: colors.status.error,
                                },
                                {
                                  key: "cer",
                                  title: "CER (Character Error Rate)",
                                  desc: "Same concept as WER but at the character level — more granular, catches partial word errors.",
                                  formula: "CER = (S + D + I) / N",
                                  formulaDesc:
                                    "S, D, I = character-level errors\nN = total characters in reference",
                                  example: `Reference:  "the cat sat" (N=11 chars)\nHypothesis: "the bat set"\n\nt → t  (Correct)\nh → h  (Correct)\ne → e  (Correct)\n· → ·  (Correct)\nc → b  (Substitution)\na → a  (Correct)\nt → t  (Correct)\n· → ·  (Correct)\ns → s  (Correct)\na → e  (Substitution)\nt → t  (Correct)\n\nS=2, D=0, I=0\nCER = 2/11 = 0.18 = 18%`,
                                  direction: "Lower is better.",
                                  directionColor: colors.status.error,
                                },
                                {
                                  key: "lenient_wer",
                                  title: "Lenient WER",
                                  desc: "Same as WER but ignores differences in casing and punctuation — useful when exact formatting doesn't matter.",
                                  formula: "Same as WER after normalizing text",
                                  formulaDesc:
                                    "Normalization: lowercase + remove punctuation",
                                  example: `Reference:  "Hello, World!"\nHypothesis: "hello world"\n\nAfter normalization:\n"hello world" vs "hello world"\n→ exact match\n\nLenient WER = 0%\n(strict WER would be higher)`,
                                  direction: "Lower is better.",
                                  directionColor: colors.status.error,
                                },
                              ];
                              const currentIdx = metrics.findIndex(
                                (m) => m.key === openScoreInfo,
                              );
                              const current =
                                metrics[currentIdx >= 0 ? currentIdx : 0];
                              return (
                                <div
                                  className="fixed z-50 rounded-lg shadow-lg border text-xs"
                                  style={{
                                    backgroundColor: colors.bg.primary,
                                    borderColor: colors.border,
                                    width: "370px",
                                    top: scoreInfoPos.top,
                                    left: scoreInfoPos.left,
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Tab navigation */}
                                  <div
                                    className="flex border-b"
                                    style={{ borderColor: colors.border }}
                                  >
                                    {metrics.map((m, _idx) => (
                                      <button
                                        key={m.key}
                                        className="flex-1 px-2 py-2 text-xs font-medium"
                                        style={{
                                          color:
                                            openScoreInfo === m.key
                                              ? colors.accent.primary
                                              : colors.text.secondary,
                                          borderBottom:
                                            openScoreInfo === m.key
                                              ? `2px solid ${colors.accent.primary}`
                                              : "2px solid transparent",
                                          backgroundColor: "transparent",
                                          cursor: "pointer",
                                        }}
                                        onClick={() => setOpenScoreInfo(m.key)}
                                      >
                                        {m.key === "accuracy"
                                          ? "Accuracy"
                                          : m.key === "wer"
                                            ? "WER"
                                            : m.key === "cer"
                                              ? "CER"
                                              : "Lenient WER"}
                                      </button>
                                    ))}
                                  </div>
                                  {/* Content */}
                                  <div
                                    className="p-3"
                                    style={{
                                      fontFamily:
                                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                    }}
                                  >
                                    <div
                                      className="font-semibold mb-2"
                                      style={{ color: colors.text.primary }}
                                    >
                                      {current.title}
                                    </div>
                                    <p
                                      className="mb-2"
                                      style={{
                                        color: colors.text.secondary,
                                        fontFamily: "system-ui, sans-serif",
                                      }}
                                    >
                                      {current.desc}
                                    </p>
                                    <div
                                      className="mb-1 font-semibold"
                                      style={{ color: colors.text.primary }}
                                    >
                                      Formula
                                    </div>
                                    <div
                                      className="mb-2 p-2 rounded whitespace-pre-wrap"
                                      style={{
                                        backgroundColor: colors.bg.secondary,
                                        color: colors.text.primary,
                                      }}
                                    >
                                      {current.formula}
                                      {"\n"}
                                      <span
                                        style={{ color: colors.text.secondary }}
                                      >
                                        {current.formulaDesc}
                                      </span>
                                    </div>
                                    <div
                                      className="mb-1 font-semibold"
                                      style={{ color: colors.text.primary }}
                                    >
                                      Example
                                    </div>
                                    <div
                                      className="p-2 rounded whitespace-pre-wrap"
                                      style={{
                                        backgroundColor: colors.bg.secondary,
                                        color: colors.text.primary,
                                        lineHeight: "1.6",
                                      }}
                                    >
                                      {current.example}
                                    </div>
                                    <div
                                      className="mt-2 font-semibold"
                                      style={{ color: current.directionColor }}
                                    >
                                      {current.direction}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                        </span>
                      </th>
                      <th
                        className="text-left px-4 py-3 text-xs font-medium align-top"
                        style={{ color: colors.text.secondary, width: "8%" }}
                      >
                        Is Correct
                      </th>
                      <th
                        className="text-left px-4 py-3 text-xs font-medium align-top"
                        style={{ color: colors.text.secondary, width: "27%" }}
                      >
                        Comment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr
                        key={result.id}
                        style={{ borderBottom: `1px solid ${colors.border}` }}
                      >
                        <td className="px-4 py-3 text-sm align-top">
                          {result.signedUrl ? (
                            <AudioPlayerFromUrl
                              signedUrl={result.signedUrl}
                              sampleName={result.sampleName}
                              isPlaying={playingResultId === result.id}
                              onPlayToggle={() =>
                                setPlayingResultId(
                                  playingResultId === result.id
                                    ? null
                                    : result.id,
                                )
                              }
                            />
                          ) : (
                            <div
                              className="font-medium"
                              style={{ color: colors.text.primary }}
                            >
                              {result.sampleName || "-"}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm align-top">
                          {(() => {
                            const hasBoth =
                              result.groundTruth && result.transcription;
                            const segments = hasBoth
                              ? computeWordDiff(
                                  result.groundTruth,
                                  result.transcription,
                                )
                              : [];
                            const isExpanded = expandedTranscriptions.has(
                              result.id,
                            );
                            return (
                              <div>
                                <div
                                  className="grid grid-cols-2 rounded-md overflow-hidden border"
                                  style={{
                                    borderColor: colors.border,
                                    fontFamily:
                                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                                    fontSize: "12px",
                                  }}
                                >
                                  {/* Left Panel - Ground Truth */}
                                  <div>
                                    <div
                                      className="px-2 py-1.5 text-xs font-semibold border-b"
                                      style={{
                                        backgroundColor: colors.bg.secondary,
                                        borderColor: colors.border,
                                        color: colors.text.secondary,
                                      }}
                                    >
                                      Ground Truth
                                    </div>
                                    <div
                                      className="px-3 py-2 leading-relaxed"
                                      style={{
                                        backgroundColor: colors.bg.primary,
                                        ...(!isExpanded
                                          ? {
                                              display: "-webkit-box",
                                              WebkitLineClamp: 3,
                                              WebkitBoxOrient:
                                                "vertical" as const,
                                              overflow: "hidden",
                                            }
                                          : {}),
                                      }}
                                    >
                                      {hasBoth ? (
                                        segments.map((seg, idx) => {
                                          if (seg.type === "insertion")
                                            return null;
                                          const word = seg.reference || "";
                                          return (
                                            <span key={idx}>
                                              <span
                                                className="px-0.5 rounded"
                                                style={{
                                                  backgroundColor:
                                                    seg.type === "substitution"
                                                      ? "#fef3c7"
                                                      : seg.type === "deletion"
                                                        ? "#fee2e2"
                                                        : "transparent",
                                                  textDecoration:
                                                    seg.type === "deletion"
                                                      ? "line-through"
                                                      : "none",
                                                  color:
                                                    seg.type === "deletion"
                                                      ? "#dc2626"
                                                      : colors.text.primary,
                                                }}
                                                title={
                                                  seg.type === "substitution"
                                                    ? `→ "${seg.hypothesis}"`
                                                    : undefined
                                                }
                                              >
                                                {seg.type === "deletion" &&
                                                  "- "}
                                                {word}
                                              </span>{" "}
                                            </span>
                                          );
                                        })
                                      ) : (
                                        <span
                                          style={{
                                            color: colors.text.secondary,
                                          }}
                                        >
                                          {result.groundTruth || "-"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {/* Right Panel - Transcription */}
                                  <div
                                    className="border-l"
                                    style={{ borderColor: colors.border }}
                                  >
                                    <div
                                      className="px-2 py-1.5 text-xs font-semibold border-b"
                                      style={{
                                        backgroundColor: colors.bg.secondary,
                                        borderColor: colors.border,
                                        color: colors.text.secondary,
                                      }}
                                    >
                                      Transcription
                                    </div>
                                    <div
                                      className="px-3 py-2 leading-relaxed"
                                      style={{
                                        backgroundColor: colors.bg.primary,
                                        ...(!isExpanded
                                          ? {
                                              display: "-webkit-box",
                                              WebkitLineClamp: 3,
                                              WebkitBoxOrient:
                                                "vertical" as const,
                                              overflow: "hidden",
                                            }
                                          : {}),
                                      }}
                                    >
                                      {hasBoth ? (
                                        segments.map((seg, idx) => {
                                          if (seg.type === "deletion") {
                                            return (
                                              <span key={idx}>
                                                <span
                                                  className="px-0.5 rounded"
                                                  style={{
                                                    backgroundColor: "#fee2e2",
                                                    color: "#dc2626",
                                                  }}
                                                  title={`Missing: "${seg.reference}"`}
                                                >
                                                  ___
                                                </span>{" "}
                                              </span>
                                            );
                                          }
                                          const word =
                                            seg.hypothesis ||
                                            seg.reference ||
                                            "";
                                          return (
                                            <span key={idx}>
                                              <span
                                                className="px-0.5 rounded"
                                                style={{
                                                  backgroundColor:
                                                    seg.type === "substitution"
                                                      ? "#fef3c7"
                                                      : seg.type === "insertion"
                                                        ? "#dcfce7"
                                                        : "transparent",
                                                  color:
                                                    seg.type === "insertion"
                                                      ? "#16a34a"
                                                      : colors.text.primary,
                                                  fontWeight:
                                                    seg.type === "insertion"
                                                      ? 500
                                                      : "normal",
                                                }}
                                                title={
                                                  seg.type === "substitution"
                                                    ? `Was: "${seg.reference}"`
                                                    : seg.type === "insertion"
                                                      ? "Inserted"
                                                      : undefined
                                                }
                                              >
                                                {seg.type === "insertion" &&
                                                  "+ "}
                                                {word}
                                              </span>{" "}
                                            </span>
                                          );
                                        })
                                      ) : (
                                        <span
                                          style={{
                                            color: colors.text.secondary,
                                          }}
                                        >
                                          {result.transcription || "-"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {hasBoth &&
                                  (result.groundTruth!.length > 100 ||
                                    result.transcription!.length > 100) && (
                                    <button
                                      onClick={() =>
                                        toggleTranscription(result.id)
                                      }
                                      className="text-xs mt-1.5"
                                      style={{
                                        color: colors.accent.primary,
                                        cursor: "pointer",
                                      }}
                                    >
                                      {isExpanded ? "Show less" : "Expand"}
                                    </button>
                                  )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-xs align-top">
                          {result.score ? (
                            <div className="space-y-2">
                              <div className="flex justify-between gap-2">
                                <span style={{ color: colors.text.secondary }}>
                                  Accuracy
                                </span>
                                <span
                                  className="font-mono font-medium"
                                  style={{
                                    color:
                                      result.score.wip >= 0.9
                                        ? colors.status.success
                                        : result.score.wip >= 0.7
                                          ? "#ca8a04"
                                          : colors.status.error,
                                  }}
                                >
                                  {(result.score.wip * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div>
                                <div
                                  className="mb-1"
                                  style={{
                                    color: colors.text.secondary,
                                    fontSize: "10px",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                  }}
                                >
                                  Errors
                                </div>
                                <div
                                  className="space-y-1 pl-1"
                                  style={{
                                    borderLeft: `2px solid ${colors.border}`,
                                  }}
                                >
                                  {[
                                    { label: "WER", value: result.score.wer },
                                    { label: "CER", value: result.score.cer },
                                    {
                                      label: "Lenient WER",
                                      value: result.score.lenient_wer,
                                    },
                                  ].map(({ label, value }) => (
                                    <div
                                      key={label}
                                      className="flex justify-between gap-2 pl-1.5"
                                    >
                                      <span
                                        style={{ color: colors.text.secondary }}
                                      >
                                        {label}
                                      </span>
                                      <span
                                        className="font-mono font-medium"
                                        style={{
                                          color:
                                            value >= 0.8
                                              ? colors.status.error
                                              : value >= 0.4
                                                ? "#ca8a04"
                                                : colors.status.success,
                                        }}
                                      >
                                        {(value * 100).toFixed(1)}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: colors.text.secondary }}>
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm align-top">
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
                            className="px-3 py-1.5 border rounded text-xs font-medium"
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
                              cursor: "pointer",
                            }}
                          >
                            <option value="">-</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm align-top">
                          <div className="flex items-start gap-2">
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
                                updateFeedback(
                                  result.id,
                                  result.is_correct!,
                                  e.target.value,
                                );
                              }}
                              placeholder="Add your comment..."
                              rows={2}
                              className="flex-1 px-3 py-2 border rounded text-sm"
                              style={{
                                backgroundColor: colors.bg.primary,
                                borderColor: colors.border,
                                color: colors.text.primary,
                                resize: "vertical",
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
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
                          className="rounded-lg overflow-hidden bg-bg-primary shadow-sm border-l-3"
                          style={{
                            borderLeftColor: statusColor.border,
                          }}
                        >
                          <div className="px-5 py-4">
                            {/* Row 1: Run Name + Status */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div
                                  className="text-sm font-semibold truncate"
                                  style={{ color: colors.text.primary }}
                                >
                                  {run.run_name}
                                </div>
                                {/* Error message */}
                                {run.error_message && (
                                  <div
                                    className="mt-2 text-xs break-words overflow-hidden"
                                    style={{ color: "hsl(8, 86%, 40%)" }}
                                  >
                                    {run.error_message}
                                  </div>
                                )}
                              </div>
                              <StatusBadge status={run.status} size="sm" />
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
