"use client";

import { useState } from "react";
import { Dataset, ViewDatasetModalData } from "@/app/lib/types/dataset";
import { useToast } from "@/app/components/Toast";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import { DatabaseIcon, PlusIcon } from "@/app/components/icons";
import { Button, DatasetListSkeleton, Modal } from "@/app/components";
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
  handleCreateDataset: () => Promise<boolean>;
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
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
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

  const handleCreate = async (): Promise<boolean> => {
    const success = await handleCreateDataset();
    if (success) setIsFormModalOpen(false);
    return success;
  };

  const formProps = {
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
    handleCreateDataset: handleCreate,
    resetForm,
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden bg-bg-secondary">
        <div className="flex-1 overflow-auto p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-semibold text-text-primary">
              Datasets
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsFormModalOpen(true)}
              className="lg:hidden"
            >
              <PlusIcon className="w-4 h-4" />
              New
            </Button>
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
                <span className="hidden lg:inline">
                  Create your first dataset using the form on the right
                </span>
                <span className="lg:hidden">
                  Tap <strong>New</strong> to create your first dataset
                </span>
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

      {/* Right Panel - Create Dataset Form (lg+ only) */}
      <div
        className="hidden lg:flex shrink-0 border-l flex-col overflow-hidden bg-bg-primary border-border"
        style={{ width: `${leftPanelWidth}px` }}
      >
        <CreateDatasetForm {...formProps} />
      </div>

      {/* Mobile/tablet — form rendered in a modal */}
      <Modal
        open={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title="Create New Dataset"
        maxWidth="max-w-2xl"
        maxHeight="max-h-[90vh]"
      >
        <CreateDatasetForm {...formProps} />
      </Modal>

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
