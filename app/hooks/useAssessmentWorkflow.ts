"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/app/hooks/useToast";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import {
  getAssessmentSubmitBlocker,
  getAssessmentSubmitError,
  handleForbiddenError,
  schemaToJsonSchema,
} from "@/app/lib/utils/assessment";
import { removeFeatureFromClient } from "@/app/lib/utils/features";
import { FeatureFlag } from "@/app/lib/constants";
import { PAGE_TABS } from "@/app/lib/assessment/constants";
import { useAssessmentDatasetStore } from "@/app/lib/store/assessment";
import type {
  AssessmentFormState,
  AssessmentTabId,
  ConfigSelection,
  PageLayoutProps,
  PrefilterConfig,
  PostProcessingConfig,
  SchemaProperty,
} from "@/app/lib/types/assessment";

export type UseAssessmentWorkflowResult = PageLayoutProps;

export function useAssessmentWorkflow(): UseAssessmentWorkflowResult {
  const router = useRouter();
  const { error: showToastError, success: showToastSuccess } = useToast();
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
  const [prefilterConfig, setPrefilterConfig] =
    useState<PrefilterConfig | null>(null);
  const [postProcessingConfig, setPostProcessingConfig] =
    useState<PostProcessingConfig | null>(null);

  const handleForbidden = useCallback(
    (options?: { notify?: boolean }) => {
      if (featureRedirectingRef.current) return;
      featureRedirectingRef.current = true;

      if (options?.notify) {
        showToastError(
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
    [router, showToastError],
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

  useEffect(() => {
    setPrefilterConfig(null);
  }, [datasetId]);

  const outputSchemaJson = useMemo(
    () => schemaToJsonSchema(outputSchema),
    [outputSchema],
  );

  const handleSubmit = useCallback(async () => {
    const validationError = getAssessmentSubmitError({
      datasetId,
      textColumnCount: columnMapping.textColumns.length,
      promptTemplate,
      hasResponseFormat: outputSchema.some((field) => field.name.trim()),
      configCount: configs.length,
      experimentName,
    });
    if (validationError) {
      showToastError(validationError);
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
            ({ column, type, format, type_column, type_value_map }) => ({
              column,
              type,
              format,
              ...(type_column ? { type_column, type_value_map } : {}),
            }),
          ),
          output_schema: outputSchemaJson,
          configs: configs.map(({ config_id, config_version }) => ({
            config_id,
            config_version,
          })),
          prefilter_config: prefilterConfig ?? null,
          post_processing_config: postProcessingConfig ?? null,
        }),
      });

      showToastSuccess("Assessment submitted!");
      setConfigStep(1);
      setCompletedConfigSteps(new Set());
      setExperimentName("");
      clearDataset();
      setSystemInstruction("");
      setPromptTemplate("");
      setOutputSchema([]);
      setConfigs([]);
      setPrefilterConfig(null);
      setPostProcessingConfig(null);
      setActiveTab("results");
    } catch (error) {
      if (handleForbiddenError(error, handleForbiddenWithNotify)) return;
      showToastError(
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
    prefilterConfig,
    outputSchema,
    outputSchemaJson,
    postProcessingConfig,
    promptTemplate,
    activeKey,
    systemInstruction,
    showToastError,
    showToastSuccess,
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
    prefilterConfig,
    postProcessingConfig,
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
  const submitBlockerMessage = getAssessmentSubmitBlocker({
    datasetId,
    hasMapperSelection,
    hasPromptTemplate,
    hasResponseFormat: hasConfiguredResponseFormat,
    configCount: configs.length,
    experimentName,
  });
  const effectiveCompletedConfigSteps = useMemo(() => {
    const merged = new Set(completedConfigSteps);
    if (hasMapperSelection) merged.add(1);
    if (hasMapperSelection) merged.add(2); // Prefilter is optional and always passable
    if (canReachReview) merged.add(3);
    if (canReachReview) merged.add(4); // Post Processing is optional and always passable
    return merged;
  }, [canReachReview, completedConfigSteps, hasMapperSelection]);

  return {
    activeTab,
    tabs: [...PAGE_TABS],
    onTabSwitch: setActiveTab,
    datasetsTabProps: {
      onForbidden: handleForbiddenWithNotify,
      datasetId,
      setDatasetId,
      setSelectedDatasetName: setDatasetName,
      onColumnsLoaded: handleColumnsLoaded,
      onNext: () => {
        setActiveTab("config");
        setConfigStep(1);
      },
    },
    configPanelProps: {
      canSubmitAssessment,
      columns,
      columnMapping,
      completedSteps: effectiveCompletedConfigSteps,
      configStep,
      configs,
      datasetId,
      experimentName,
      formState,
      hasDataset,
      isSubmitting,
      prefilterConfig,
      outputSchema,
      systemInstruction,
      promptTemplate,
      sampleRow,
      setActiveTabToDatasets: () => setActiveTab("datasets"),
      setColumnMapping,
      setConfigStep,
      setConfigs,
      setExperimentName,
      setPrefilterConfig,
      setOutputSchema,
      setSystemInstruction,
      setPromptTemplate,
      postProcessingConfig,
      setPostProcessingConfig,
      submitBlockerMessage,
      onSubmit: handleSubmit,
      onStepComplete: handleConfigNext,
    },
    evaluationsTabProps: {
      onForbidden: handleForbiddenWithNotify,
    },
  };
}
