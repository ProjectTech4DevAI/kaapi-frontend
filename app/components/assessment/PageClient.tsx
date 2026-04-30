"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";
import Sidebar from "@/app/components/Sidebar";
import { useToast } from "@/app/components/Toast";
import { apiFetch } from "@/app/lib/apiClient";
import { FeatureFlag } from "@/app/lib/constants/featureFlags";
import { STORAGE_KEY } from "@/app/lib/constants/keystore";
import { removeFeatureFromClient } from "@/app/lib/featureState";
import { useAssessmentDatasetStore } from "@/app/lib/store/assessment";
import type {
  AssessmentFormState,
  ConfigSelection,
  SchemaProperty,
} from "@/app/lib/types/assessment";
import type { APIKey } from "@/app/lib/types/credentials";
import ApiKeyRequired from "./ApiKeyRequired";
import ConfigPanel from "./ConfigPanel";
import PageHeader from "./PageHeader";
import TabNavigation from "./TabNavigation";
import DatasetStep from "./DatasetStep";
import EvaluationsTab from "./EvaluationsTab";

type TabId = "datasets" | "config" | "results";
type IndicatorState = "none" | "processing";
type DatasetSummary = { dataset_id: number; dataset_name?: string };

function schemaToJsonSchema(properties: SchemaProperty[]): object | null {
  if (properties.length === 0) return null;

  const props: Record<string, object> = {};
  const required: string[] = [];

  properties.forEach((property) => {
    if (!property.name.trim()) return;

    let definition: object;
    if (property.type === "object") {
      definition = schemaToJsonSchema(property.children) || { type: "object" };
    } else if (property.type === "enum") {
      definition = {
        type: "string",
        enum: property.enumValues.filter((value) => value.trim()),
      };
    } else {
      definition = { type: property.type };
    }

    if (property.isArray) {
      definition = { type: "array", items: definition };
    }

    props[property.name] = definition;
    if (property.isRequired) {
      required.push(property.name);
    }
  });

  if (Object.keys(props).length === 0) return null;

  return {
    type: "object",
    properties: props,
    ...(required.length > 0 ? { required } : {}),
  };
}

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "datasets", label: "Datasets" },
  { id: "config", label: "Config" },
  { id: "results", label: "Result" },
];

function handleForbiddenError(
  error: unknown,
  onForbidden?: () => void,
): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  const isForbidden =
    /request failed:\s*403/i.test(error.message) ||
    message.includes("forbidden") ||
    message.includes("not enabled") ||
    message.includes("permission denied");

  if (!isForbidden) return false;
  onForbidden?.();
  return true;
}

declare global {
  interface Window {
    __assessmentForbiddenNavLock?: boolean;
  }
}

function PageContent() {
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
  const [experimentName, setExperimentName] = useState("");
  const featureRedirectingRef = useRef(false);
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
    if (!stored) return;

    try {
      const keys = JSON.parse(stored);
      setApiKeys(keys);
      if (keys.length > 0) {
        setSelectedKeyId(keys[0].id);
      }
    } catch (error) {
      console.error("Failed to load API keys:", error);
    }
  }, []);

  const selectedKey = apiKeys.find((key) => key.id === selectedKeyId);

  const handleForbidden = useCallback(
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

  const handleForbiddenWithNotify = useCallback(() => {
    handleForbidden({ notify: true });
  }, [handleForbidden]);

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
        const selectedDataset = datasets.find(
          (dataset) => dataset.dataset_id.toString() === datasetId,
        );
        if (!cancelled && selectedDataset?.dataset_name) {
          setDatasetName(selectedDataset.dataset_name);
        }
      } catch (error) {
        if (handleForbiddenError(error, handleForbiddenWithNotify)) return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    datasetId,
    datasetName,
    handleForbiddenWithNotify,
    selectedKey?.key,
    setDatasetName,
  ]);

  useEffect(() => {
    if (!selectedKey?.key) return;

    let cancelled = false;

    (async () => {
      try {
        if (cancelled) return;
        await apiFetch("/api/assessment/evaluations?limit=1", selectedKey.key);
      } catch (error) {
        if (handleForbiddenError(error, handleForbiddenWithNotify)) return;
        console.error("Assessment feature check failed:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [handleForbiddenWithNotify, selectedKey?.key]);

  const markConfigCompleted = useCallback((step: number) => {
    setCompletedConfigSteps((prev) => new Set([...prev, step]));
  }, []);

  const handleConfigNext = useCallback(
    (fromStep: number) => {
      markConfigCompleted(fromStep);
      setConfigStep(fromStep + 1);
    },
    [markConfigCompleted],
  );

  const handleColumnsLoaded = useCallback(
    (loadedColumns: string[], firstRow: Record<string, string> = {}) => {
      const currentId = useAssessmentDatasetStore.getState().datasetId;
      setDataset(currentId, loadedColumns, firstRow);
      setPromptTemplate("");
    },
    [setDataset],
  );

  const outputSchemaJson = useMemo(
    () => schemaToJsonSchema(outputSchema),
    [outputSchema],
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
      await apiFetch("/api/assessment/evaluations", selectedKey.key, {
        method: "POST",
        body: JSON.stringify({
          experiment_name: experimentName.trim(),
          dataset_id: parseInt(datasetId, 10),
          prompt_template: promptTemplate || null,
          text_columns: columnMapping.textColumns,
          attachments: columnMapping.attachments.map(
            ({ column, type, format }) => ({ column, type, format }),
          ),
          output_schema: outputSchemaJson,
          configs: configs.map(({ config_id, config_version }) => ({
            config_id,
            config_version,
          })),
        }),
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
      if (handleForbiddenError(error, handleForbiddenWithNotify)) return;
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
    handleForbiddenWithNotify,
    outputSchemaJson,
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
          <PageHeader
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {apiKeys.length === 0 ? (
            <ApiKeyRequired />
          ) : (
            <>
              <TabNavigation
                activeTab={activeTab}
                evalIndicator={evalIndicator}
                tabs={[...TABS]}
                onTabSwitch={setActiveTab}
              />

              {activeTab === "datasets" && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <DatasetStep
                    apiKey={selectedKey?.key || ""}
                    onForbidden={handleForbiddenWithNotify}
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
                <ConfigPanel
                  apiKey={selectedKey?.key || ""}
                  canSubmitAssessment={canSubmitAssessment}
                  columns={columns}
                  columnMapping={columnMapping}
                  completedSteps={effectiveCompletedConfigSteps}
                  configStep={configStep}
                  configs={configs}
                  experimentName={experimentName}
                  formState={formState}
                  hasDataset={hasDataset}
                  isSubmitting={isSubmitting}
                  outputSchema={outputSchema}
                  outputSchemaJson={outputSchemaJson}
                  promptTemplate={promptTemplate}
                  sampleRow={sampleRow}
                  setActiveTabToDatasets={() => setActiveTab("datasets")}
                  setColumnMapping={setColumnMapping}
                  setConfigStep={setConfigStep}
                  setConfigs={setConfigs}
                  setExperimentName={setExperimentName}
                  setOutputSchema={setOutputSchema}
                  setPromptTemplate={setPromptTemplate}
                  submitBlockerMessage={submitBlockerMessage}
                  onSubmit={handleSubmit}
                  onStepComplete={handleConfigNext}
                />
              </div>

              {activeTab === "results" && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <EvaluationsTab
                    apiKey={selectedKey?.key || ""}
                    onForbidden={handleForbiddenWithNotify}
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

export default function PageClient() {
  return (
    <Suspense fallback={<Loader size="lg" message="Loading..." fullScreen />}>
      <PageContent />
    </Suspense>
  );
}
