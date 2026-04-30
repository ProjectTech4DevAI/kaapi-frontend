"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { apiFetch } from "@/app/lib/apiClient";
import { Dataset } from "@/app/lib/types/datasets";
import { useToast } from "@/app/components/Toast";
import {
  CheckIcon,
  CloseIcon,
  CloudUploadIcon,
  DatabaseIcon,
  WarningIcon,
} from "@/app/components/icons";
import EvalDatasetDescription from "@/app/components/evaluations/EvalDatasetDescription";
import DataViewModal from "./DataViewModal";

interface DatasetStepProps {
  apiKey: string;
  onForbidden?: () => void;
  datasetId: string;
  setDatasetId: (id: string) => void;
  setSelectedDatasetName: (name: string) => void;
  onColumnsLoaded: (
    columns: string[],
    sampleRow?: Record<string, string>,
  ) => void;
  onNext: () => void;
}

type DatasetResponse = Dataset[] | { data?: Dataset[] };
type CreateDatasetResponse =
  | { dataset_id?: number; dataset_name?: string }
  | { data?: { dataset_id?: number; dataset_name?: string } };
type DatasetFileResponse = { file_content?: string };

const LEFT_PANEL_CLASSES = "w-[40%] min-w-[360px] max-w-[500px]";

function handleForbiddenError(
  error: unknown,
  onForbidden?: () => void,
): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  const isForbidden =
    /request failed:\s*403/i.test(error.message) ||
    message.includes("forbidden") ||
    message.includes("not enabled") ||
    message.includes("permission denied");

  if (!isForbidden) return false;
  onForbidden?.();
  return true;
}

export default function DatasetStep({
  apiKey,
  onForbidden,
  datasetId,
  setDatasetId,
  setSelectedDatasetName,
  onColumnsLoaded,
  onNext,
}: DatasetStepProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dataset list
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);

  // Create dataset form
  const [datasetName, setDatasetName] = useState("");
  const [datasetDescription, setDatasetDescription] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // View dataset modal
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [viewModalData, setViewModalData] = useState<{
    name: string;
    headers: string[];
    rows: string[][];
  } | null>(null);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fetch file via proxy (server-side S3 download) and parse with XLSX
  const fetchAndParseFile = async (
    id: string | number,
  ): Promise<{ headers: string[]; rows: string[][] }> => {
    let json: DatasetFileResponse;
    try {
      json = await apiFetch<DatasetFileResponse>(
        `/api/assessment/datasets/${id}?fetch_content=true`,
        apiKey,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to download dataset file";
      throw new Error(message);
    }

    const base64 = json?.file_content;
    if (!base64) {
      throw new Error("Dataset file content is unavailable.");
    }

    // Decode base64 to binary and parse with XLSX
    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const workbook = XLSX.read(binary, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      throw new Error("Dataset file does not contain a readable sheet.");
    }

    const rawData: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
    });
    if (rawData.length === 0) {
      throw new Error("Dataset file is empty.");
    }

    const headers = rawData[0].map(String);
    if (headers.length === 0 || headers.every((header) => !header.trim())) {
      throw new Error("Dataset file is missing column headers.");
    }

    const rows = rawData
      .slice(1)
      .filter((row) => row.some((cell) => String(cell).trim() !== ""));

    if (rows.length === 0) {
      throw new Error("Dataset file has headers but no data rows.");
    }

    return { headers, rows: rows.map((row) => row.map(String)) };
  };

  // Fetch datasets
  const loadDatasets = useCallback(async () => {
    if (!apiKey) return;
    setIsLoading(true);
    try {
      const data = await apiFetch<DatasetResponse>(
        "/api/assessment/datasets",
        apiKey,
      );
      setDatasets(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      if (handleForbiddenError(e, onForbidden)) return;
      console.error("Failed to load datasets:", e);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, onForbidden]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  // Hydrate selected dataset name from the loaded dataset list.
  useEffect(() => {
    if (!datasetId || datasets.length === 0) return;
    const selected = datasets.find(
      (dataset) => dataset.dataset_id.toString() === datasetId,
    );
    if (selected?.dataset_name) {
      setSelectedDatasetName(selected.dataset_name);
    }
  }, [datasetId, datasets, setSelectedDatasetName]);

  // File selection handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedExts = [".csv", ".xlsx", ".xls"];
    const hasValidExt = allowedExts.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );
    if (!hasValidExt) {
      toast.error("Please select a CSV or Excel (.xlsx, .xls) file");
      event.target.value = "";
      return;
    }
    setUploadedFile(file);
    if (!datasetName) {
      setDatasetName(file.name.replace(/\.(csv|xlsx|xls)$/i, ""));
    }
  };

  // Create dataset
  const handleCreateDataset = async () => {
    if (!uploadedFile || !datasetName.trim() || !apiKey) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("dataset_name", datasetName.trim());
      if (datasetDescription.trim()) {
        formData.append("description", datasetDescription.trim());
      }

      const data = await apiFetch<CreateDatasetResponse>(
        "/api/assessment/datasets",
        apiKey,
        {
          method: "POST",
          body: formData,
        },
      );
      await loadDatasets();

      // Auto-select the created dataset
      const created =
        (data as { data?: { dataset_id?: number; dataset_name?: string } })
          .data ?? (data as { dataset_id?: number; dataset_name?: string });
      if (created?.dataset_id) {
        void handleDatasetSelect(
          created.dataset_id.toString(),
          created.dataset_name ?? datasetName.trim(),
        );
      }

      // Reset form
      setUploadedFile(null);
      setDatasetName("");
      setDatasetDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      toast.success("Dataset created successfully!");
    } catch (error) {
      if (handleForbiddenError(error, onForbidden)) return;
      toast.error(
        `Failed to create dataset: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Select dataset and fetch columns
  const handleDatasetSelect = async (id: string, name?: string) => {
    setDatasetId(id);
    if (!id) {
      setSelectedDatasetName("");
      onColumnsLoaded([]);
      return;
    }
    const resolvedName =
      name ??
      datasets.find((dataset) => dataset.dataset_id.toString() === id)
        ?.dataset_name ??
      "";
    setSelectedDatasetName(resolvedName);

    setIsLoadingColumns(true);
    try {
      const parsed = await fetchAndParseFile(id);
      const firstRow = parsed.rows[0] || [];
      const sampleRow = Object.fromEntries(
        parsed.headers.map((header, index) => [
          header,
          String(firstRow[index] ?? ""),
        ]),
      );
      onColumnsLoaded(parsed.headers, sampleRow);
    } catch (e) {
      if (handleForbiddenError(e, onForbidden)) return;
      const message =
        e instanceof Error ? e.message : "Failed to fetch dataset columns.";
      onColumnsLoaded([]);
      setDatasetId("");
      setSelectedDatasetName("");
      toast.error(message);
    } finally {
      setIsLoadingColumns(false);
    }
  };

  // View dataset
  const handleViewDataset = async (datasetId: number, name: string) => {
    setViewingId(datasetId);
    try {
      const parsed = await fetchAndParseFile(datasetId);
      setViewModalData({
        name,
        headers: parsed.headers,
        rows: parsed.rows,
      });
    } catch (err) {
      if (handleForbiddenError(err, onForbidden)) return;
      toast.error(
        err instanceof Error ? err.message : "Failed to view dataset",
      );
    } finally {
      setViewingId(null);
    }
  };

  // Delete dataset
  const handleDeleteDataset = async (id: number) => {
    setDeletingId(id);
    try {
      await apiFetch(`/api/assessment/datasets/${id}`, apiKey, {
        method: "DELETE",
      });
      toast.success("Dataset deleted");
      if (datasetId === id.toString()) {
        setDatasetId("");
        setSelectedDatasetName("");
      }
      void loadDatasets();
    } catch (err) {
      if (handleForbiddenError(err, onForbidden)) return;
      toast.error(
        err instanceof Error ? err.message : "Failed to delete dataset",
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    const allowedExts = [".csv", ".xlsx", ".xls"];
    if (
      file &&
      allowedExts.some((ext) => file.name.toLowerCase().endsWith(ext))
    ) {
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

  const resetForm = () => {
    setDatasetName("");
    setDatasetDescription("");
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canProceed = datasetId && !isLoadingColumns;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Left Panel - Create Dataset + Experiment Name */}
      <div
        className={`${LEFT_PANEL_CLASSES} flex min-h-0 flex-shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white`}
      >
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Page Title */}
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Create New Dataset
            </h2>
            <p className="text-xs mt-0.5 text-neutral-500">
              Upload a CSV file for evaluation
            </p>
          </div>

          {/* Name */}
          <div>
            <label
              htmlFor="dataset-name"
              className="mb-1.5 block text-xs font-medium text-neutral-500"
            >
              Name *
            </label>
            <input
              id="dataset-name"
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder="e.g., Hindi QnA Dataset"
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="dataset-description"
              className="mb-1.5 block text-xs font-medium text-neutral-500"
            >
              Description
            </label>
            <input
              id="dataset-description"
              type="text"
              value={datasetDescription}
              onChange={(e) => setDatasetDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
            />
          </div>

          {/* CSV Upload */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">
              Upload CSV *
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />

            {uploadedFile ? (
              <div className="rounded-lg bg-neutral-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckIcon className="h-4 w-4 flex-shrink-0 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {uploadedFile.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setUploadedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    aria-label="Remove file"
                    className="rounded p-1 text-neutral-500"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                  isDragging
                    ? "border-neutral-900 bg-blue-50/30"
                    : "border-neutral-200"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <span className="mx-auto mb-2 block text-neutral-200">
                  <CloudUploadIcon className="h-8 w-8" />
                </span>
                <p className="mb-1 text-sm font-medium text-neutral-900">
                  Drop file here, or click to browse
                </p>
                <p className="text-xs text-neutral-500">
                  CSV or Excel (.xlsx, .xls)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-neutral-200 bg-white px-4 py-3">
          <button
            onClick={resetForm}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateDataset}
            disabled={!uploadedFile || !datasetName.trim() || isUploading}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium ${
              !uploadedFile || !datasetName.trim() || isUploading
                ? "cursor-not-allowed bg-neutral-50 text-neutral-500"
                : "cursor-pointer bg-neutral-900 text-white"
            }`}
          >
            {isUploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
                Creating...
              </>
            ) : (
              "Create Dataset"
            )}
          </button>
        </div>
      </div>

      {/* Right Panel - Dataset List + Selection */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-neutral-50">
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-neutral-900">
              Datasets
            </h3>
            {isLoadingColumns && (
              <span className="text-xs text-neutral-500">
                Loading columns...
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="p-16 text-center">
              <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
              <p className="text-sm text-neutral-500">Loading datasets...</p>
            </div>
          ) : datasets.length === 0 ? (
            <div className="p-16 text-center">
              <DatabaseIcon className="mx-auto mb-3 h-12 w-12 text-neutral-200" />
              <p className="mb-1 text-sm font-medium text-neutral-900">
                No datasets yet
              </p>
              <p className="text-xs text-neutral-500">
                Create your first dataset using the form on the left
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {datasets.map((dataset) => {
                const isSelected = datasetId === dataset.dataset_id.toString();
                return (
                  <div
                    key={dataset.dataset_id}
                    className={`cursor-pointer overflow-hidden rounded-lg border-l-[3px] bg-white transition-all ${
                      isSelected
                        ? "border-l-neutral-900 ring-2 ring-neutral-900 shadow-sm"
                        : "border-l-[#DCCFC3] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                    }`}
                    onClick={() =>
                      handleDatasetSelect(
                        dataset.dataset_id.toString(),
                        dataset.dataset_name,
                      )
                    }
                  >
                    <div className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <CheckIcon className="h-4 w-4 flex-shrink-0 text-green-600" />
                            )}
                            <div className="truncate text-sm font-semibold text-neutral-900">
                              {dataset.dataset_name}
                            </div>
                          </div>
                          {dataset.description && (
                            <EvalDatasetDescription
                              description={dataset.description}
                            />
                          )}
                          <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                            <span>{dataset.total_items} items</span>
                            {dataset.original_items > 0 &&
                              dataset.original_items !==
                                dataset.total_items && (
                                <>
                                  <span className="text-neutral-200">·</span>
                                  <span>{dataset.original_items} original</span>
                                </>
                              )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDataset(
                                dataset.dataset_id,
                                dataset.dataset_name,
                              );
                            }}
                            disabled={viewingId === dataset.dataset_id}
                            className={`rounded-lg border border-neutral-200 bg-transparent px-3 py-1.5 text-xs font-medium text-neutral-900 ${
                              viewingId === dataset.dataset_id
                                ? "opacity-50"
                                : ""
                            }`}
                          >
                            {viewingId === dataset.dataset_id
                              ? "Loading..."
                              : "View"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(dataset.dataset_id);
                            }}
                            aria-label={`Delete ${dataset.dataset_name}`}
                            className="rounded-lg border border-neutral-200 bg-transparent px-3 py-1.5 text-xs font-medium text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 flex flex-shrink-0 items-center justify-between border-t border-neutral-200 bg-white px-6 py-3">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
            <span className="text-xs text-neutral-500">
              {canProceed
                ? "Dataset selected. Continue to AI configuration."
                : "Select a dataset to continue."}
            </span>
            <button
              onClick={onNext}
              disabled={!canProceed}
              className={`rounded-lg px-5 py-2 text-sm font-medium ${
                canProceed
                  ? "cursor-pointer bg-neutral-900 text-white"
                  : "cursor-not-allowed bg-neutral-50 text-neutral-500"
              }`}
            >
              Next: AI Configuration
            </button>
          </div>
        </div>
      </div>

      {/* View Dataset Modal */}
      {viewModalData && (
        <DataViewModal
          title={viewModalData.name}
          headers={viewModalData.headers}
          rows={viewModalData.rows}
          onClose={() => setViewModalData(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId !== null &&
        (() => {
          const dataset = datasets.find(
            (d) => d.dataset_id === confirmDeleteId,
          );
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={() => setConfirmDeleteId(null)}
            >
              <div
                className="w-full max-w-md rounded-lg bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-600/10">
                      <span className="text-red-700">
                        <WarningIcon className="w-5 h-5" />
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900">
                        Delete dataset
                      </h3>
                      <p className="mt-1 text-sm text-neutral-500">
                        Are you sure you want to delete{" "}
                        <strong className="text-neutral-900">
                          {dataset?.dataset_name}
                        </strong>
                        ? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded-lg border border-neutral-200 bg-transparent px-4 py-2 text-sm font-medium text-neutral-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteDataset(confirmDeleteId);
                      setConfirmDeleteId(null);
                    }}
                    disabled={deletingId === confirmDeleteId}
                    className={`rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white ${
                      deletingId === confirmDeleteId ? "opacity-50" : ""
                    }`}
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
