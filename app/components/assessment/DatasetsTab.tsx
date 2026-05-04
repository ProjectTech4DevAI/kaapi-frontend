"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/app/lib/apiClient";
import { Dataset } from "@/app/lib/types/dataset";
import { useToast } from "@/app/components/Toast";
import { useAuth } from "@/app/lib/context/AuthContext";
import { handleForbiddenError } from "@/app/lib/assessment/access";
import type {
  CreateDatasetResponse,
  DatasetResponse,
  DatasetsTabProps,
  DatasetViewModalData,
} from "@/app/lib/types/assessment";
import DataViewModal from "./DataViewModal";
import DeleteModal from "./datasets/DeleteModal";
import CreatePanel from "./datasets/CreatePanel";
import DatasetList from "./datasets/DatasetList";
import {
  extractCreatedDataset,
  fetchAndParseDatasetFile,
  isAllowedDatasetFile,
} from "./datasets/utils";

export default function DatasetsTab({
  onForbidden,
  datasetId,
  setDatasetId,
  setSelectedDatasetName,
  onColumnsLoaded,
  onNext,
}: DatasetsTabProps) {
  const toast = useToast();
  const { activeKey } = useAuth();
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

  const loadDatasets = useCallback(async () => {
    if (!apiKey) return;
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
  }, [apiKey, onForbidden]);

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
      const parsed = await fetchAndParseDatasetFile(id, apiKey);
      const firstRow = parsed.rows[0] || [];
      const sampleRow = Object.fromEntries(
        parsed.headers.map((header, index) => [
          header,
          String(firstRow[index] ?? ""),
        ]),
      );
      onColumnsLoaded(parsed.headers, sampleRow);
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

  const handleViewDataset = async (selectedDatasetId: number, name: string) => {
    setViewingId(selectedDatasetId);
    try {
      const parsed = await fetchAndParseDatasetFile(selectedDatasetId, apiKey);
      setViewModalData({
        name,
        headers: parsed.headers,
        rows: parsed.rows,
      });
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

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <DatasetList
        datasets={datasets}
        datasetId={datasetId}
        isLoading={isLoading}
        isLoadingColumns={isLoadingColumns}
        viewingId={viewingId}
        canProceed={canProceed}
        onSelectDataset={handleDatasetSelect}
        onViewDataset={handleViewDataset}
        onRequestDelete={setConfirmDeleteId}
        onNext={onNext}
      />

      <CreatePanel
        datasetName={datasetName}
        datasetDescription={datasetDescription}
        uploadedFile={uploadedFile}
        isDragging={isDragging}
        isUploading={isUploading}
        fileInputRef={fileInputRef}
        onDatasetNameChange={setDatasetName}
        onDatasetDescriptionChange={setDatasetDescription}
        onFileSelect={handleFileSelect}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onRemoveFile={() => {
          setUploadedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        onResetForm={resetForm}
        onCreateDataset={handleCreateDataset}
      />

      {viewModalData && (
        <DataViewModal
          title={viewModalData.name}
          headers={viewModalData.headers}
          rows={viewModalData.rows}
          onClose={() => setViewModalData(null)}
        />
      )}

      {confirmDeleteId !== null && (
        <DeleteModal
          datasetName={datasetPendingDelete?.dataset_name}
          isDeleting={deletingId === confirmDeleteId}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => {
            void handleDeleteDataset(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
        />
      )}
    </div>
  );
}
