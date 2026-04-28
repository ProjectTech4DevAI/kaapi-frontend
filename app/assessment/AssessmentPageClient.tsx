"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/app/lib/colors";
import { apiFetch } from "@/app/lib/apiClient";
import { STORAGE_KEY } from "@/app/lib/constants/keystore";
import { FeatureFlag } from "@/app/lib/constants/featureFlags";
import { removeFeatureFromClient } from "@/app/lib/featureState";
import { APIKey } from "@/app/lib/types/credentials";
import Sidebar from "@/app/components/Sidebar";
import Loader from "@/app/components/Loader";
import { MenuIcon, KeyIcon, DatabaseIcon } from "@/app/components/icons";
import { useToast } from "@/app/components/Toast";
import Stepper, { Step } from "./components/Stepper";
import DatasetStep from "./components/DatasetStep";
import ColumnMapperStep from "./components/ColumnMapperStep";
import PromptAndConfigStep from "./components/PromptAndConfigStep";
import ReviewStep from "./components/ReviewStep";
import EvaluationsTab from "./components/EvaluationsTab";
import { useAssessmentEvents } from "./useAssessmentEvents";
import { ConfigSelection, SchemaProperty, AssessmentFormState } from "./types";
import { useAssessmentDatasetStore } from "./store";
import { schemaToJsonSchema } from "./schemaUtils";
import { handleForbiddenApiError } from "./errorUtils";

type TabId = "datasets" | "config" | "results";

const TABS: { id: TabId; label: string }[] = [
  { id: "datasets", label: "Datasets" },
  { id: "config", label: "Config" },
  { id: "results", label: "Result" },
];

const CONFIG_STEPS: Step[] = [
  { id: 1, label: "Mapper" },
  { id: 2, label: "Prompt & Config" },
  { id: 3, label: "Review" },
];

declare global {
  interface Window {
    __assessmentForbiddenNavLock?: boolean;
  }
}

function ShimmerDot({ color }: { color: string }) {
  return (
    <span className="relative ml-1.5 inline-flex h-1.5 w-1.5">
      <span
        className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

type IndicatorState = "none" | "processing" | "failed" | "success";
type DatasetSummary = { dataset_id: number; dataset_name?: string };
type EvaluationStatusRun = { status: string; updated_at: string };

function AssessmentContent() {
  const router = useRouter();
  const toast = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("datasets");
  const [configStep, setConfigStep] = useState(1);
  const [completedConfigSteps, setCompletedConfigSteps] = useState<Set<number>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState("");
  const [evalIndicator, setEvalIndicator] = useState<IndicatorState>("none");
  const dismissedRef = useRef(false);
  const featureRedirectingRef = useRef(false);
  const [assessmentRefreshToken, setAssessmentRefreshToken] = useState(0);
  const [experimentName, setExperimentName] = useState("");
  const {
    datasetId,
    datasetName,
    columns,
    sampleRow,
    columnMapping,
    setDatasetId,
    setDatasetName,
    setDataset,
    setColumnMapping,
    clearDataset,
  } = useAssessmentDatasetStore();
  const [promptTemplate, setPromptTemplate] = useState("");
  const [outputSchema, setOutputSchema] = useState<SchemaProperty[]>([]);
  const [configs, setConfigs] = useState<ConfigSelection[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const keys = JSON.parse(stored);
        setApiKeys(keys);
        if (keys.length > 0) setSelectedKeyId(keys[0].id);
      } catch (e) {
        console.error("Failed to load API keys:", e);
      }
    }
  }, []);

  const selectedKey = apiKeys.find((k) => k.id === selectedKeyId);

  const handleAssessmentForbidden = useCallback(
    (options?: { notify?: boolean }) => {
      if (
        typeof window !== "undefined" &&
        window.__assessmentForbiddenNavLock
      ) {
        return;
      }
      if (featureRedirectingRef.current) {
        return;
      }

      if (typeof window !== "undefined") {
        window.__assessmentForbiddenNavLock = true;
      }
      featureRedirectingRef.current = true;

      if (options?.notify) {
        toast.error(
          "Assessment feature is disabled for this organization/project.",
        );
      }
      removeFeatureFromClient(FeatureFlag.ASSESSMENT);
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/evaluations"
      ) {
        router.replace("/");
      }
    },
    [router, toast],
  );

  const handleAssessmentForbiddenWithNotify = useCallback(() => {
    handleAssessmentForbidden({ notify: true });
  }, [handleAssessmentForbidden]);

  // Backfill dataset name when old persisted state has only datasetId.
  useEffect(() => {
    if (!selectedKey?.key || !datasetId || datasetName) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await apiFetch<
          { data?: DatasetSummary[] } | DatasetSummary[]
        >("/api/assessment/datasets", selectedKey.key);
        if (cancelled) return;

        const datasets: DatasetSummary[] = Array.isArray(data)
          ? data
          : data.data || [];
        const selected = datasets.find(
          (dataset: { dataset_id: number; dataset_name?: string }) =>
            dataset.dataset_id.toString() === datasetId,
        );
        if (!cancelled && selected?.dataset_name) {
          setDatasetName(selected.dataset_name);
        }
      } catch (error) {
        if (handleForbiddenApiError(error, handleAssessmentForbiddenWithNotify))
          return;
        // ignore non-forbidden backfill failures; review will fallback gracefully
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    datasetId,
    datasetName,
    selectedKey?.key,
    setDatasetName,
    handleAssessmentForbiddenWithNotify,
  ]);

  useEffect(() => {
    if (!selectedKey?.key) return;

    let cancelled = false;

    (async () => {
      try {
        if (cancelled) return;
        await apiFetch("/api/assessment/evaluations?limit=1", selectedKey.key);
      } catch (error) {
        if (handleForbiddenApiError(error, handleAssessmentForbiddenWithNotify))
          return;
        console.error("Assessment feature check failed:", error);
        // silently ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [handleAssessmentForbiddenWithNotify, selectedKey?.key]);

  const pollEvalStatus = useCallback(async () => {
    if (!selectedKey) return;
    try {
      const data = await apiFetch<
        { data?: EvaluationStatusRun[] } | EvaluationStatusRun[]
      >("/api/assessment/evaluations?limit=10", selectedKey.key);
      const runs: EvaluationStatusRun[] = Array.isArray(data)
        ? data
        : data.data || [];

      const hasProcessing = runs.some(
        (r: { status: string }) =>
          r.status === "processing" || r.status === "pending",
      );

      if (hasProcessing) {
        setEvalIndicator("processing");
        dismissedRef.current = false;
        return;
      }

      if (dismissedRef.current) {
        setEvalIndicator("none");
        return;
      }

      if (runs.length > 0) {
        const recent = runs[0];
        const updatedAt = new Date(recent.updated_at).getTime();
        const fiveMinAgo = Date.now() - 5 * 60 * 1000;

        if (updatedAt > fiveMinAgo) {
          if (
            recent.status === "failed" ||
            recent.status === "completed_with_errors"
          ) {
            setEvalIndicator("failed");
            return;
          }
          if (recent.status === "completed") {
            setEvalIndicator("success");
            return;
          }
        }
      }

      setEvalIndicator("none");
    } catch (error) {
      if (handleForbiddenApiError(error, handleAssessmentForbiddenWithNotify))
        return;
      // silently fail
    }
  }, [handleAssessmentForbiddenWithNotify, selectedKey]);

  useEffect(() => {
    if (!selectedKey) return;
    pollEvalStatus();
  }, [pollEvalStatus, selectedKey]);

  useAssessmentEvents(
    selectedKey?.key || "",
    () => {
      setAssessmentRefreshToken((prev) => prev + 1);
      void pollEvalStatus();
    },
    activeTab === "results",
    handleAssessmentForbiddenWithNotify,
  );

  const handleTabSwitch = (tab: TabId) => {
    if (
      tab === "results" &&
      (evalIndicator === "failed" || evalIndicator === "success")
    ) {
      dismissedRef.current = true;
      setEvalIndicator("none");
    }
    setActiveTab(tab);
  };

  const hasDraftData =
    !!datasetId ||
    columnMapping.textColumns.length > 0 ||
    columnMapping.attachments.length > 0 ||
    columnMapping.groundTruthColumns.length > 0 ||
    !!promptTemplate.trim() ||
    configs.length > 0 ||
    outputSchema.length > 0 ||
    !!experimentName.trim();

  const resetDraftState = () => {
    dismissedRef.current = false;
    setEvalIndicator("none");
    clearDataset();
    setPromptTemplate("");
    setOutputSchema([]);
    setConfigs([]);
    setExperimentName("");
    setConfigStep(1);
    setCompletedConfigSteps(new Set());
    setActiveTab("datasets");
  };

  const markConfigCompleted = (step: number) => {
    setCompletedConfigSteps((prev) => new Set([...prev, step]));
  };

  const handleConfigNext = (fromStep: number) => {
    markConfigCompleted(fromStep);
    setConfigStep(fromStep + 1);
  };

  const handleColumnsLoaded = useCallback(
    (cols: string[], firstRow: Record<string, string> = {}) => {
      const currentId = useAssessmentDatasetStore.getState().datasetId;
      setDataset(currentId, cols, firstRow);
      setPromptTemplate("");
    },
    [setDataset],
  );

  const handleSubmit = useCallback(async () => {
    if (!selectedKey) {
      toast.error("No API key selected");
      return;
    }
    if (!experimentName.trim()) {
      toast.error("Experiment name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        experiment_name: experimentName.trim(),
        dataset_id: parseInt(datasetId, 10),
        prompt_template: promptTemplate || null,
        text_columns: columnMapping.textColumns,
        attachments: columnMapping.attachments.map(
          ({ column, type, format }) => ({ column, type, format }),
        ),
        output_schema: schemaToJsonSchema(outputSchema) || null,
        configs: configs.map(({ config_id, config_version }) => ({
          config_id,
          config_version,
        })),
      };

      await apiFetch("/api/assessment/evaluations", selectedKey.key, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Assessment evaluation submitted!");
      setConfigStep(1);
      setCompletedConfigSteps(new Set());
      setExperimentName("");
      clearDataset();
      setPromptTemplate("");
      setOutputSchema([]);
      setConfigs([]);
      dismissedRef.current = false;
      setActiveTab("results");
      pollEvalStatus();
    } catch (error) {
      if (handleForbiddenApiError(error, handleAssessmentForbiddenWithNotify))
        return;
      toast.error(
        `Failed to submit: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    clearDataset,
    columnMapping,
    configs,
    datasetId,
    experimentName,
    handleAssessmentForbiddenWithNotify,
    outputSchema,
    pollEvalStatus,
    promptTemplate,
    selectedKey,
    toast,
  ]);

  const formState: AssessmentFormState = {
    experimentName,
    datasetId,
    datasetName,
    columns,
    columnMapping,
    promptTemplate,
    outputSchema,
    configs,
  };

  const hasDataset = !!datasetId && columns.length > 0;
  const hasMapperSelection = columnMapping.textColumns.length > 0;
  const hasConfiguredResponseFormat = outputSchema.some((field) =>
    field.name.trim(),
  );
  const canReachReview = configs.length > 0 && hasConfiguredResponseFormat;
  const effectiveCompletedConfigSteps = useMemo(() => {
    const merged = new Set(completedConfigSteps);
    if (hasMapperSelection) merged.add(1);
    if (canReachReview) merged.add(2);
    return merged;
  }, [canReachReview, completedConfigSteps, hasMapperSelection]);

  const indicatorStyles: Record<
    IndicatorState,
    { dot: string; underline: string }
  > = {
    none: {
      dot: "transparent",
      underline: colors.text.primary,
    },
    processing: {
      dot: "#f59e0b",
      underline: "#f59e0b",
    },
    failed: {
      dot: colors.status.error,
      underline: colors.status.error,
    },
    success: {
      dot: colors.status.success,
      underline: colors.status.success,
    },
  };

  const indicatorColor: Record<IndicatorState, string> = {
    none: "transparent",
    processing: indicatorStyles.processing.dot,
    failed: indicatorStyles.failed.dot,
    success: indicatorStyles.success.dot,
  };

  return (
    <div
      className="w-full h-screen flex flex-col"
      style={{ backgroundColor: colors.bg.secondary }}
    >
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/assessment" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            className="border-b px-4 py-3 flex items-center gap-3 flex-shrink-0"
            style={{
              backgroundColor: colors.bg.primary,
              borderColor: colors.border,
            }}
          >
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label="Toggle sidebar"
              className="cursor-pointer p-1.5 rounded-md"
              style={{ color: colors.text.secondary }}
            >
              <MenuIcon
                className="w-5 h-5"
                style={{ color: colors.text.secondary }}
              />
            </button>
            <div>
              <h1
                className="text-base font-semibold"
                style={{ color: colors.text.primary, letterSpacing: "-0.01em" }}
              >
                Assessment
              </h1>
              <p className="text-xs" style={{ color: colors.text.secondary }}>
                Multi-modal batch evaluation with prompt templates, attachments,
                and config comparison
              </p>
            </div>
          </div>

          {apiKeys.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <span
                  className="block mx-auto mb-4"
                  style={{ color: colors.border }}
                >
                  <KeyIcon className="h-12 w-12" />
                </span>
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
                  Add an API key in the Keystore first
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
          ) : (
            <>
              <div
                className="flex-shrink-0 border-b flex items-center justify-between pr-4"
                style={{
                  backgroundColor: colors.bg.primary,
                  borderColor: colors.border,
                }}
              >
                <div className="flex">
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const showIndicator =
                      tab.id === "results" && evalIndicator !== "none";
                    const tabColor = isActive
                      ? colors.text.primary
                      : colors.text.secondary;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabSwitch(tab.id)}
                        className="cursor-pointer relative px-5 py-3 text-sm font-medium transition-colors flex items-center"
                        style={{ color: tabColor }}
                      >
                        {tab.label}
                        {showIndicator && (
                          <ShimmerDot color={indicatorColor[evalIndicator]} />
                        )}
                        {isActive && (
                          <div
                            className="absolute bottom-0 left-0 right-0 h-0.5"
                            style={{
                              backgroundColor: showIndicator
                                ? indicatorStyles[evalIndicator].underline
                                : colors.text.primary,
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={resetDraftState}
                  disabled={!hasDraftData}
                  className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: hasDraftData
                      ? colors.bg.primary
                      : colors.bg.secondary,
                    color: hasDraftData
                      ? colors.text.primary
                      : colors.text.secondary,
                    cursor: hasDraftData ? "pointer" : "not-allowed",
                  }}
                >
                  Start New
                </button>
              </div>

              {activeTab === "datasets" && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <DatasetStep
                    apiKey={selectedKey?.key || ""}
                    onForbidden={handleAssessmentForbiddenWithNotify}
                    datasetId={datasetId}
                    setDatasetId={setDatasetId}
                    setSelectedDatasetName={setDatasetName}
                    onColumnsLoaded={handleColumnsLoaded}
                    onNext={() => {
                      setActiveTab("config");
                      setConfigStep(1);
                    }}
                  />
                </div>
              )}

              <div
                className={`flex-1 overflow-hidden flex flex-col ${
                  activeTab === "config" ? "" : "hidden"
                }`}
              >
                {!hasDataset ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <DatabaseIcon
                        className="mx-auto h-12 w-12 mb-4"
                        style={{ color: colors.border }}
                      />
                      <p
                        className="text-sm font-medium mb-1"
                        style={{ color: colors.text.primary }}
                      >
                        No dataset selected
                      </p>
                      <p
                        className="text-xs mb-4"
                        style={{ color: colors.text.secondary }}
                      >
                        Select a dataset first from the Datasets tab
                      </p>
                      <button
                        onClick={() => setActiveTab("datasets")}
                        className="cursor-pointer px-4 py-2 rounded-md text-sm font-medium"
                        style={{
                          backgroundColor: colors.accent.primary,
                          color: "#ffffff",
                        }}
                      >
                        Go to Datasets
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Stepper
                      steps={CONFIG_STEPS}
                      currentStep={configStep}
                      onStepClick={setConfigStep}
                      completedSteps={effectiveCompletedConfigSteps}
                    />
                    <div className="flex-1 overflow-auto px-6 pt-6">
                      <div className={configStep === 1 ? "block" : "hidden"}>
                        <ColumnMapperStep
                          columns={columns}
                          columnMapping={columnMapping}
                          setColumnMapping={setColumnMapping}
                          onNext={() => handleConfigNext(1)}
                          onBack={() => setActiveTab("datasets")}
                        />
                      </div>
                      <div className={configStep === 2 ? "block" : "hidden"}>
                        <PromptAndConfigStep
                          textColumns={columnMapping.textColumns}
                          sampleRow={sampleRow}
                          promptTemplate={promptTemplate}
                          setPromptTemplate={setPromptTemplate}
                          configs={configs}
                          setConfigs={setConfigs}
                          outputSchema={outputSchema}
                          setOutputSchema={setOutputSchema}
                          onNext={() => handleConfigNext(2)}
                          onBack={() => setConfigStep(1)}
                        />
                      </div>
                      <div className={configStep === 3 ? "block" : "hidden"}>
                        <ReviewStep
                          formState={formState}
                          experimentName={experimentName}
                          setExperimentName={setExperimentName}
                          isSubmitting={isSubmitting}
                          onSubmit={handleSubmit}
                          onBack={() => setConfigStep(2)}
                          onEditStep={setConfigStep}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {activeTab === "results" && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <EvaluationsTab
                    apiKey={selectedKey?.key || ""}
                    refreshToken={assessmentRefreshToken}
                    onForbidden={handleAssessmentForbiddenWithNotify}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AssessmentPageClient() {
  return (
    <Suspense fallback={<Loader size="lg" message="Loading..." fullScreen />}>
      <AssessmentContent />
    </Suspense>
  );
}
