"use client";

import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/app/components/Loader";
import { useToast } from "@/app/components/Toast";
import { apiFetch } from "@/app/lib/apiClient";
import { handleForbiddenError } from "@/app/lib/assessment/access";
import { FeatureFlag } from "@/app/lib/constants";
import { removeFeatureFromClient } from "@/app/lib/featureState";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useAssessmentDatasetStore } from "@/app/lib/store/assessment";
import type {
  AssessmentFormState,
  AssessmentTab,
  AssessmentTabId,
  ConfigSelection,
  SchemaProperty,
} from "@/app/lib/types/assessment";
import PageLayout from "@/app/components/assessment/PageLayout";

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

const PAGE_TABS: ReadonlyArray<AssessmentTab> = [
  { id: "datasets", label: "Datasets" },
  { id: "config", label: "Config" },
  { id: "results", label: "Result" },
];

declare global {
  interface Window {
    __assessmentForbiddenNavLock?: boolean;
  }
}

function PageContent() {
  const router = useRouter();
  const toast = useToast();
  const { activeKey } = useAuth();
  const [activeTab, setActiveTab] = useState<AssessmentTabId>("datasets");
  const [configStep, setConfigStep] = useState(1);
  const [completedConfigSteps, setCompletedConfigSteps] = useState<Set<number>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const [systemInstruction, setSystemInstruction] = useState("");
  const [outputSchema, setOutputSchema] = useState<SchemaProperty[]>([]);
  const [configs, setConfigs] = useState<ConfigSelection[]>([]);

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
      await apiFetch("/api/assessment/runs", activeKey?.key ?? "", {
        method: "POST",
        body: JSON.stringify({
          experiment_name: experimentName.trim(),
          dataset_id: parseInt(datasetId, 10),
          prompt_template: promptTemplate || null,
          system_instruction: systemInstruction.trim() || null,
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

      toast.success("Assessment submitted!");
      setConfigStep(1);
      setCompletedConfigSteps(new Set());
      setExperimentName("");
      clearDataset();
      setSystemInstruction("");
      setPromptTemplate("");
      setOutputSchema([]);
      setConfigs([]);
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
    outputSchema,
    outputSchemaJson,
    promptTemplate,
    activeKey,
    systemInstruction,
    toast,
  ]);

  const formState: AssessmentFormState = {
    experimentName,
    datasetId,
    datasetName,
    columns,
    sampleRow,
    columnMapping,
    systemInstruction,
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
    !!datasetId &&
    hasMapperSelection &&
    hasPromptTemplate &&
    hasConfiguredResponseFormat &&
    configs.length > 0 &&
    experimentName.trim().length > 0 &&
    !isSubmitting;
  const submitBlockerMessage = !datasetId
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
    <PageLayout
      activeTab={activeTab}
      tabs={[...PAGE_TABS]}
      onTabSwitch={setActiveTab}
      datasetsTabProps={{
        onForbidden: handleForbiddenWithNotify,
        datasetId,
        setDatasetId,
        setSelectedDatasetName: setDatasetName,
        onColumnsLoaded: handleColumnsLoaded,
        onNext: () => {
          setActiveTab("config");
          setConfigStep(1);
        },
      }}
      configPanelProps={{
        canSubmitAssessment,
        columns,
        columnMapping,
        completedSteps: effectiveCompletedConfigSteps,
        configStep,
        configs,
        experimentName,
        formState,
        hasDataset,
        isSubmitting,
        outputSchema,
        outputSchemaJson,
        systemInstruction,
        promptTemplate,
        sampleRow,
        setActiveTabToDatasets: () => setActiveTab("datasets"),
        setColumnMapping,
        setConfigStep,
        setConfigs,
        setExperimentName,
        setOutputSchema,
        setSystemInstruction,
        setPromptTemplate,
        submitBlockerMessage,
        onSubmit: handleSubmit,
        onStepComplete: handleConfigNext,
      }}
      evaluationsTabProps={{
        onForbidden: handleForbiddenWithNotify,
      }}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loader size="lg" message="Loading..." fullScreen />}>
      <PageContent />
    </Suspense>
  );
}
