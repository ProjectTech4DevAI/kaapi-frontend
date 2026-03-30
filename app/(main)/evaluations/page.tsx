/**
 * Text Evaluation Page
 *
 * Tab 1 - Datasets: Create QnA datasets with CSV upload
 * Tab 2 - Evaluations: Configure and run evaluations, view results
 */

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { colors } from "@/app/lib/colors";
import { useSearchParams } from "next/navigation";
import { Dataset } from "@/app/(main)/datasets/page";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import TabNavigation from "@/app/components/TabNavigation";
import { useToast } from "@/app/components/Toast";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useApp } from "@/app/lib/context/AppContext";
import { apiFetch } from "@/app/lib/apiClient";
import Loader from "@/app/components/Loader";
import DatasetsTab from "@/app/components/evaluations/DatasetsTab";
import EvaluationsTab from "@/app/components/evaluations/EvaluationsTab";

type Tab = "datasets" | "evaluations";

const leftPanelWidth = 450;

function SimplifiedEvalContent() {
  const searchParams = useSearchParams();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tabParam = searchParams.get("tab");
    return tabParam === "evaluations" || tabParam === "datasets"
      ? (tabParam as Tab)
      : "datasets";
  });

  const { sidebarCollapsed } = useApp();
  const { activeKey } = useAuth();
  const [mounted, setMounted] = useState(false);
  // Dataset creation state
  const [datasetName, setDatasetName] = useState("");
  const [datasetDescription, setDatasetDescription] = useState("");
  const [duplicationFactor, setDuplicationFactor] = useState("1");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Stored datasets
  const [storedDatasets, setStoredDatasets] = useState<Dataset[]>([]);
  const [isDatasetsLoading, setIsDatasetsLoading] = useState(false);

  // Evaluation config state
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(() => {
    return searchParams.get("dataset") || "";
  });
  const [experimentName, setExperimentName] = useState<string>(() => {
    return searchParams.get("experiment") || "";
  });
  const [selectedConfigId, setSelectedConfigId] = useState<string>(() => {
    return searchParams.get("config") || "";
  });
  const [selectedConfigVersion, setSelectedConfigVersion] = useState<number>(
    () => {
      const version = searchParams.get("version");
      return version ? parseInt(version) : 0;
    },
  );
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadStoredDatasets = useCallback(async () => {
    if (!activeKey?.key) {
      console.error("No selected API key found for loading datasets");
      return;
    }
    setIsDatasetsLoading(true);
    try {
      const data = await apiFetch<Dataset[] | { data: Dataset[] }>(
        "/api/evaluations/datasets",
        activeKey.key,
      );
      setStoredDatasets(Array.isArray(data) ? data : data.data || []);
    } catch (e) {
      console.error("Failed to load datasets:", e);
    } finally {
      setIsDatasetsLoading(false);
    }
  }, [activeKey]);

  useEffect(() => {
    if (activeKey?.key) loadStoredDatasets();
  }, [activeKey, loadStoredDatasets]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      event.target.value = "";
      return;
    }

    // Validate CSV has exactly "question" and "answer" columns
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast.error("Failed to read CSV file");
        event.target.value = "";
        return;
      }
      const firstLine = text.split("\n")[0]?.trim();
      if (!firstLine) {
        toast.error("CSV file is empty");
        event.target.value = "";
        return;
      }
      const headers = firstLine.split(",").map((h) =>
        h
          .trim()
          .replace(/^["']|["']$/g, "")
          .toLowerCase(),
      );
      const required = ["question", "answer"];
      const hasRequired = required.every((col) => headers.includes(col));
      const hasExtra = headers.some((col) => !required.includes(col));

      if (!hasRequired || hasExtra) {
        toast.error(
          'CSV must have exactly two columns: "question" and "answer"',
        );
        event.target.value = "";
        return;
      }

      setUploadedFile(file);
      if (!datasetName) {
        setDatasetName(file.name.replace(/\.csv$/i, ""));
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read CSV file");
      event.target.value = "";
    };
    reader.readAsText(file);
  };

  const handleCreateDataset = async () => {
    if (!uploadedFile) {
      toast.error("Please select a CSV file");
      return;
    }
    if (!datasetName.trim()) {
      toast.error("Please enter a dataset name");
      return;
    }
    if (!activeKey?.key) {
      toast.error("No API key selected. Please select one in the Keystore.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      formData.append("dataset_name", datasetName.trim());
      if (datasetDescription.trim()) {
        formData.append("description", datasetDescription.trim());
      }
      if (duplicationFactor && parseInt(duplicationFactor) > 1) {
        formData.append("duplication_factor", duplicationFactor);
      }

      const data = await apiFetch<{ dataset_id?: number }>(
        "/api/evaluations/datasets",
        activeKey.key,
        { method: "POST", body: formData },
      );
      await loadStoredDatasets();

      if (data.dataset_id) {
        setSelectedDatasetId(data.dataset_id.toString());
      }

      setUploadedFile(null);
      setDatasetName("");
      setDatasetDescription("");
      setDuplicationFactor("1");

      toast.success("Dataset created successfully!");
    } catch (error) {
      toast.error(
        `Failed to create dataset: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunEvaluation = async () => {
    if (!activeKey?.key) {
      toast.error("Please select an API key first");
      return;
    }
    if (!selectedDatasetId) {
      toast.error("Please select a dataset first");
      return;
    }
    if (!experimentName.trim()) {
      toast.error("Please enter an evaluation name");
      return;
    }
    if (!selectedConfigId || !selectedConfigVersion) {
      toast.error("Please select a configuration before running evaluation");
      return;
    }

    setIsEvaluating(true);
    try {
      const payload = {
        dataset_id: parseInt(selectedDatasetId),
        experiment_name: experimentName.trim(),
        config_id: selectedConfigId,
        config_version: selectedConfigVersion,
      };

      await apiFetch("/api/evaluations", activeKey.key, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setIsEvaluating(false);
      toast.success(`Evaluation created!`);
      return true;
    } catch (error: unknown) {
      toast.error(
        `Failed to run evaluation: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setIsEvaluating(false);
      return false;
    }
  };

  return (
    <div
      className="w-full h-screen flex flex-col"
      style={{ backgroundColor: colors.bg.secondary }}
    >
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader
            title="Text Evaluation"
            subtitle="Compare model response quality on your datasets across different configs"
          />

          {/* Tab Navigation */}
          <TabNavigation
            tabs={[
              { id: "datasets", label: "Datasets" },
              { id: "evaluations", label: "Evaluations" },
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as Tab)}
          />

          {/* Tab Content */}
          {!mounted || !activeKey ? (
            <div
              className="flex-1 flex items-center justify-center"
              style={{ backgroundColor: colors.bg.secondary }}
            >
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: colors.border }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                <p
                  className="text-sm font-medium mb-1"
                  style={{ color: colors.text.primary }}
                >
                  API key required
                </p>
                <p
                  className="text-xs mb-4"
                  style={{ color: colors.text.secondary }}
                >
                  Add an API key in the Keystore to start creating datasets and
                  running evaluations
                </p>
                <a
                  href="/keystore"
                  className="inline-block px-4 py-2 rounded-md text-sm font-medium"
                  style={{
                    backgroundColor: colors.accent.primary,
                    color: "#ffffff",
                  }}
                >
                  Go to Keystore
                </a>
              </div>
            </div>
          ) : activeTab === "datasets" ? (
            <DatasetsTab
              leftPanelWidth={leftPanelWidth}
              datasetName={datasetName}
              setDatasetName={setDatasetName}
              datasetDescription={datasetDescription}
              setDatasetDescription={setDatasetDescription}
              duplicationFactor={duplicationFactor}
              setDuplicationFactor={setDuplicationFactor}
              uploadedFile={uploadedFile}
              onFileSelect={handleFileSelect}
              onRemoveFile={() => setUploadedFile(null)}
              isUploading={isUploading}
              handleCreateDataset={handleCreateDataset}
              resetForm={() => {
                setDatasetName("");
                setDatasetDescription("");
                setDuplicationFactor("1");
                setUploadedFile(null);
              }}
              storedDatasets={storedDatasets}
              isDatasetsLoading={isDatasetsLoading}
              activeKey={activeKey}
              loadStoredDatasets={loadStoredDatasets}
              toast={toast}
            />
          ) : (
            <EvaluationsTab
              leftPanelWidth={leftPanelWidth}
              activeKey={activeKey}
              storedDatasets={storedDatasets}
              selectedDatasetId={selectedDatasetId}
              setSelectedDatasetId={setSelectedDatasetId}
              selectedConfigId={selectedConfigId}
              selectedConfigVersion={selectedConfigVersion}
              onConfigSelect={(configId, configVersion) => {
                setSelectedConfigId(configId);
                setSelectedConfigVersion(configVersion);
              }}
              experimentName={experimentName}
              setExperimentName={setExperimentName}
              isEvaluating={isEvaluating}
              handleRunEvaluation={handleRunEvaluation}
              setActiveTab={setActiveTab}
            />
          )}
        </div>
      </div>
    </div>
  );
}
// Wrapper component with Suspense
export default function SimplifiedEval() {
  return (
    <Suspense fallback={<Loader size="lg" message="Loading..." fullScreen />}>
      <SimplifiedEvalContent />
    </Suspense>
  );
}
