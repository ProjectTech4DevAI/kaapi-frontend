"use client";

import { useState } from "react";
import {
  AudioFile,
  Dataset,
  Language,
  STTSample,
  STTViewDatasetModalData,
} from "@/app/lib/types/speechToText";
import { APIKey } from "@/app/lib/types/credentials";
import { useToast } from "@/app/components/Toast";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import { DatabaseIcon } from "@/app/components/icons";
import { DatasetListSkeleton } from "@/app/components";
import STTDatasetCard from "./STTDatasetCard";
import CreateSTTDatasetForm from "./CreateSTTDatasetForm";
import STTViewDatasetModal from "./STTViewDatasetModal";

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
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [viewModalData, setViewModalData] =
    useState<STTViewDatasetModalData | null>(null);
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

  const handleLocalGroundTruthChange = (sampleId: number, value: string) => {
    setViewModalData((prev) =>
      prev
        ? {
            ...prev,
            samples: prev.samples.map((s) =>
              s.id === sampleId ? { ...s, ground_truth: value } : s,
            ),
          }
        : null,
    );
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
                <STTDatasetCard
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
        <CreateSTTDatasetForm
          datasetName={datasetName}
          setDatasetName={setDatasetName}
          datasetDescription={datasetDescription}
          setDatasetDescription={setDatasetDescription}
          datasetLanguageId={datasetLanguageId}
          setDatasetLanguageId={setDatasetLanguageId}
          audioFiles={audioFiles}
          setAudioFiles={setAudioFiles}
          playingFileId={playingFileId}
          setPlayingFileId={setPlayingFileId}
          handleAudioFileSelect={handleAudioFileSelect}
          triggerAudioUpload={triggerAudioUpload}
          removeAudioFile={removeAudioFile}
          updateGroundTruth={updateGroundTruth}
          updateFileLanguage={updateFileLanguage}
          formatFileSize={formatFileSize}
          isCreating={isCreating}
          handleCreateDataset={handleCreateDataset}
          languages={languages}
        />
      </div>

      {viewModalData && (
        <STTViewDatasetModal
          data={viewModalData}
          languages={languages}
          savingSampleId={savingSampleId}
          onClose={() => setViewModalData(null)}
          onUpdateSample={handleUpdateSample}
          onLocalGroundTruthChange={handleLocalGroundTruthChange}
        />
      )}
    </div>
  );
}
