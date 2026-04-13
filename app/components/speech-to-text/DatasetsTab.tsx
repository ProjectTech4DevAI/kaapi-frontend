"use client";

import { useState, useEffect } from "react";
import { colors } from "@/app/lib/colors";
import {
  AudioFile,
  Dataset,
  Language,
  STTSample,
} from "@/app/lib/types/speechToText";
import { APIKey } from "@/app/lib/types/credentials";
import { useToast } from "@/app/components/Toast";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import Loader from "@/app/components/Loader";
import AudioPlayer from "./AudioPlayer";
import AudioPlayerFromUrl from "./AudioPlayerFromUrl";
import DatasetDescription from "./DatasetDescription";

export interface DatasetsTabProps {
  leftPanelWidth: number;
  datasetName: string;
  setDatasetName: (name: string) => void;
  datasetDescription: string;
  setDatasetDescription: (desc: string) => void;
  datasetLanguageId: number;
  setDatasetLanguageId: (id: number) => void;
  audioFiles: AudioFile[];
  setAudioFiles: React.Dispatch<React.SetStateAction<AudioFile[]>>;
  playingFileId: string | null;
  setPlayingFileId: (id: string | null) => void;
  handleAudioFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  triggerAudioUpload: () => void;
  removeAudioFile: (id: string) => void;
  updateGroundTruth: (id: string, groundTruth: string) => void;
  updateFileLanguage: (id: string, languageId: number) => void;
  formatFileSize: (bytes: number) => string;
  isCreating: boolean;
  handleCreateDataset: () => void;
  datasets: Dataset[];
  isLoadingDatasets: boolean;
  loadDatasets: () => void;
  apiKeys: APIKey[];
  languages: Language[];
  toast: ReturnType<typeof useToast>;
}

export default function DatasetsTab({
  leftPanelWidth,
  datasetName,
  setDatasetName,
  datasetDescription,
  setDatasetDescription,
  datasetLanguageId,
  setDatasetLanguageId,
  audioFiles,
  setAudioFiles,
  playingFileId,
  setPlayingFileId,
  handleAudioFileSelect,
  triggerAudioUpload,
  removeAudioFile,
  updateGroundTruth,
  updateFileLanguage,
  formatFileSize,
  isCreating,
  handleCreateDataset,
  datasets,
  isLoadingDatasets,
  apiKeys,
  languages,
  toast,
}: DatasetsTabProps) {
  const { isAuthenticated } = useAuth();
  const [showLanguageInfo, setShowLanguageInfo] = useState(false);
  const [languageInfoPos, setLanguageInfoPos] = useState({ top: 0, left: 0 });
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [viewModalData, setViewModalData] = useState<{
    name: string;
    datasetId: number;
    samples: STTSample[];
  } | null>(null);
  const [viewPlayingId, setViewPlayingId] = useState<number | null>(null);
  const [savingSampleId, setSavingSampleId] = useState<number | null>(null);

  const handleViewDataset = async (datasetId: number, datasetName: string) => {
    if (!isAuthenticated) return;
    setViewingId(datasetId);
    try {
      const data = await apiFetch<{
        data?: { samples?: STTSample[] };
        samples?: STTSample[];
      }>(
        `/api/evaluations/stt/datasets/${datasetId}?include_samples=true&include_signed_url=true&sample_limit=100&sample_offset=0`,
        apiKeys[0]?.key ?? "",
      );
      const samples = data?.data?.samples || data?.samples || [];
      if (samples.length === 0) {
        toast.error("No samples found in this dataset");
        return;
      }
      setViewModalData({ name: datasetName, datasetId, samples });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to view dataset",
      );
    } finally {
      setViewingId(null);
    }
  };

  const handleUpdateSample = async (
    sampleId: number,
    field: "ground_truth" | "language_id",
    value: string | number,
  ) => {
    if (!viewModalData || !isAuthenticated) return;
    setSavingSampleId(sampleId);
    try {
      await apiFetch<STTSample>(
        `/api/evaluations/stt/samples/${sampleId}`,
        apiKeys[0]?.key ?? "",
        {
          method: "PATCH",
          body: JSON.stringify({ [field]: value }),
        },
      );
      setViewModalData((prev) =>
        prev
          ? {
              ...prev,
              samples: prev.samples.map((s) =>
                s.id === sampleId ? { ...s, [field]: value } : s,
              ),
            }
          : null,
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update sample",
      );
    } finally {
      setSavingSampleId(null);
    }
  };

  useEffect(() => {
    if (!showLanguageInfo) return;
    const handleClick = () => setShowLanguageInfo(false);
    const handleScroll = () => setShowLanguageInfo(false);
    document.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [showLanguageInfo]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Create Dataset Form */}
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
              Create New Dataset
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: colors.text.secondary }}
            >
              Add audio samples that will be transcribed during evaluation
            </p>
          </div>

          {/* Name */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: colors.text.secondary }}
            >
              Name *
            </label>
            <input
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder="e.g., English Podcast Dataset"
              className="w-full px-3 py-2 border rounded-md text-sm"
              style={{
                backgroundColor: colors.bg.primary,
                borderColor: colors.border,
                color: colors.text.primary,
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: colors.text.secondary }}
            >
              Description
            </label>
            <input
              type="text"
              value={datasetDescription}
              onChange={(e) => setDatasetDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 border rounded-md text-sm"
              style={{
                backgroundColor: colors.bg.primary,
                borderColor: colors.border,
                color: colors.text.primary,
              }}
            />
          </div>

          {/* Language */}
          <div>
            <label
              className="text-xs font-medium mb-1.5"
              style={{ color: colors.text.secondary }}
            >
              <span className="inline-flex items-center gap-1">
                Language *
                <button
                  type="button"
                  aria-label="Show language information"
                  className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-normal cursor-pointer shrink-0"
                  style={{
                    backgroundColor: colors.bg.primary,
                    border: `1px solid ${colors.border}`,
                    color: colors.text.secondary,
                    padding: 0,
                    lineHeight: 1,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setLanguageInfoPos({
                      top: rect.bottom + 4,
                      left: rect.left,
                    });
                    setShowLanguageInfo(!showLanguageInfo);
                  }}
                >
                  i
                </button>
                {showLanguageInfo && (
                  <div
                    className="fixed z-50 rounded-lg shadow-lg border text-xs p-3"
                    style={{
                      backgroundColor: colors.bg.primary,
                      borderColor: colors.border,
                      width: "280px",
                      top: languageInfoPos.top,
                      left: languageInfoPos.left,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="font-semibold mb-1"
                      style={{ color: colors.text.primary }}
                    >
                      Default Language
                    </div>
                    <p
                      style={{
                        color: colors.text.secondary,
                        lineHeight: "1.5",
                      }}
                    >
                      This is the default language applied to all samples in the
                      dataset. You can override the language for individual
                      samples in the audio files section below.
                    </p>
                  </div>
                )}
              </span>
            </label>
            <select
              value={datasetLanguageId}
              onChange={(e) => {
                const newId = Number(e.target.value);
                setDatasetLanguageId(newId);
                setAudioFiles((prev) =>
                  prev.map((f) => ({ ...f, languageId: newId })),
                );
              }}
              className="w-full px-3 py-2 border rounded-md text-sm"
              style={{
                backgroundColor: colors.bg.primary,
                borderColor: colors.border,
                color: colors.text.primary,
              }}
            >
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Audio Samples */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: colors.text.secondary }}
              >
                Audio Samples *
              </label>
            </div>

            <input
              id="audio-upload"
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,.flac,.webm"
              multiple
              onChange={handleAudioFileSelect}
              className="hidden"
            />

            {audioFiles.length === 0 ? (
              <div
                onClick={isAuthenticated ? triggerAudioUpload : undefined}
                className="border-2 border-dashed rounded-lg p-6 text-center transition-colors"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.bg.primary,
                  cursor: isAuthenticated ? "pointer" : "not-allowed",
                  opacity: isAuthenticated ? 1 : 0.5,
                }}
                onMouseEnter={(e) =>
                  isAuthenticated &&
                  (e.currentTarget.style.backgroundColor = colors.bg.secondary)
                }
                onMouseLeave={(e) =>
                  isAuthenticated &&
                  (e.currentTarget.style.backgroundColor = colors.bg.primary)
                }
              >
                <svg
                  className="w-8 h-8 mx-auto mb-2"
                  style={{ color: colors.text.secondary }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
                <p
                  className="text-xs font-medium mb-1"
                  style={{ color: colors.text.primary }}
                >
                  {isAuthenticated
                    ? "Click to upload audio samples"
                    : "Add an API key to upload"}
                </p>
                <p className="text-xs" style={{ color: colors.text.secondary }}>
                  MP3, WAV, M4A, OGG, FLAC, WebM
                </p>
              </div>
            ) : (
              <div>
                <div
                  className="space-y-3"
                  style={{ maxHeight: "400px", overflow: "auto" }}
                >
                  {audioFiles.map((audioFile, idx) => (
                    <div
                      key={audioFile.id}
                      className="rounded-lg overflow-hidden"
                      style={{
                        backgroundColor: colors.bg.primary,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      }}
                    >
                      <div className="p-4">
                        {/* Header: number, filename, status, remove */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 font-medium"
                              style={{
                                backgroundColor: colors.bg.secondary,
                                color: colors.text.secondary,
                              }}
                            >
                              {idx + 1}
                            </span>
                            <span
                              className="text-sm font-medium truncate"
                              style={{ color: colors.text.primary }}
                            >
                              {audioFile.name}
                            </span>
                            <span
                              className="text-xs flex-shrink-0"
                              style={{ color: colors.text.secondary }}
                            >
                              {formatFileSize(audioFile.size)}
                            </span>
                            {audioFile.fileId ? (
                              <svg
                                className="w-3.5 h-3.5 flex-shrink-0"
                                style={{ color: colors.status.success }}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <div
                                className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0"
                                style={{
                                  borderColor: colors.accent.primary,
                                  borderTopColor: "transparent",
                                }}
                              />
                            )}
                          </div>
                          <button
                            onClick={() => removeAudioFile(audioFile.id)}
                            className="p-1 rounded flex-shrink-0"
                            style={{ color: colors.text.secondary }}
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>

                        {/* Audio Player */}
                        <AudioPlayer
                          audioBase64={audioFile.base64}
                          mediaType={audioFile.mediaType}
                          isPlaying={playingFileId === audioFile.id}
                          onPlayToggle={() =>
                            setPlayingFileId(
                              playingFileId === audioFile.id
                                ? null
                                : audioFile.id,
                            )
                          }
                        />

                        {/* Language + Ground Truth */}
                        <div className="mt-3 flex items-start gap-3">
                          <div
                            className="flex-shrink-0"
                            style={{ width: "120px" }}
                          >
                            <label
                              className="block text-[10px] font-medium mb-1 uppercase tracking-wide"
                              style={{ color: colors.text.secondary }}
                            >
                              Language
                            </label>
                            <select
                              value={audioFile.languageId}
                              onChange={(e) =>
                                updateFileLanguage(
                                  audioFile.id,
                                  Number(e.target.value),
                                )
                              }
                              className="w-full px-2 py-1.5 border rounded-md text-xs"
                              style={{
                                backgroundColor: colors.bg.primary,
                                borderColor: colors.border,
                                color: colors.text.primary,
                              }}
                            >
                              {languages.map((lang) => (
                                <option key={lang.id} value={lang.id}>
                                  {lang.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label
                              className="block text-[10px] font-medium mb-1 uppercase tracking-wide"
                              style={{ color: colors.text.secondary }}
                            >
                              Ground Truth
                            </label>
                            <textarea
                              value={audioFile.groundTruth}
                              onChange={(e) =>
                                updateGroundTruth(audioFile.id, e.target.value)
                              }
                              placeholder={
                                audioFile.fileId
                                  ? "Expected transcription..."
                                  : "Uploading..."
                              }
                              disabled={!audioFile.fileId}
                              rows={2}
                              className="w-full px-2 py-1.5 border rounded-md text-xs"
                              style={{
                                backgroundColor: audioFile.fileId
                                  ? colors.bg.primary
                                  : colors.bg.secondary,
                                borderColor: colors.border,
                                color: audioFile.fileId
                                  ? colors.text.primary
                                  : colors.text.secondary,
                                cursor: audioFile.fileId
                                  ? "text"
                                  : "not-allowed",
                                opacity: audioFile.fileId ? 1 : 0.6,
                                resize: "vertical",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upload more - below scrollable area */}
                <button
                  onClick={isAuthenticated ? triggerAudioUpload : undefined}
                  className="flex items-center gap-1 text-xs font-medium mt-2"
                  style={{
                    color: isAuthenticated
                      ? colors.accent.primary
                      : colors.text.secondary,
                    cursor: isAuthenticated ? "pointer" : "not-allowed",
                  }}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add more samples
                  <span style={{ color: colors.text.secondary }}>
                    ({audioFiles.filter((f) => f.fileId).length}/
                    {audioFiles.length} uploaded)
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div
          className="flex-shrink-0 border-t px-4 py-4 flex items-center justify-end gap-3"
          style={{
            borderColor: colors.border,
            backgroundColor: colors.bg.primary,
          }}
        >
          <button
            onClick={() => {
              setDatasetName("");
              setDatasetDescription("");
              setDatasetLanguageId(1);
              setAudioFiles([]);
              setPlayingFileId(null);
            }}
            disabled={isCreating}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ color: colors.text.secondary }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateDataset}
            disabled={
              isCreating || !datasetName.trim() || audioFiles.length === 0
            }
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor:
                isCreating || !datasetName.trim() || audioFiles.length === 0
                  ? colors.bg.secondary
                  : colors.accent.primary,
              color:
                isCreating || !datasetName.trim() || audioFiles.length === 0
                  ? colors.text.secondary
                  : "#fff",
              cursor:
                isCreating || !datasetName.trim() || audioFiles.length === 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {isCreating ? (
              <>
                <div
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{
                    borderColor: colors.text.secondary,
                    borderTopColor: "transparent",
                  }}
                />
                Creating...
              </>
            ) : (
              "Create Dataset"
            )}
          </button>
        </div>
      </div>

      {/* Right Panel - Dataset List */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ backgroundColor: colors.bg.secondary }}
      >
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-base font-semibold"
              style={{ color: colors.text.primary }}
            >
              Datasets
            </h3>
          </div>

          {isLoadingDatasets ? (
            <div className="p-16">
              <Loader size="md" message="Loading datasets..." />
            </div>
          ) : datasets.length === 0 ? (
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
                  d="M4 7v10c0 2 3.6 3 8 3s8-1 8-3V7M4 7c0 2 3.6 3 8 3s8-1 8-3M4 7c0-2 3.6-3 8-3s8 1 8 3M4 12c0 2 3.6 3 8 3s8-1 8-3"
                />
              </svg>
              <p
                className="text-sm font-medium mb-1"
                style={{ color: colors.text.primary }}
              >
                No datasets yet
              </p>
              <p className="text-xs" style={{ color: colors.text.secondary }}>
                Create your first dataset using the form on the left
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {datasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className="rounded-lg overflow-hidden"
                  style={{
                    backgroundColor: colors.bg.primary,
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                    borderLeft: "3px solid #DCCFC3",
                  }}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-sm font-semibold truncate"
                          style={{ color: colors.text.primary }}
                        >
                          {dataset.name}
                        </div>
                        {dataset.description && (
                          <DatasetDescription
                            description={dataset.description}
                          />
                        )}
                        {dataset.dataset_metadata?.sample_count !==
                          undefined && (
                          <div
                            className="mt-2 text-xs"
                            style={{ color: colors.text.secondary }}
                          >
                            {dataset.dataset_metadata.sample_count} samples
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() =>
                            handleViewDataset(dataset.id, dataset.name)
                          }
                          disabled={viewingId === dataset.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                          style={{
                            backgroundColor: "transparent",
                            borderColor: colors.border,
                            color: colors.text.primary,
                            opacity: viewingId === dataset.id ? 0.5 : 1,
                          }}
                        >
                          {viewingId === dataset.id ? "Loading..." : "View"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View Dataset Modal */}
      {viewModalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => {
            setViewModalData(null);
            setViewPlayingId(null);
          }}
        >
          <div
            className="rounded-lg shadow-xl flex flex-col"
            style={{
              backgroundColor: colors.bg.primary,
              width: "90vw",
              maxWidth: "900px",
              maxHeight: "85vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
              style={{ borderColor: colors.border }}
            >
              <div>
                <h3
                  className="text-sm font-semibold"
                  style={{ color: colors.text.primary }}
                >
                  {viewModalData.name}
                </h3>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: colors.text.secondary }}
                >
                  {viewModalData.samples.length} audio samples
                </p>
              </div>
              <button
                onClick={() => {
                  setViewModalData(null);
                  setViewPlayingId(null);
                }}
                className="p-1.5 rounded"
                style={{ color: colors.text.secondary }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body - Samples */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      backgroundColor: colors.bg.secondary,
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    <th
                      className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-0"
                      style={{
                        color: colors.text.secondary,
                        backgroundColor: colors.bg.secondary,
                        width: "40px",
                      }}
                    ></th>
                    <th
                      className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-0"
                      style={{
                        color: colors.text.secondary,
                        backgroundColor: colors.bg.secondary,
                      }}
                    >
                      Sample
                    </th>
                    <th
                      className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-0"
                      style={{
                        color: colors.text.secondary,
                        backgroundColor: colors.bg.secondary,
                        width: "120px",
                      }}
                    >
                      Language
                    </th>
                    <th
                      className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-0"
                      style={{
                        color: colors.text.secondary,
                        backgroundColor: colors.bg.secondary,
                      }}
                    >
                      Ground Truth
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {viewModalData.samples.map((sample, idx) => (
                    <tr
                      key={sample.id}
                      style={{ borderBottom: `1px solid ${colors.border}` }}
                    >
                      <td
                        className="px-4 py-3 text-xs align-top"
                        style={{ color: colors.text.secondary }}
                      >
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1.5">
                          {sample.sample_metadata?.original_filename && (
                            <div
                              className="text-xs font-medium truncate"
                              style={{
                                color: colors.text.primary,
                                maxWidth: "280px",
                              }}
                            >
                              {sample.sample_metadata.original_filename}
                            </div>
                          )}
                          {sample.signed_url ? (
                            <AudioPlayerFromUrl
                              signedUrl={sample.signed_url}
                              isPlaying={viewPlayingId === sample.id}
                              onPlayToggle={() =>
                                setViewPlayingId(
                                  viewPlayingId === sample.id
                                    ? null
                                    : sample.id,
                                )
                              }
                            />
                          ) : (
                            <span
                              className="text-xs"
                              style={{ color: colors.text.secondary }}
                            >
                              No audio
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <select
                          value={sample.language_id ?? ""}
                          onChange={(e) =>
                            handleUpdateSample(
                              sample.id,
                              "language_id",
                              Number(e.target.value),
                            )
                          }
                          disabled={savingSampleId === sample.id}
                          className="w-full px-2 py-1.5 border rounded-md text-xs"
                          style={{
                            backgroundColor: colors.bg.primary,
                            borderColor: colors.border,
                            color: colors.text.primary,
                            opacity: savingSampleId === sample.id ? 0.5 : 1,
                          }}
                        >
                          {languages.map((lang) => (
                            <option key={lang.id} value={lang.id}>
                              {lang.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <textarea
                          value={sample.ground_truth || ""}
                          onChange={(e) => {
                            const newVal = e.target.value;
                            setViewModalData((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    samples: prev.samples.map((s) =>
                                      s.id === sample.id
                                        ? { ...s, ground_truth: newVal }
                                        : s,
                                    ),
                                  }
                                : null,
                            );
                          }}
                          onBlur={(e) =>
                            handleUpdateSample(
                              sample.id,
                              "ground_truth",
                              e.target.value,
                            )
                          }
                          placeholder="Enter ground truth..."
                          disabled={savingSampleId === sample.id}
                          rows={3}
                          className="w-full px-2 py-1.5 border rounded-md text-xs"
                          style={{
                            backgroundColor: colors.bg.primary,
                            borderColor: colors.border,
                            color: colors.text.primary,
                            opacity: savingSampleId === sample.id ? 0.5 : 1,
                            resize: "vertical",
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
