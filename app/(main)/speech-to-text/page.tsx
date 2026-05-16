/**
 * Speech-to-Text Evaluation Page
 *
 * Tab 1 - Datasets: Create datasets with audio uploads
 * Tab 2 - Evaluations: Run and monitor STT evaluations
 */

"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import TabNavigation from "@/app/components/ui/TabNavigation";
import { useToast } from "@/app/components/ui/Toast";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useApp } from "@/app/lib/context/AppContext";
import { apiFetch } from "@/app/lib/apiClient";
import ErrorModal from "@/app/components/ui/ErrorModal";
import DatasetsTab from "@/app/components/speech-to-text/DatasetsTab";
import EvaluationsTab from "@/app/components/speech-to-text/EvaluationsTab";
import { useSttData } from "@/app/hooks/useSttData";
import {
  AudioFile,
  CreateDatasetResponse,
  CreateRunResponse,
} from "@/app/lib/types/speechToText";
import { Tab } from "@/app/lib/types/evaluation";

export default function SpeechToTextPage() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("datasets");
  const { sidebarCollapsed } = useApp();
  const [leftPanelWidth] = useState(450);
  const { apiKeys, isAuthenticated } = useAuth();

  const {
    languages,
    datasets,
    runs,
    results,
    selectedRunId,
    setSelectedRunId,
    setResults,
    isLoadingDatasets,
    isLoadingRuns,
    isLoadingResults,
    loadDatasets,
    loadRuns,
    loadResults,
  } = useSttData(activeTab);

  const [datasetName, setDatasetName] = useState("");
  const [datasetDescription, setDatasetDescription] = useState("");
  const [datasetLanguageId, setDatasetLanguageId] = useState<number>(1);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [playingFileId, setPlayingFileId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [evaluationName, setEvaluationName] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(
    null,
  );
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-pro");
  const [isRunning, setIsRunning] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  useEffect(() => {
    if (languages.length > 0 && languages[0]?.id) {
      setDatasetLanguageId(languages[0].id);
    }
  }, [languages]);

  const handleAudioFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;

    if (!files || files.length === 0) return;

    if (!isAuthenticated) {
      toast.error("Please add an API key in Keystore first");
      return;
    }

    const validTypes = [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm"];

    for (const file of Array.from(files)) {
      if (!validTypes.some((ext) => file.name.toLowerCase().endsWith(ext))) {
        toast.error(`${file.name}: Invalid file type`);
        continue;
      }

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      try {
        const base64 = await base64Promise;
        const localId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        setAudioFiles((prev) => [
          ...prev,
          {
            id: localId,
            file,
            name: file.name,
            size: file.size,
            base64,
            mediaType: file.type || "audio/mpeg",
            groundTruth: "",
            languageId: datasetLanguageId,
            fileId: undefined,
          },
        ]);

        const formData = new FormData();
        formData.append("file", file);

        const uploadData = await apiFetch<{
          file_id?: string;
          id?: string;
          data?: { file_id?: string; id?: string };
        }>("/api/evaluations/stt/files", apiKeys[0]?.key ?? "", {
          method: "POST",
          body: formData,
        });

        const backendFileId =
          uploadData.file_id ||
          uploadData.id ||
          uploadData.data?.file_id ||
          uploadData.data?.id;

        if (!backendFileId) {
          console.error(
            "No file ID found in response. Full response:",
            JSON.stringify(uploadData, null, 2),
          );
          throw new Error(
            `No file ID returned from backend. Response: ${JSON.stringify(uploadData)}`,
          );
        }

        setAudioFiles((prev) =>
          prev.map((f) =>
            f.id === localId ? { ...f, fileId: backendFileId } : f,
          ),
        );
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}`);
        setAudioFiles((prev) => prev.filter((f) => f.name !== file.name));
      }
    }

    event.target.value = "";
  };

  const triggerAudioUpload = () => {
    const input = document.getElementById("audio-upload") as HTMLInputElement;
    if (input) input.click();
  };

  const removeAudioFile = (id: string) => {
    setAudioFiles((prev) => prev.filter((f) => f.id !== id));
    if (playingFileId === id) setPlayingFileId(null);
  };

  const updateGroundTruth = (id: string, groundTruth: string) => {
    setAudioFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, groundTruth } : f)),
    );
  };

  const updateFileLanguage = (id: string, languageId: number) => {
    setAudioFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, languageId } : f)),
    );
  };

  const handleCreateDataset = async () => {
    if (!datasetName.trim()) {
      toast.error("Please enter a dataset name");
      return;
    }

    if (audioFiles.length === 0) {
      toast.error("Please add at least one audio file");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Please add an API key in Keystore first");
      return;
    }

    const filesNotUploaded = audioFiles.filter((f) => !f.fileId);
    if (filesNotUploaded.length > 0) {
      toast.error(
        `${filesNotUploaded.length} file(s) still uploading. Please wait...`,
      );
      return;
    }

    setIsCreating(true);

    try {
      const samples = audioFiles.map((audioFile) => ({
        file_id: audioFile.fileId!,
        ground_truth: audioFile.groundTruth.trim() || undefined,
        language_id: audioFile.languageId,
      }));

      const payload = {
        name: datasetName.trim(),
        description: datasetDescription.trim() || undefined,
        language_id: datasetLanguageId,
        samples: samples,
      };
      await apiFetch<CreateDatasetResponse>(
        "/api/evaluations/stt/datasets",
        apiKeys[0]?.key ?? "",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      toast.success(`Dataset "${datasetName}" created successfully!`);

      setDatasetName("");
      setDatasetDescription("");
      setDatasetLanguageId(languages[0]?.id ?? 1);
      setAudioFiles([]);

      await loadDatasets();
    } catch (error) {
      console.error("Failed to create dataset:", error);
      toast.error(
        `Failed to create dataset: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleRunEvaluation = async () => {
    if (!isAuthenticated) {
      toast.error("Please add an API key in Keystore first");
      return;
    }

    if (!selectedDatasetId) {
      toast.error("Please select a dataset");
      return;
    }

    if (!evaluationName.trim()) {
      toast.error("Please enter an evaluation name");
      return;
    }

    setIsRunning(true);

    try {
      await apiFetch<CreateRunResponse>(
        "/api/evaluations/stt/runs",
        apiKeys[0]?.key ?? "",
        {
          method: "POST",
          body: JSON.stringify({
            run_name: evaluationName.trim(),
            dataset_id: selectedDatasetId,
            model: selectedModel,
          }),
        },
      );

      setSelectedModel("gemini-2.5-pro");
      setEvaluationName("");
      setSelectedDatasetId(null);

      await loadRuns();
    } catch (error) {
      console.error("Failed to run evaluation:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred while starting the evaluation";
      setErrorModalMessage(errorMessage);
      setErrorModalOpen(true);
    } finally {
      setIsRunning(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/speech-to-text" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader
            title="Speech-to-Text Evaluation"
            subtitle="Compare transcription quality across STT models"
          />

          <TabNavigation
            tabs={[
              { id: "datasets", label: "Datasets" },
              { id: "evaluations", label: "Evaluations" },
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as Tab)}
          />

          {!isAuthenticated ? (
            <div className="flex-1 flex items-center justify-center bg-bg-secondary">
              <div className="text-center">
                <p className="text-sm font-medium mb-1 text-text-primary">
                  Authentication required
                </p>
                <p className="text-xs mb-4 text-text-secondary">
                  Please sign in to start creating datasets and running
                  evaluations
                </p>
              </div>
            </div>
          ) : activeTab === "datasets" ? (
            <DatasetsTab
              leftPanelWidth={leftPanelWidth}
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
              datasets={datasets}
              isLoadingDatasets={isLoadingDatasets}
              loadDatasets={loadDatasets}
              apiKeys={apiKeys}
              languages={languages}
              toast={toast}
            />
          ) : (
            <EvaluationsTab
              leftPanelWidth={leftPanelWidth}
              evaluationName={evaluationName}
              setEvaluationName={setEvaluationName}
              datasets={datasets}
              isLoadingDatasets={isLoadingDatasets}
              selectedDatasetId={selectedDatasetId}
              setSelectedDatasetId={setSelectedDatasetId}
              selectedDataset={selectedDataset}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              isRunning={isRunning}
              handleRunEvaluation={handleRunEvaluation}
              runs={runs}
              isLoadingRuns={isLoadingRuns}
              loadRuns={loadRuns}
              selectedRunId={selectedRunId}
              setSelectedRunId={setSelectedRunId}
              results={results}
              setResults={setResults}
              isLoadingResults={isLoadingResults}
              loadResults={loadResults}
              apiKeys={apiKeys}
              toast={toast}
              setActiveTab={setActiveTab}
            />
          )}
        </div>
      </div>

      <ErrorModal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title="Error"
        message={errorModalMessage}
      />
    </div>
  );
}
