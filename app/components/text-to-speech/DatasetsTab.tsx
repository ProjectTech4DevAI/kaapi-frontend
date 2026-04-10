"use client";

import { useState, useEffect, useRef } from "react";
import { colors } from "@/app/lib/colors";
import {
  TextSample,
  TTSDataset,
  TTSDatasetDetailResponse,
} from "@/app/lib/types/textToSpeech";
import { Language } from "@/app/lib/types/speechToText";
import { APIKey } from "@/app/lib/types/credentials";
import { useToast } from "@/app/components/Toast";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import Loader from "@/app/components/Loader";
import TTSDatasetDescription from "./DatasetDescription";

export interface DatasetsTabProps {
  leftPanelWidth: number;
  datasetName: string;
  setDatasetName: (name: string) => void;
  datasetDescription: string;
  setDatasetDescription: (desc: string) => void;
  datasetLanguageId: number;
  setDatasetLanguageId: (id: number) => void;
  languages: Language[];
  textSamples: TextSample[];
  addTextSample: () => void;
  removeTextSample: (id: string) => void;
  updateSampleText: (id: string, text: string) => void;
  isCreating: boolean;
  handleCreateDataset: () => void;
  resetForm: () => void;
  apiKeys: APIKey[];
  datasets: TTSDataset[];
  isLoadingDatasets: boolean;
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
  languages,
  textSamples,
  addTextSample,
  removeTextSample,
  updateSampleText,
  isCreating,
  handleCreateDataset,
  resetForm,
  apiKeys,
  datasets,
  isLoadingDatasets,
  toast,
}: DatasetsTabProps) {
  const { isAuthenticated } = useAuth();
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [viewModalData, setViewModalData] = useState<{
    name: string;
    headers: string[];
    rows: string[][];
  } | null>(null);
  const samplesContainerRef = useRef<HTMLDivElement>(null);
  const prevSamplesCount = useRef(textSamples.length);

  useEffect(() => {
    if (textSamples.length > prevSamplesCount.current) {
      setTimeout(() => {
        samplesContainerRef.current?.scrollTo({
          top: samplesContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 50);
    }
    prevSamplesCount.current = textSamples.length;
  }, [textSamples.length]);

  const handleViewDataset = async (datasetId: number, datasetName: string) => {
    if (!isAuthenticated) return;
    setViewingId(datasetId);
    try {
      const data = await apiFetch<TTSDatasetDetailResponse>(
        `/api/evaluations/tts/datasets/${datasetId}?include_signed_url=true&fetch_content=true`,
        apiKeys[0]?.key ?? "",
      );
      const csvText = data?.csv_content;
      if (!csvText) {
        toast.error("No data available for this dataset");
        return;
      }

      // Split CSV into logical records (quote-aware)
      const splitCSVRecords = (text: string): string[] => {
        const records: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === '"') {
            inQuotes = !inQuotes;
            current += ch;
          } else if (
            (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) &&
            !inQuotes
          ) {
            if (current.trim()) records.push(current);
            current = "";
            if (ch === "\r") i++; // skip \n in \r\n
          } else {
            current += ch;
          }
        }
        if (current.trim()) records.push(current);
        return records;
      };

      const lines = splitCSVRecords(csvText);
      const parseRow = (line: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (line[i] === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += line[i];
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = lines.length > 0 ? parseRow(lines[0]) : [];
      const rows = lines.slice(1).map(parseRow);

      setViewModalData({ name: datasetName, headers, rows });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to view dataset",
      );
    } finally {
      setViewingId(null);
    }
  };

  const handleDownloadFromModal = () => {
    if (!viewModalData) return;
    const csvLines = [viewModalData.headers.join(",")];
    viewModalData.rows.forEach((row) => {
      csvLines.push(
        row
          .map((cell) =>
            cell.includes(",") || cell.includes('"') || cell.includes("\n")
              ? `"${cell.replace(/"/g, '""')}"`
              : cell,
          )
          .join(","),
      );
    });
    const blob = new Blob([csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${viewModalData.name}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
              Add text samples for speech synthesis evaluation
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
              placeholder="e.g., Hindi News Dataset"
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
              className="block text-xs font-medium mb-1.5"
              style={{ color: colors.text.secondary }}
            >
              Language *
            </label>
            <select
              value={datasetLanguageId}
              onChange={(e) => setDatasetLanguageId(Number(e.target.value))}
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

          {/* Text Samples */}
          <div>
            <label
              className="text-xs font-medium mb-1.5 block"
              style={{ color: colors.text.secondary }}
            >
              Text Samples *
            </label>

            {textSamples.length === 0 ? (
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center"
                style={{ borderColor: colors.border }}
              >
                <p className="text-xs" style={{ color: colors.text.secondary }}>
                  No samples added yet
                </p>
              </div>
            ) : (
              <div
                ref={samplesContainerRef}
                className="space-y-2"
                style={{ maxHeight: "300px", overflow: "auto" }}
              >
                {textSamples.map((sample, idx) => (
                  <div key={sample.id} className="flex gap-2">
                    <textarea
                      value={sample.text}
                      onChange={(e) =>
                        updateSampleText(sample.id, e.target.value)
                      }
                      placeholder={`Sample ${idx + 1}...`}
                      rows={2}
                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                      style={{
                        backgroundColor: colors.bg.primary,
                        borderColor: colors.border,
                        color: colors.text.primary,
                        resize: "vertical",
                      }}
                    />
                    <button
                      onClick={() => removeTextSample(sample.id)}
                      className="p-1 rounded flex-shrink-0 self-start mt-1.5"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={isAuthenticated ? addTextSample : undefined}
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
              Add Sample
            </button>
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
            onClick={resetForm}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ color: colors.text.secondary }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateDataset}
            disabled={
              isCreating ||
              !datasetName.trim() ||
              textSamples.filter((s) => s.text.trim()).length === 0
            }
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor:
                isCreating ||
                !datasetName.trim() ||
                textSamples.filter((s) => s.text.trim()).length === 0
                  ? colors.bg.secondary
                  : colors.accent.primary,
              color:
                isCreating ||
                !datasetName.trim() ||
                textSamples.filter((s) => s.text.trim()).length === 0
                  ? colors.text.secondary
                  : "#fff",
              cursor:
                isCreating ||
                !datasetName.trim() ||
                textSamples.filter((s) => s.text.trim()).length === 0
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
                          <TTSDatasetDescription
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
          onClick={() => setViewModalData(null)}
        >
          <div
            className="rounded-lg shadow-xl flex flex-col"
            style={{
              backgroundColor: colors.bg.primary,
              width: "80vw",
              maxWidth: "1000px",
              maxHeight: "80vh",
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
                  {viewModalData.rows.length} rows ·{" "}
                  {viewModalData.headers.length} columns
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadFromModal}
                  className="px-3 py-1.5 rounded-md text-xs font-medium"
                  style={{
                    backgroundColor: colors.accent.primary,
                    color: "#ffffff",
                  }}
                >
                  Download CSV
                </button>
                <button
                  onClick={() => setViewModalData(null)}
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
            </div>

            {/* Modal Body - Table */}
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
                    {viewModalData.headers.map((header, i) => (
                      <th
                        key={i}
                        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-0"
                        style={{
                          color: colors.text.secondary,
                          backgroundColor: colors.bg.secondary,
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewModalData.rows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      style={{ borderBottom: `1px solid ${colors.border}` }}
                    >
                      <td
                        className="px-4 py-2.5 text-xs"
                        style={{ color: colors.text.secondary }}
                      >
                        {rowIdx + 1}
                      </td>
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-4 py-2.5"
                          style={{ color: colors.text.primary }}
                        >
                          <div
                            className="text-sm"
                            style={{
                              maxHeight: "120px",
                              overflow: "auto",
                              lineHeight: "1.5",
                            }}
                          >
                            {cell || (
                              <span style={{ color: colors.text.secondary }}>
                                —
                              </span>
                            )}
                          </div>
                        </td>
                      ))}
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
