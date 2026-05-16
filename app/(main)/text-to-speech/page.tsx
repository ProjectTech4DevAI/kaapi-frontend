/**
 * Text-to-Speech Evaluation Page
 *
 * Tab 1 - Datasets: Create datasets with text samples
 * Tab 2 - Evaluations: Run and monitor TTS evaluations
 */

"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import TabNavigation from "@/app/components/ui/TabNavigation";
import { useToast } from "@/app/components/ui/Toast";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useApp } from "@/app/lib/context/AppContext";
import { apiFetch } from "@/app/lib/apiClient";
import ErrorModal from "@/app/components/ui/ErrorModal";
import DatasetsTab from "@/app/components/text-to-speech/DatasetsTab";
import EvaluationsTab from "@/app/components/text-to-speech/EvaluationsTab";
import {
  TTSTab,
  TextSample,
  TTSDataset,
  TTSRun,
  TTSResult,
  TTSResultRaw,
  TTSDatasetsResponse,
  TTSRunsResponse,
  TTSRunDetailResponse,
  TTSCreateDatasetResponse,
  TTSCreateRunResponse,
} from "@/app/lib/types/textToSpeech";
import {
  Language,
  DEFAULT_LANGUAGES,
  RawLanguage,
  LanguagesResponse,
} from "@/app/lib/types/speechToText";

export default function TextToSpeechPage() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TTSTab>("datasets");
  const { sidebarCollapsed } = useApp();
  const leftPanelWidth = 450;
  const { apiKeys, isAuthenticated } = useAuth();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [datasetName, setDatasetName] = useState("");
  const [datasetDescription, setDatasetDescription] = useState("");
  const [datasetLanguageId, setDatasetLanguageId] = useState<number>(1);
  const [textSamples, setTextSamples] = useState<TextSample[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [datasets, setDatasets] = useState<TTSDataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);
  const [evaluationName, setEvaluationName] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(
    null,
  );
  const [selectedModel, setSelectedModel] = useState(
    "gemini-2.5-pro-preview-tts",
  );
  const [isRunning, setIsRunning] = useState(false);
  const [runs, setRuns] = useState<TTSRun[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [results, setResults] = useState<TTSResult[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  const loadLanguages = async () => {
    if (!isAuthenticated) return;

    try {
      const data = await apiFetch<RawLanguage[] | LanguagesResponse>(
        "/api/languages",
        apiKeys[0]?.key ?? "",
      );

      let rawList: RawLanguage[] = [];
      if (Array.isArray(data)) {
        rawList = data;
      } else if (
        data.data &&
        !Array.isArray(data.data) &&
        Array.isArray(data.data.data)
      ) {
        rawList = data.data.data;
      } else if (data.data && Array.isArray(data.data)) {
        rawList = data.data;
      } else if (data.languages && Array.isArray(data.languages)) {
        rawList = data.languages;
      }

      const languagesList: Language[] = rawList
        .filter((l) => l.is_active !== false)
        .map((l) => ({
          id: l.id,
          code: l.locale || l.code || "",
          name: l.label || l.name || "",
        }));

      if (languagesList.length > 0) {
        setLanguages(languagesList);
        if (languagesList[0]?.id) {
          setDatasetLanguageId(languagesList[0].id);
        }
      } else {
        setLanguages(DEFAULT_LANGUAGES);
      }
    } catch (error) {
      console.error("Failed to load languages:", error);
      setLanguages(DEFAULT_LANGUAGES);
    }
  };

  const loadDatasets = async () => {
    if (!isAuthenticated) return;

    setIsLoadingDatasets(true);
    try {
      const data = await apiFetch<TTSDataset[] | TTSDatasetsResponse>(
        "/api/evaluations/tts/datasets",
        apiKeys[0]?.key ?? "",
      );

      let datasetsList: TTSDataset[] = [];
      if (Array.isArray(data)) {
        datasetsList = data;
      } else if (data.datasets && Array.isArray(data.datasets)) {
        datasetsList = data.datasets;
      } else if (data.data && Array.isArray(data.data)) {
        datasetsList = data.data;
      }

      setDatasets(datasetsList);
    } catch (error) {
      console.error("Failed to load datasets:", error);
      toast.error("Failed to load datasets");
      setDatasets([]);
    } finally {
      setIsLoadingDatasets(false);
    }
  };

  // Load evaluation runs
  const loadRuns = async () => {
    if (!isAuthenticated) return;

    setIsLoadingRuns(true);
    try {
      const data = await apiFetch<TTSRun[] | TTSRunsResponse>(
        "/api/evaluations/tts/runs",
        apiKeys[0]?.key ?? "",
      );

      let runsList: TTSRun[] = [];
      if (Array.isArray(data)) {
        runsList = data;
      } else if (data.runs && Array.isArray(data.runs)) {
        runsList = data.runs;
      } else if (data.data && Array.isArray(data.data)) {
        runsList = data.data;
      }

      setRuns(runsList);
    } catch (error) {
      console.error("Failed to load runs:", error);
      toast.error("Failed to load evaluation runs");
      setRuns([]);
    } finally {
      setIsLoadingRuns(false);
    }
  };

  useEffect(() => {
    loadLanguages();
    loadDatasets();
    if (activeTab === "evaluations") {
      loadRuns();
    }
  }, [apiKeys, activeTab]);

  const addTextSample = () => {
    setTextSamples((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        text: "",
      },
    ]);
  };

  const removeTextSample = (id: string) => {
    setTextSamples((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSampleText = (id: string, text: string) => {
    setTextSamples((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text } : s)),
    );
  };

  const handleCreateDataset = async () => {
    if (!datasetName.trim()) {
      toast.error("Please enter a dataset name");
      return;
    }

    const validSamples = textSamples.filter((s) => s.text.trim());
    if (validSamples.length === 0) {
      toast.error("Please add at least one text sample");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Please add an API key in Keystore first");
      return;
    }

    setIsCreating(true);

    try {
      const samples = validSamples.map((sample) => ({
        text: sample.text.trim(),
      }));

      await apiFetch<TTSCreateDatasetResponse>(
        "/api/evaluations/tts/datasets",
        apiKeys[0]?.key ?? "",
        {
          method: "POST",
          body: JSON.stringify({
            name: datasetName.trim(),
            description: datasetDescription.trim() || undefined,
            language_id: datasetLanguageId,
            samples,
          }),
        },
      );

      toast.success(`Dataset "${datasetName}" created successfully!`);

      setDatasetName("");
      setDatasetDescription("");
      setTextSamples([]);

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
      await apiFetch<TTSCreateRunResponse>(
        "/api/evaluations/tts/runs",
        apiKeys[0]?.key ?? "",
        {
          method: "POST",
          body: JSON.stringify({
            run_name: evaluationName.trim(),
            dataset_id: selectedDatasetId,
            models: [selectedModel],
          }),
        },
      );

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

  const loadResults = async (runId: number) => {
    if (!isAuthenticated) return;

    setIsLoadingResults(true);
    try {
      const runData = await apiFetch<TTSResultRaw[] | TTSRunDetailResponse>(
        `/api/evaluations/tts/runs/${runId}?include_results=true&include_signed_url=true`,
        apiKeys[0]?.key ?? "",
      );

      let rawResults: TTSResultRaw[] = [];
      if (Array.isArray(runData)) {
        rawResults = runData;
      } else if (runData.results && Array.isArray(runData.results)) {
        rawResults = runData.results;
      } else if (runData.data && Array.isArray(runData.data)) {
        rawResults = runData.data as TTSResultRaw[];
      } else if (
        runData.data &&
        !Array.isArray(runData.data) &&
        runData.data.results &&
        Array.isArray(runData.data.results)
      ) {
        rawResults = runData.data.results;
      }

      // Enrich results with signed URL for audio playback
      const resultsList: TTSResult[] = rawResults.map((result) => {
        const signedUrl = result.signed_url || result.sample?.signed_url || "";
        const { sample: _, ...rest } = result;
        return {
          ...rest,
          signedUrl,
        };
      });

      setResults(resultsList);
      setSelectedRunId(runId);
    } catch (error) {
      console.error("Failed to load results:", error);
      toast.error("Failed to load evaluation results");
      setResults([]);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/text-to-speech" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader
            title="Text-to-Speech Evaluation"
            subtitle="Compare synthesized audio quality across TTS models"
          />

          <TabNavigation
            tabs={[
              { id: "datasets", label: "Datasets" },
              { id: "evaluations", label: "Evaluations" },
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as TTSTab)}
          />

          {!isAuthenticated ? (
            <div className="flex-1 flex items-center justify-center bg-bg-secondary">
              <p className="text-sm text-text-secondary">
                Please sign in to start creating datasets and running
                evaluations.
              </p>
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
              languages={languages}
              textSamples={textSamples}
              addTextSample={addTextSample}
              removeTextSample={removeTextSample}
              updateSampleText={updateSampleText}
              isCreating={isCreating}
              handleCreateDataset={handleCreateDataset}
              resetForm={() => {
                setDatasetName("");
                setDatasetDescription("");
                setTextSamples([]);
              }}
              apiKeys={apiKeys}
              datasets={datasets}
              isLoadingDatasets={isLoadingDatasets}
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
