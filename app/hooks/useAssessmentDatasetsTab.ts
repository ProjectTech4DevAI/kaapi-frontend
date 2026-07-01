"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/app/lib/apiClient";
import type { Dataset } from "@/app/lib/types/dataset";
import { useToast } from "@/app/hooks/useToast";
import { useAuth } from "@/app/lib/context/AuthContext";
import {
  extractCreatedDataset,
  fetchDatasetPreview,
  handleForbiddenError,
  isAllowedDatasetFile,
  isBlankCell,
} from "@/app/lib/utils/assessment";
import { PREVIEW_ROW_LIMIT } from "@/app/lib/assessment/results";
import {
  DATASET_SAMPLE_ROW_LIMIT,
  MAX_DATASET_FILE_BYTES,
} from "@/app/lib/assessment/constants";
import type {
  CreateDatasetResponse,
  DatasetPreview,
  DatasetResponse,
  DatasetsTabProps,
  DatasetViewModalData,
} from "@/app/lib/types/assessment";

type UseAssessmentDatasetsTabParams = Pick<
  DatasetsTabProps,
  | "onForbidden"
  | "datasetId"
  | "setDatasetId"
  | "setSelectedDatasetName"
  | "onColumnsLoaded"
>;

export interface UseAssessmentDatasetsTabResult {
  datasets: Dataset[];
  isLoading: boolean;
  isLoadingColumns: boolean;
  viewingId: number | null;
  canProceed: boolean;
  datasetName: string;
  datasetDescription: string;
  uploadedFile: File | null;
  isDragging: boolean;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  viewModalData: DatasetViewModalData | null;
  confirmDeleteId: number | null;
  deletingId: number | null;
  datasetPendingDelete: Dataset | undefined;
  setDatasetName: (value: string) => void;
  setDatasetDescription: (value: string) => void;
  setUploadedFile: (value: File | null) => void;
  setIsDragging: (value: boolean) => void;
  setConfirmDeleteId: (value: number | null) => void;
  setViewModalData: (value: DatasetViewModalData | null) => void;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  resetForm: () => void;
  handleCreateDataset: () => Promise<void>;
  handleDatasetSelect: (id: string, name?: string) => Promise<void>;
  handleViewDataset: (datasetId: number, name: string) => Promise<void>;
  handleDeleteDataset: (id: number) => Promise<void>;
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}

export function useAssessmentDatasetsTab({
  onForbidden,
  datasetId,
  setDatasetId,
  setSelectedDatasetName,
  onColumnsLoaded,
}: UseAssessmentDatasetsTabParams): UseAssessmentDatasetsTabResult {
  const toast = useToast();
  const { activeKey, isAuthenticated } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);
  const [datasetName, setDatasetName] = useState("");
  const [datasetDescription, setDatasetDescription] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [viewModalData, setViewModalData] =
    useState<DatasetViewModalData | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [previewCache, setPreviewCache] = useState<
    Record<string, DatasetPreview>
  >({});

  const loadDatasets = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await apiFetch<DatasetResponse>(
        "/api/assessment/datasets",
        apiKey,
      );
      setDatasets(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      if (handleForbiddenError(error, onForbidden)) return;
      console.error("Failed to load datasets:", error);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, isAuthenticated, onForbidden]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  useEffect(() => {
    if (!datasetId || datasets.length === 0) return;
    const selected = datasets.find(
      (dataset) => dataset.dataset_id.toString() === datasetId,
    );
    if (selected?.dataset_name) {
      setSelectedDatasetName(selected.dataset_name);
    }
  }, [datasetId, datasets, setSelectedDatasetName]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAllowedDatasetFile(file.name)) {
      toast.error("Please select a CSV or Excel (.xlsx, .xls) file");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_DATASET_FILE_BYTES) {
      toast.error(
        `File too large. Max ${MAX_DATASET_FILE_BYTES / (1024 * 1024)}MB allowed.`,
      );
      event.target.value = "";
      return;
    }

    setUploadedFile(file);
    if (!datasetName) {
      setDatasetName(file.name.replace(/\.(csv|xlsx|xls)$/i, ""));
    }
  };

  const resetForm = () => {
    setDatasetName("");
    setDatasetDescription("");
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
      const cached = previewCache[id];
      const parsed =
        cached ??
        (await fetchDatasetPreview(id, apiKey, DATASET_SAMPLE_ROW_LIMIT));
      if (!cached) {
        setPreviewCache((prev) => ({ ...prev, [id]: parsed }));
      }
      const keptIdx = parsed.headers
        .map((_, colIdx) => colIdx)
        .filter((colIdx) =>
          parsed.rows.some((row) => !isBlankCell(row[colIdx])),
        );

      const filteredHeaders = keptIdx.map((idx) => parsed.headers[idx]);
      const firstRow = parsed.rows[0] || [];
      const sampleRow = Object.fromEntries(
        keptIdx.map((idx) => [
          parsed.headers[idx],
          String(firstRow[idx] ?? ""),
        ]),
      );
      onColumnsLoaded(filteredHeaders, sampleRow);
    } catch (error) {
      if (handleForbiddenError(error, onForbidden)) return;
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch dataset columns.";
      onColumnsLoaded([]);
      setDatasetId("");
      setSelectedDatasetName("");
      toast.error(message);
    } finally {
      setIsLoadingColumns(false);
    }
  };

  const handleCreateDataset = async () => {
    if (!uploadedFile || !datasetName.trim() || !isAuthenticated) return;

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

      const created = extractCreatedDataset(data);
      if (created?.dataset_id) {
        void handleDatasetSelect(
          created.dataset_id.toString(),
          created.dataset_name ?? datasetName.trim(),
        );
      }

      resetForm();
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

  const handleViewDataset = async (selectedDatasetId: number, name: string) => {
    const cacheKey = String(selectedDatasetId);
    const cached = previewCache[cacheKey];
    if (cached) {
      setViewModalData({ name, headers: cached.headers, rows: cached.rows });
      return;
    }

    setViewingId(selectedDatasetId);
    try {
      const parsed = await fetchDatasetPreview(
        selectedDatasetId,
        apiKey,
        PREVIEW_ROW_LIMIT,
      );
      setPreviewCache((prev) => ({ ...prev, [cacheKey]: parsed }));
      setViewModalData({ name, headers: parsed.headers, rows: parsed.rows });
    } catch (error) {
      if (handleForbiddenError(error, onForbidden)) return;
      toast.error(
        error instanceof Error ? error.message : "Failed to view dataset",
      );
    } finally {
      setViewingId(null);
    }
  };

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
    } catch (error) {
      if (handleForbiddenError(error, onForbidden)) return;
      toast.error(
        error instanceof Error ? error.message : "Failed to delete dataset",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (!file || !isAllowedDatasetFile(file.name)) return;

    if (file.size > MAX_DATASET_FILE_BYTES) {
      toast.error(
        `File too large. Max ${MAX_DATASET_FILE_BYTES / (1024 * 1024)}MB allowed.`,
      );
      return;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    if (!fileInputRef.current) return;

    fileInputRef.current.files = dataTransfer.files;
    fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const canProceed = Boolean(datasetId) && !isLoadingColumns;
  const datasetPendingDelete = datasets.find(
    (dataset) => dataset.dataset_id === confirmDeleteId,
  );

  return {
    datasets,
    isLoading,
    isLoadingColumns,
    viewingId,
    canProceed,
    datasetName,
    datasetDescription,
    uploadedFile,
    isDragging,
    isUploading,
    fileInputRef,
    viewModalData,
    confirmDeleteId,
    deletingId,
    datasetPendingDelete,
    setDatasetName,
    setDatasetDescription,
    setUploadedFile,
    setIsDragging,
    setConfirmDeleteId,
    setViewModalData,
    handleFileSelect,
    resetForm,
    handleCreateDataset,
    handleDatasetSelect,
    handleViewDataset,
    handleDeleteDataset,
    handleDrop,
  };
}
