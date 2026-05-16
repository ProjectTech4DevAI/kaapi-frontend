/**
 * Datasets - Dataset Management Interface
 * Allows users to upload CSV datasets and manage them via backend API.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useApp } from "@/app/lib/context/AppContext";
import { apiFetch } from "@/app/lib/apiClient";
import Sidebar from "@/app/components/Sidebar";
import { PageHeader } from "@/app/components";
import { useToast } from "@/app/components/ui/Toast";
import DatasetListing from "@/app/components/datasets/DatasetListing";
import UploadDatasetModal from "@/app/components/datasets/UploadDatasetModal";
import DeleteDatasetModal from "@/app/components/datasets/DeleteDatasetModal";
import { Dataset } from "@/app/lib/types/dataset";

export const DATASETS_STORAGE_KEY = "kaapi_datasets";

const ITEMS_PER_PAGE = 10;

export default function Datasets() {
  const toast = useToast();
  const { sidebarCollapsed } = useApp();
  const { activeKey: apiKey, isAuthenticated } = useAuth();

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [duplicationFactor, setDuplicationFactor] = useState("1");
  const [isUploading, setIsUploading] = useState(false);

  const [datasetToDelete, setDatasetToDelete] = useState<Dataset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDatasets = useCallback(async () => {
    if (!isAuthenticated) {
      setError("Please log in to continue.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<Dataset[] | { data: Dataset[] }>(
        "/api/evaluations/datasets",
        apiKey?.key ?? "",
      );
      const list = Array.isArray(data) ? data : data.data || [];
      setDatasets(list);
    } catch (err: unknown) {
      console.error("Failed to fetch datasets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch datasets");
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDatasets();
    }
  }, [fetchDatasets, isAuthenticated]);

  const resetUploadForm = () => {
    setSelectedFile(null);
    setDatasetName("");
    setDuplicationFactor("1");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      event.target.value = "";
      return;
    }
    setSelectedFile(file);
    setDatasetName(file.name.replace(/\.csv$/i, ""));
  };

  const handleUpload = async () => {
    if (!selectedFile) return toast.error("Please select a file first");
    if (!datasetName.trim()) return toast.error("Please enter a dataset name");
    if (!isAuthenticated) return toast.error("Please log in to continue.");

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("dataset_name", datasetName.trim());
      formData.append("duplication_factor", duplicationFactor || "1");

      await apiFetch<Dataset>("/api/evaluations/datasets", apiKey?.key ?? "", {
        method: "POST",
        body: formData,
      });
      await fetchDatasets();

      resetUploadForm();
      setIsUploadOpen(false);
      toast.success("Dataset uploaded successfully!");
    } catch (e) {
      console.error("Upload error:", e);
      toast.error(
        `Failed to upload dataset: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRequestDelete = (datasetId: number) => {
    if (!isAuthenticated) {
      toast.error("Please log in to continue");
      return;
    }
    const target = datasets.find((d) => d.dataset_id === datasetId);
    if (target) setDatasetToDelete(target);
  };

  const handleConfirmDelete = async () => {
    if (!datasetToDelete) return;
    setIsDeleting(true);
    try {
      await apiFetch(
        `/api/evaluations/datasets/${datasetToDelete.dataset_id}`,
        apiKey?.key ?? "",
        { method: "DELETE" },
      );
      await fetchDatasets();
      toast.success("Dataset deleted successfully");
      setDatasetToDelete(null);
    } catch (e) {
      console.error("Delete error:", e);
      toast.error(
        `Failed to delete dataset: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(datasets.length / ITEMS_PER_PAGE);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentDatasets = datasets.slice(start, start + ITEMS_PER_PAGE);

  const closeUpload = () => {
    setIsUploadOpen(false);
    resetUploadForm();
  };

  return (
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/datasets" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader
            title="Datasets"
            subtitle="Manage your evaluation datasets"
          />

          <div className="flex-1 overflow-auto p-6 bg-bg-secondary">
            <div className="max-w-6xl mx-auto space-y-6">
              <DatasetListing
                datasets={currentDatasets}
                onDelete={handleRequestDelete}
                onUploadNew={() => setIsUploadOpen(true)}
                isLoading={isLoading}
                error={error}
                isAuthenticated={isAuthenticated}
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      </div>

      <UploadDatasetModal
        open={isUploadOpen}
        selectedFile={selectedFile}
        datasetName={datasetName}
        duplicationFactor={duplicationFactor}
        isUploading={isUploading}
        onFileSelect={handleFileSelect}
        onDatasetNameChange={setDatasetName}
        onDuplicationFactorChange={setDuplicationFactor}
        onUpload={handleUpload}
        onClose={closeUpload}
      />

      <DeleteDatasetModal
        open={!!datasetToDelete}
        datasetName={datasetToDelete?.dataset_name}
        isDeleting={isDeleting}
        onClose={() => setDatasetToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
