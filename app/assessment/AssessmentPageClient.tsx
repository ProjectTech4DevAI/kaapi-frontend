"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/app/lib/colors";
import { STORAGE_KEY } from "@/app/lib/constants/keystore";
import { FeatureFlag } from "@/app/lib/constants/featureFlags";
import { removeFeatureFromClient } from "@/app/lib/featureState";
import { APIKey } from "@/app/lib/types/credentials";
import Sidebar from "@/app/components/Sidebar";
import Loader from "@/app/components/Loader";
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
    columns,
    sampleRow,
    columnMapping,
    setDatasetId,
    setDataset,
    setColumnMapping,
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

  const redirectIfFeatureDisabled = useCallback(
    async (
      response: Response,
      options?: { notify?: boolean },
    ): Promise<boolean> => {
      if (response.status !== 403) return false;

      const errorData = await response
        .clone()
        .json()
        .catch(() => ({}));
      const message = String(
        errorData?.error ?? errorData?.message ?? errorData?.detail ?? "",
      ).toLowerCase();

      if (
        message.includes("feature") &&
        message.includes("assessment") &&
        message.includes("not enabled")
      ) {
        if (!featureRedirectingRef.current) {
          featureRedirectingRef.current = true;
          if (options?.notify) {
            toast.error(
              "Assessment feature is disabled for this organization/project.",
            );
          }
          removeFeatureFromClient(FeatureFlag.ASSESSMENT);
          // Trigger middleware redirect by navigating to the gated route.
          window.setTimeout(
            () => {
              router.replace("/assessment");
            },
            options?.notify ? 300 : 0,
          );
        }
        return true;
      }

      return false;
    },
    [router, toast],
  );

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);
      try {
        const input = args[0];
        const requestUrl =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (requestUrl.includes("/api/assessment/")) {
          await redirectIfFeatureDisabled(response);
        }
      } catch {
        // silently ignore
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [redirectIfFeatureDisabled]);

  useEffect(() => {
    if (!selectedKey?.key) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/assessment/evaluations?limit=1", {
          headers: { "X-API-KEY": selectedKey.key },
        });
        if (cancelled) return;
        await redirectIfFeatureDisabled(response, { notify: true });
      } catch {
        // silently ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [redirectIfFeatureDisabled, selectedKey?.key]);

  const pollEvalStatus = useCallback(async () => {
    if (!selectedKey) return;
    try {
      const response = await fetch("/api/assessment/evaluations?limit=10", {
        headers: { "X-API-KEY": selectedKey.key },
      });
      if (await redirectIfFeatureDisabled(response)) return;
      if (!response.ok) return;
      const data = await response.json();
      const runs = Array.isArray(data) ? data : data.data || [];

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
    } catch {
      // silently fail
    }
  }, [redirectIfFeatureDisabled, selectedKey]);

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

  const handleSubmit = async () => {
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

      const response = await fetch("/api/assessment/evaluations", {
        method: "POST",
        headers: {
          "X-API-KEY": selectedKey.key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (await redirectIfFeatureDisabled(response)) return;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            `Failed with status ${response.status}`,
        );
      }

      toast.success("Assessment evaluation submitted!");
      setConfigStep(1);
      setCompletedConfigSteps(new Set());
      setExperimentName("");
      setDataset("", [], {});
      setColumnMapping({
        textColumns: [],
        attachments: [],
        groundTruthColumns: [],
      });
      setPromptTemplate("");
      setOutputSchema([]);
      setConfigs([]);
      dismissedRef.current = false;
      setActiveTab("results");
      pollEvalStatus();
    } catch (error) {
      toast.error(
        `Failed to submit: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formState: AssessmentFormState = {
    experimentName,
    datasetId,
    columns,
    columnMapping,
    promptTemplate,
    outputSchema,
    configs,
  };

  const hasDataset = !!datasetId && columns.length > 0;

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
              className="cursor-pointer p-1.5 rounded-md"
              style={{ color: colors.text.secondary }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
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
                className="flex-shrink-0 border-b flex"
                style={{
                  backgroundColor: colors.bg.primary,
                  borderColor: colors.border,
                }}
              >
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

              {activeTab === "datasets" && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <DatasetStep
                    apiKey={selectedKey?.key || ""}
                    datasetId={datasetId}
                    setDatasetId={setDatasetId}
                    onColumnsLoaded={handleColumnsLoaded}
                    onNext={() => {
                      setActiveTab("config");
                      setConfigStep(1);
                    }}
                  />
                </div>
              )}

              {activeTab === "config" && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  {!hasDataset ? (
                    <div className="flex-1 flex items-center justify-center">
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
                            d="M4 7v10c0 2 3.6 3 8 3s8-1 8-3V7M4 7c0 2 3.6 3 8 3s8-1 8-3M4 7c0-2 3.6-3 8-3s8 1 8 3"
                          />
                        </svg>
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
                        completedSteps={completedConfigSteps}
                      />
                      <div className="flex-1 overflow-auto px-6 pt-6">
                        {configStep === 1 && (
                          <ColumnMapperStep
                            columns={columns}
                            columnMapping={columnMapping}
                            setColumnMapping={setColumnMapping}
                            onNext={() => handleConfigNext(1)}
                            onBack={() => setActiveTab("datasets")}
                          />
                        )}
                        {configStep === 2 && (
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
                        )}
                        {configStep === 3 && (
                          <ReviewStep
                            formState={formState}
                            experimentName={experimentName}
                            setExperimentName={setExperimentName}
                            isSubmitting={isSubmitting}
                            onSubmit={handleSubmit}
                            onBack={() => setConfigStep(2)}
                            onEditStep={setConfigStep}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "results" && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <EvaluationsTab
                    apiKey={selectedKey?.key || ""}
                    refreshToken={assessmentRefreshToken}
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
