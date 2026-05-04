"use client";

import { useState } from "react";
import { Dataset, ViewDatasetModalData } from "@/app/lib/types/dataset";
import { useToast } from "@/app/components/Toast";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import { DatabaseIcon } from "@/app/components/icons";
import { DatasetListSkeleton } from "@/app/components";
import DatasetCard from "./DatasetCard";
import CreateDatasetForm from "./CreateDatasetForm";
import ViewDatasetModal from "./ViewDatasetModal";
import DeleteDatasetModal from "./DeleteDatasetModal";

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

const parseCsvRow = (line: string): string[] => {
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
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [viewModalData, setViewModalData] =
    useState<ViewDatasetModalData | null>(null);

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

      const lines = csvText.split("\n").filter((l: string) => l.trim());
      const headers = lines.length > 0 ? parseCsvRow(lines[0]) : [];
      const rows = lines.slice(1).map(parseCsvRow);

      setViewModalData({
        name: datasetName,
        headers,
        rows,
        signedUrl: signedUrl || "",
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to view dataset",
      );
    } finally {
      setViewingId(null);
    }
  };

  const datasetToDelete =
    confirmDeleteId !== null
      ? storedDatasets.find((d) => d.dataset_id === confirmDeleteId)
      : undefined;

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden bg-bg-secondary">
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-text-primary">
              Datasets
            </h3>
          </div>

          {isDatasetsLoading ? (
            <DatasetListSkeleton />
          ) : storedDatasets.length === 0 ? (
            <div className="p-16 text-center">
              <DatabaseIcon className="w-12 h-12 mx-auto mb-3 text-border" />
              <p className="text-sm font-medium mb-1 text-text-primary">
                No datasets yet
              </p>
              <p className="text-xs text-text-secondary">
                Create your first dataset using the form on the right
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {storedDatasets.map((dataset) => (
                <DatasetCard
                  key={dataset.dataset_id}
                  dataset={dataset}
                  isViewing={viewingId === dataset.dataset_id}
                  onView={() =>
                    handleViewDataset(dataset.dataset_id, dataset.dataset_name)
                  }
                  onRequestDelete={() => setConfirmDeleteId(dataset.dataset_id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="shrink-0 border-l flex flex-col overflow-hidden bg-bg-primary border-border"
        style={{ width: `${leftPanelWidth}px` }}
      >
        <CreateDatasetForm
          datasetName={datasetName}
          setDatasetName={setDatasetName}
          datasetDescription={datasetDescription}
          setDatasetDescription={setDatasetDescription}
          duplicationFactor={duplicationFactor}
          setDuplicationFactor={setDuplicationFactor}
          uploadedFile={uploadedFile}
          onFileSelect={onFileSelect}
          onRemoveFile={onRemoveFile}
          isUploading={isUploading}
          handleCreateDataset={handleCreateDataset}
          resetForm={resetForm}
        />
      </div>

      {viewModalData && (
        <ViewDatasetModal
          data={viewModalData}
          onClose={() => setViewModalData(null)}
        />
      )}

      {confirmDeleteId !== null && (
        <DeleteDatasetModal
          datasetName={datasetToDelete?.dataset_name}
          isDeleting={deletingId === confirmDeleteId}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => {
            handleDeleteDataset(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
        />
      )}
    </div>
  );
}
