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
import { apiFetch } from "@/app/lib/apiClient";
import { STORAGE_KEY } from "@/app/lib/constants/keystore";
import { FeatureFlag } from "@/app/lib/constants/featureFlags";
import { removeFeatureFromClient } from "@/app/lib/featureState";
import { APIKey } from "@/app/lib/types/credentials";
import Sidebar from "@/app/components/Sidebar";
import Loader from "@/app/components/Loader";
import {
  ColumnMapperStep,
  DatasetStep,
  EvaluationsTab,
  PromptAndConfigStep,
  ReviewStep,
  type Step,
  Stepper,
} from "@/app/components/assessment";
import { MenuIcon, KeyIcon, DatabaseIcon } from "@/app/components/icons";
import { useToast } from "@/app/components/Toast";
import { ConfigSelection, SchemaProperty, AssessmentFormState } from "./types";
import { useAssessmentDatasetStore } from "@/app/lib/store/assesment";
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

const INDICATOR_CLASSES: Record<
  IndicatorState,
  { dot: string; underline: string }
> = {
  none: {
    dot: "assessment-indicator-dot-none",
    underline: "assessment-indicator-underline-none",
  },
  processing: {
    dot: "assessment-indicator-dot-processing",
    underline: "assessment-indicator-underline-processing",
  },
};

declare global {
  interface Window {
    __assessmentForbiddenNavLock?: boolean;
  }
}

function ShimmerDot({ dotClassName }: { dotClassName: string }) {
  return (
    <span className="relative ml-1.5 inline-flex h-1.5 w-1.5">
      <span
        className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${dotClassName}`}
      />
      <span
        className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotClassName}`}
      />
    </span>
  );
}

type IndicatorState = "none" | "processing";
type DatasetSummary = { dataset_id: number; dataset_name?: string };

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
  const featureRedirectingRef = useRef(false);
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

  const handleTabSwitch = (tab: TabId) => {
    setActiveTab(tab);
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
    if (!datasetId) {
      toast.error("Dataset is required");
      return;
    }
    if (columnMapping.textColumns.length === 0) {
      toast.error("Map at least one text column");
      return;
    }
    if (!promptTemplate.trim()) {
      toast.error("Prompt is required");
      return;
    }
    if (!outputSchema.some((field) => field.name.trim())) {
      toast.error("Response format is required");
      return;
    }
    if (configs.length === 0) {
      toast.error("Select at least one configuration");
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
      setEvalIndicator("processing");
      setActiveTab("results");
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
  const hasPromptTemplate = promptTemplate.trim().length > 0;
  const hasConfiguredResponseFormat = outputSchema.some((field) =>
    field.name.trim(),
  );
  const canReachReview =
    hasPromptTemplate && configs.length > 0 && hasConfiguredResponseFormat;
  const canSubmitAssessment =
    !!selectedKey &&
    !!datasetId &&
    hasMapperSelection &&
    hasPromptTemplate &&
    hasConfiguredResponseFormat &&
    configs.length > 0 &&
    experimentName.trim().length > 0 &&
    !isSubmitting;
  const submitBlockerMessage = !selectedKey
    ? "Select an API key to submit"
    : !datasetId
      ? "Select a dataset to submit"
      : !hasMapperSelection
        ? "Map at least one text column to submit"
        : !hasPromptTemplate
          ? "Write a prompt to submit"
          : !hasConfiguredResponseFormat
            ? "Set response format to submit"
            : configs.length === 0
              ? "Select at least one configuration to submit"
              : !experimentName.trim()
                ? "Enter an experiment name to submit"
                : "";
  const effectiveCompletedConfigSteps = useMemo(() => {
    const merged = new Set(completedConfigSteps);
    if (hasMapperSelection) merged.add(1);
    if (canReachReview) merged.add(2);
    return merged;
  }, [canReachReview, completedConfigSteps, hasMapperSelection]);

  return (
    <div className="flex h-screen w-full flex-col bg-neutral-50">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/assessment" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label="Toggle sidebar"
              className="cursor-pointer rounded-md p-1.5 text-neutral-500"
            >
              <MenuIcon className="h-5 w-5 text-neutral-500" />
            </button>
            <div>
              <h1 className="text-base font-semibold tracking-[-0.01em] text-neutral-900">
                Assessment
              </h1>
              <p className="text-xs text-neutral-500">
                Multi-modal batch evaluation with prompt templates, attachments,
                and config comparison
              </p>
            </div>
          </div>

          {apiKeys.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <span className="mx-auto mb-4 block text-neutral-200">
                  <KeyIcon className="h-12 w-12" />
                </span>
                <p className="mb-1 text-sm font-medium text-neutral-900">
                  API key required
                </p>
                <p className="mb-4 text-xs text-neutral-500">
                  Add an API key in the Keystore first
                </p>
                <a
                  href="/keystore"
                  className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Go to Keystore
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center border-b border-neutral-200 bg-white pr-4">
                <div className="flex">
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const showIndicator =
                      tab.id === "results" && evalIndicator !== "none";

                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabSwitch(tab.id)}
                        className={`relative flex cursor-pointer items-center px-5 py-3 text-sm font-medium transition-colors ${
                          isActive ? "text-neutral-900" : "text-neutral-500"
                        }`}
                      >
                        {tab.label}
                        {showIndicator && (
                          <ShimmerDot
                            dotClassName={INDICATOR_CLASSES[evalIndicator].dot}
                          />
                        )}
                        {isActive && (
                          <div
                            className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                              showIndicator
                                ? INDICATOR_CLASSES[evalIndicator].underline
                                : "bg-neutral-900"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
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
                className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
                  activeTab === "config" ? "" : "hidden"
                }`}
              >
                {!hasDataset ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <DatabaseIcon className="mx-auto mb-4 h-12 w-12 text-neutral-200" />
                      <p className="mb-1 text-sm font-medium text-neutral-900">
                        No dataset selected
                      </p>
                      <p className="mb-4 text-xs text-neutral-500">
                        Select a dataset first from the Datasets tab
                      </p>
                      <button
                        onClick={() => setActiveTab("datasets")}
                        className="cursor-pointer rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
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
                    <div className="flex min-h-0 flex-1 flex-col overflow-auto px-6 pt-6">
                      <div
                        className={
                          configStep === 1
                            ? "flex min-h-0 h-full flex-1 flex-col"
                            : "hidden"
                        }
                      >
                        <ColumnMapperStep
                          columns={columns}
                          columnMapping={columnMapping}
                          setColumnMapping={setColumnMapping}
                          onNext={() => handleConfigNext(1)}
                          onBack={() => setActiveTab("datasets")}
                        />
                      </div>
                      <div
                        className={
                          configStep === 2
                            ? "flex min-h-0 h-full flex-1 flex-col"
                            : "hidden"
                        }
                      >
                        <PromptAndConfigStep
                          apiKey={selectedKey?.key || ""}
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
                      <div
                        className={
                          configStep === 3
                            ? "flex min-h-0 h-full flex-1 flex-col"
                            : "hidden"
                        }
                      >
                        <ReviewStep
                          formState={formState}
                          experimentName={experimentName}
                          setExperimentName={setExperimentName}
                          isSubmitting={isSubmitting}
                          canSubmit={canSubmitAssessment}
                          submitBlockerMessage={submitBlockerMessage}
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
                    onForbidden={handleAssessmentForbiddenWithNotify}
                    onStatusIndicatorChange={setEvalIndicator}
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
