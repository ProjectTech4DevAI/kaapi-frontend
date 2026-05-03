"use client";

import { useState } from "react";
import {
  TextSample,
  TTSDataset,
  TTSDatasetDetailResponse,
  TTSViewDatasetModalData,
} from "@/app/lib/types/textToSpeech";
import { Language } from "@/app/lib/types/speechToText";
import { APIKey } from "@/app/lib/types/credentials";
import { useToast } from "@/app/components/Toast";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import { DatabaseIcon } from "@/app/components/icons";
import { DatasetListSkeleton } from "@/app/components";
import TTSDatasetCard from "./TTSDatasetCard";
import CreateTTSDatasetForm from "./CreateTTSDatasetForm";
import TTSViewDatasetModal from "./TTSViewDatasetModal";

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
      if (ch === "\r") i++;
    } else {
      current += ch;
    }
  }
  if (current.trim()) records.push(current);
  return records;
};

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
  const [viewModalData, setViewModalData] =
    useState<TTSViewDatasetModalData | null>(null);

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

      const lines = splitCSVRecords(csvText);
      const headers = lines.length > 0 ? parseCsvRow(lines[0]) : [];
      const rows = lines.slice(1).map(parseCsvRow);

      setViewModalData({ name: datasetName, headers, rows });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to view dataset",
      );
    } finally {
      setViewingId(null);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Dataset List */}
      <div className="flex-1 flex flex-col overflow-hidden bg-bg-secondary">
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-text-primary">
              Datasets
            </h3>
          </div>

          {isLoadingDatasets ? (
            <DatasetListSkeleton />
          ) : datasets.length === 0 ? (
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
              {datasets.map((dataset) => (
                <TTSDatasetCard
                  key={dataset.id}
                  dataset={dataset}
                  isViewing={viewingId === dataset.id}
                  onView={() => handleViewDataset(dataset.id, dataset.name)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Create Dataset Form */}
      <div
        className="shrink-0 border-l flex flex-col overflow-hidden bg-bg-primary border-border"
        style={{ width: `${leftPanelWidth}px` }}
      >
        <CreateTTSDatasetForm
          datasetName={datasetName}
          setDatasetName={setDatasetName}
          datasetDescription={datasetDescription}
          setDatasetDescription={setDatasetDescription}
          datasetLanguageId={datasetLanguageId}
          setDatasetLanguageId={setDatasetLanguageId}
          languages={languages}
          textSamples={textSamples}
          addTextSample={addTextSample}
          removeTextSample={removeTextSample}
          updateSampleText={updateSampleText}
          isCreating={isCreating}
          handleCreateDataset={handleCreateDataset}
          resetForm={resetForm}
        />
      </div>

      {viewModalData && (
        <TTSViewDatasetModal
          data={viewModalData}
          onClose={() => setViewModalData(null)}
        />
      )}
    </div>
  );
}
