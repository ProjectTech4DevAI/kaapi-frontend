"use client";

import { useState, useEffect, useRef } from "react";
import { colors } from "@/app/lib/colors";
import { Dataset } from "@/app/lib/types/dataset";
import { useToast } from "@/app/components/Toast";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import EvalDatasetDescription from "./EvalDatasetDescription";
import Loader from "@/app/components/Loader";
export interface DatasetsTabProps {
  leftPanelWidth: number;
  datasetName: string;
  setDatasetName: (name: string) => void;
  datasetDescription: string;
  setDatasetDescription: (desc: string) => void;
  duplicationFactor: string;
  setDuplicationFactor: (factor: string) => void;
  uploadedFile: File | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  isUploading: boolean;
  handleCreateDataset: () => void;
  resetForm: () => void;
  storedDatasets: Dataset[];
  isDatasetsLoading: boolean;
  apiKey: string;
  loadStoredDatasets: () => void;
  toast: ReturnType<typeof useToast>;
}

export default function DatasetsTab({
  leftPanelWidth,
  datasetName,
  setDatasetName,
  datasetDescription,
  setDatasetDescription,
  duplicationFactor,
  setDuplicationFactor,
  uploadedFile,
  onFileSelect,
  onRemoveFile,
  isUploading,
  handleCreateDataset,
  resetForm,
  storedDatasets,
  isDatasetsLoading,
  apiKey,
  loadStoredDatasets,
  toast,
}: DatasetsTabProps) {
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDuplicationInfo, setShowDuplicationInfo] = useState(false);
  const [duplicationInfoPos, setDuplicationInfoPos] = useState({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    if (!showDuplicationInfo) return;
    const handleClick = () => setShowDuplicationInfo(false);
    const handleScroll = () => setShowDuplicationInfo(false);
    document.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [showDuplicationInfo]);

  const handleDeleteDataset = async (datasetId: number) => {
    if (!isAuthenticated) return;

    setDeletingId(datasetId);
    try {
      await apiFetch(`/api/evaluations/datasets/${datasetId}`, apiKey, {
        method: "DELETE",
      });
      toast.success("Dataset deleted");
      loadStoredDatasets();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete dataset",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [viewModalData, setViewModalData] = useState<{
    name: string;
    headers: string[];
    rows: string[][];
    signedUrl: string;
  } | null>(null);

  const handleViewDataset = async (datasetId: number, datasetName: string) => {
    if (!isAuthenticated) return;

    setViewingId(datasetId);
    try {
      const data = await apiFetch<{
        data?: { signed_url?: string };
        signed_url?: string;
        csv_content?: string;
      }>(
        `/api/evaluations/datasets/${datasetId}?include_signed_url=true&fetch_content=true`,
        apiKey,
      );
      const signedUrl = data?.data?.signed_url || data?.signed_url;
      const csvText = data?.csv_content;
      if (!csvText) {
        toast.error("No data available for this dataset");
        return;
      }

      // Parse CSV
      const lines = csvText.split("\n").filter((l: string) => l.trim());
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

      setViewModalData({
        name: datasetName,
        headers,
        rows,
        signedUrl: signedUrl || "",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to view dataset");
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
        fileInputRef.current.dispatchEvent(
          new Event("change", { bubbles: true }),
        );
      }
    }
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
              Upload a CSV with golden question-answer pairs
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
              placeholder="e.g., QnA Dataset v1"
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

          {/* Duplication Factor */}
          <div>
            <label
              className="text-xs font-medium mb-1.5"
              style={{ color: colors.text.secondary }}
            >
              <span className="inline-flex items-center gap-1">
                Duplication Factor
                <span
                  className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-normal cursor-pointer shrink-0"
                  style={{
                    backgroundColor: colors.bg.primary,
                    border: `1px solid ${colors.border}`,
                    color: colors.text.secondary,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDuplicationInfoPos({
                      top: rect.bottom + 4,
                      left: rect.left,
                    });
                    setShowDuplicationInfo(!showDuplicationInfo);
                  }}
                >
                  i
                </span>
                {showDuplicationInfo && (
                  <div
                    className="fixed z-50 rounded-lg shadow-lg border text-xs p-3"
                    style={{
                      backgroundColor: colors.bg.primary,
                      borderColor: colors.border,
                      width: "280px",
                      top: duplicationInfoPos.top,
                      left: duplicationInfoPos.left,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="font-semibold mb-1"
                      style={{ color: colors.text.primary }}
                    >
                      Duplication Factor
                    </div>
                    <p
                      style={{
                        color: colors.text.secondary,
                        lineHeight: "1.5",
                      }}
                    >
                      Controls how many times each question is sent to the AI to
                      generate an answer. For example, setting this to 3 means
                      the AI answers each question 3 separate times — helpful
                      for checking if the AI gives consistent and reliable
                      responses each time.
                    </p>
                  </div>
                )}
              </span>
            </label>
            <select
              value={duplicationFactor}
              onChange={(e) => setDuplicationFactor(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
              style={{
                backgroundColor: colors.bg.primary,
                borderColor: colors.border,
                color: colors.text.primary,
              }}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* CSV Upload */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: colors.text.secondary }}
            >
              Upload CSV *
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={onFileSelect}
              className="hidden"
            />

            {uploadedFile ? (
              <div
                className="rounded-lg p-3"
                style={{ backgroundColor: colors.bg.secondary }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      style={{ color: colors.status.success }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: colors.text.primary }}
                      >
                        {uploadedFile.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: colors.text.secondary }}
                      >
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onRemoveFile();
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-1 rounded"
                    style={{ color: colors.text.secondary }}
                    aria-label="Remove file"
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
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging ? "border-blue-400 bg-blue-50/30" : ""}`}
                style={{
                  borderColor: isDragging
                    ? colors.accent.primary
                    : colors.border,
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <svg
                  className="mx-auto h-8 w-8 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: colors.border }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p
                  className="text-sm font-medium mb-1"
                  style={{ color: colors.text.primary }}
                >
                  Drop CSV here, or click to browse
                </p>
                <p className="text-xs" style={{ color: colors.text.secondary }}>
                  Format:{" "}
                  <span
                    className="font-mono"
                    style={{ color: colors.text.primary }}
                  >
                    question,answer
                  </span>
                </p>
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
            onClick={resetForm}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ color: colors.text.secondary }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateDataset}
            disabled={!uploadedFile || !datasetName.trim() || isUploading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor:
                !uploadedFile || !datasetName.trim() || isUploading
                  ? colors.bg.secondary
                  : colors.accent.primary,
              color:
                !uploadedFile || !datasetName.trim() || isUploading
                  ? colors.text.secondary
                  : "#fff",
              cursor:
                !uploadedFile || !datasetName.trim() || isUploading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {isUploading ? (
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

          {isDatasetsLoading ? (
            <div className="p-16 flex justify-center">
              <Loader size="md" message="Loading datasets..." />
            </div>
          ) : storedDatasets.length === 0 ? (
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
              {storedDatasets.map((dataset) => (
                <div
                  key={dataset.dataset_id}
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
                          {dataset.dataset_name}
                        </div>
                        {dataset.description && (
                          <EvalDatasetDescription
                            description={dataset.description}
                          />
                        )}
                        <div
                          className="flex items-center gap-3 mt-2 text-xs"
                          style={{ color: colors.text.secondary }}
                        >
                          <span>{dataset.total_items} items</span>
                          {dataset.duplication_factor > 1 && (
                            <>
                              <span style={{ color: colors.border }}>·</span>
                              <span>
                                x{dataset.duplication_factor} duplication
                              </span>
                            </>
                          )}
                          {dataset.original_items > 0 &&
                            dataset.original_items !== dataset.total_items && (
                              <>
                                <span style={{ color: colors.border }}>·</span>
                                <span>{dataset.original_items} original</span>
                              </>
                            )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() =>
                            handleViewDataset(
                              dataset.dataset_id,
                              dataset.dataset_name,
                            )
                          }
                          disabled={viewingId === dataset.dataset_id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                          style={{
                            backgroundColor: "transparent",
                            borderColor: colors.border,
                            color: colors.text.primary,
                            opacity: viewingId === dataset.dataset_id ? 0.5 : 1,
                          }}
                        >
                          {viewingId === dataset.dataset_id
                            ? "Loading..."
                            : "View"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(dataset.dataset_id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                          style={{
                            backgroundColor: "transparent",
                            borderColor: colors.border,
                            color: "hsl(8, 86%, 40%)",
                          }}
                        >
                          Delete
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
                  aria-label="Close modal"
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

      {/* Delete Confirmation Modal */}
      {confirmDeleteId !== null &&
        (() => {
          const dataset = storedDatasets.find(
            (d) => d.dataset_id === confirmDeleteId,
          );
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
              onClick={() => setConfirmDeleteId(null)}
            >
              <div
                className="rounded-lg shadow-xl w-full max-w-md"
                style={{ backgroundColor: colors.bg.primary }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "rgba(220, 38, 38, 0.1)" }}
                    >
                      <svg
                        className="w-5 h-5"
                        style={{ color: "hsl(8, 86%, 40%)" }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3
                        className="text-sm font-semibold"
                        style={{ color: colors.text.primary }}
                      >
                        Delete dataset
                      </h3>
                      <p
                        className="text-sm mt-1"
                        style={{ color: colors.text.secondary }}
                      >
                        Are you sure you want to delete{" "}
                        <strong style={{ color: colors.text.primary }}>
                          {dataset?.dataset_name}
                        </strong>
                        ? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  className="flex items-center justify-end gap-3 px-6 py-4 border-t"
                  style={{ borderColor: colors.border }}
                >
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-4 py-2 rounded-lg text-sm font-medium border"
                    style={{
                      backgroundColor: "transparent",
                      borderColor: colors.border,
                      color: colors.text.primary,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteDataset(confirmDeleteId);
                      setConfirmDeleteId(null);
                    }}
                    disabled={deletingId === confirmDeleteId}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{
                      backgroundColor: "hsl(8, 86%, 40%)",
                      color: "#ffffff",
                      opacity: deletingId === confirmDeleteId ? 0.5 : 1,
                    }}
                  >
                    {deletingId === confirmDeleteId ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
