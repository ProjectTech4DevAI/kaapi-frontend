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
} from "@/app/lib/utils/assessment";
import { removeFeatureFromClient } from "@/app/lib/utils/features";
import { FeatureFlag } from "@/app/lib/constants";
import {
  ASSESSMENT_CONFIG_STEPS,
  ASSESSMENT_TAB_ROUTES,
  PAGE_TABS,
} from "@/app/lib/assessment/constants";
import { useAssessmentDatasetStore } from "@/app/lib/store/assessment";
import { assessmentBlobToBuilderState } from "@/app/lib/utils/assessmentFetcher";
import { loadStoredSubmissionTemplate } from "@/app/lib/utils/assessmentTemplate";
import { buildExampleResponseFormat } from "@/app/lib/utils/outputSchema";
import {
  DEFAULT_ASSESSMENT_INSTRUCTIONS,
  DEFAULT_ASSESSMENT_SUBMISSION,
  DEFAULT_ATTACHMENT_FIELD,
  DEFAULT_TEXT_FIELDS,
} from "@/app/lib/assessment/placeholders";
import type {
  AssessmentRunConfigRef,
  AssessmentTabId,
  ColumnMapping,
  ConfigDraftSeed,
  ConfigSelection,
  PageLayoutProps,
  PrefilterConfig,
  PostProcessingConfig,
  SchemaProperty,
} from "@/app/lib/types/assessment";
import type {
  AssessmentColumnType,
  AssessmentConfigBlob,
} from "@/app/lib/types/configs";

const EMPTY_COLUMN_MAPPING: ColumnMapping = {
  textColumns: [],
  attachments: [],
  groundTruthColumns: [],
};

export type UseAssessmentWorkflowResult = PageLayoutProps;

export function useAssessmentWorkflow(
  initialTab: AssessmentTabId = "datasets",
): UseAssessmentWorkflowResult {
  const router = useRouter();
  const { error: showToastError, success: showToastSuccess } = useToast();
  const { activeKey } = useAuth();
  const [activeTab, setActiveTab] = useState<AssessmentTabId>(initialTab);

  // The route (sidebar sub-tab) is the source of truth; keep state in sync when
  // the page mounts/remounts on a different route.
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Switch tab AND navigate so the sidebar sub-item highlights.
  const goToTab = useCallback(
    (tab: AssessmentTabId) => {
      setActiveTab(tab);
      router.push(ASSESSMENT_TAB_ROUTES[tab]);
    },
    [router],
  );
  const [configStep, setConfigStep] = useState(1);
  const [completedConfigSteps, setCompletedConfigSteps] = useState<Set<number>>(
    new Set(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [experimentName, setExperimentName] = useState("");
  const featureRedirectingRef = useRef(false);
  const { datasetId, datasetName, setDatasetId, setDatasetName, clearDataset } =
    useAssessmentDatasetStore();
  // Config input_schema is authored directly (dataset-independent) via the
  // manual field editor, so the mapping starts empty and lives in the workflow.
  const [columnMapping, setColumnMapping] =
    useState<ColumnMapping>(EMPTY_COLUMN_MAPPING);
  const [promptTemplate, setPromptTemplate] = useState("");
  const [systemInstruction, setSystemInstruction] = useState("");
  const [outputSchema, setOutputSchema] = useState<SchemaProperty[]>([]);
  const [configs, setConfigs] = useState<ConfigSelection[]>([]);
  const [prefilterConfig, setPrefilterConfig] =
    useState<PrefilterConfig | null>(null);
  const [postProcessingConfig, setPostProcessingConfig] =
    useState<PostProcessingConfig | null>(null);
  // Seeds the Assessment step's provider/model draft + save mode when the
  // Configuration step starts fresh or loads an existing version.
  const [configSeed, setConfigSeed] = useState<ConfigDraftSeed | null>(null);
  const seedNonce = useRef(0);

  // A new config starts as a short, real, working example (teacher grading a
  // Social Science paper from an id/name/submission dataset) that the user
  // edits into their own use case.
  const startNewConfig = useCallback(() => {
    setColumnMapping({
      textColumns: [...DEFAULT_TEXT_FIELDS],
      attachments: [
        { column: DEFAULT_ATTACHMENT_FIELD, type: "pdf", format: "url" },
      ],
      groundTruthColumns: [],
    });
    setSystemInstruction(DEFAULT_ASSESSMENT_INSTRUCTIONS);
    setPromptTemplate(DEFAULT_ASSESSMENT_SUBMISSION);
    setOutputSchema(buildExampleResponseFormat());
    setPrefilterConfig(null);
    seedNonce.current += 1;
    setConfigSeed({
      blob: null,
      saveMode: "new",
      configId: "",
      configName: "",
      configVersion: 0,
      nonce: seedNonce.current,
    });
  }, []);

  const loadExistingConfig = useCallback(
    (
      blob: AssessmentConfigBlob,
      configId: string,
      configName: string,
      version: number,
    ) => {
      const state = assessmentBlobToBuilderState(blob);
      setColumnMapping(state.columnMapping);
      setSystemInstruction(state.systemInstruction);
      setOutputSchema(state.outputSchema);
      setPrefilterConfig(state.prefilterConfig);
      // Blob param when the backend persists it; otherwise the author's
      // localStorage mirror for this version.
      setPromptTemplate(
        state.submissionTemplate ||
          loadStoredSubmissionTemplate(configId, version),
      );
      seedNonce.current += 1;
      setConfigSeed({
        blob: state.draft,
        saveMode: "version",
        configId,
        configName,
        configVersion: version,
        nonce: seedNonce.current,
      });
    },
    [],
  );

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
      // Completing the final step (saving the config) stays on it so the user
      // can keep iterating with new versions.
      setConfigStep(Math.min(fromStep + 1, ASSESSMENT_CONFIG_STEPS.length));
    },
    [markConfigCompleted],
  );

  // input_binding is derived from the selected config's stored input_schema so a
  // saved config can run without re-authoring: text-typed keys become
  // text_columns, image/pdf keys become url attachments.
  const runInputSchema = configs[0]?.input_schema ?? {};

  const handleSubmit = useCallback(async () => {
    const inputSchemaEntries = Object.entries(runInputSchema);
    const validationError = getAssessmentSubmitError({
      datasetId,
      hasInputSchema: inputSchemaEntries.length > 0,
      configCount: configs.length,
      experimentName,
      hasPrompt: promptTemplate.trim().length > 0,
    });
    if (validationError) {
      showToastError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const runConfigs: AssessmentRunConfigRef[] = configs.map(
        ({ config_id, config_version }) => ({
          id: config_id,
          version: config_version,
        }),
      );
      const textColumns = inputSchemaEntries
        .filter(([, column]) => column.type === "text")
        .map(([name]) => name);
      const attachments = inputSchemaEntries
        .filter(([, column]) => column.type !== "text")
        .map(([name, column]) => ({
          column: name,
          type: column.type as Exclude<AssessmentColumnType, "text">,
          format: column.format ?? "url",
        }));
      await apiFetch("/api/assessment/runs", activeKey?.key ?? "", {
        method: "POST",
        body: JSON.stringify({
          experiment_name: experimentName.trim(),
          dataset_id: parseInt(datasetId, 10),
          input_binding: {
            // Authored in the Experiment run step (not stored in the config);
            // required non-empty because the legacy binding needs min_length 1.
            prompt: promptTemplate,
            text_columns: textColumns,
            attachments,
          },
          configs: runConfigs,
          post_processing_config: postProcessingConfig ?? null,
        }),
      });

      showToastSuccess("Assessment submitted!");
      setConfigStep(1);
      setCompletedConfigSteps(new Set());
      setExperimentName("");
      clearDataset();
      setColumnMapping(EMPTY_COLUMN_MAPPING);
      setSystemInstruction("");
      setPromptTemplate("");
      setOutputSchema([]);
      setConfigs([]);
      setPrefilterConfig(null);
      setConfigSeed(null);
      setPostProcessingConfig(null);
      goToTab("results");
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
    configs,
    datasetId,
    experimentName,
    goToTab,
    handleForbiddenWithNotify,
    postProcessingConfig,
    promptTemplate,
    runInputSchema,
    activeKey,
    showToastError,
    showToastSuccess,
  ]);

  // Run readiness is driven by the selected config's stored input_schema.
  const hasRunInputSchema = Object.keys(runInputSchema).length > 0;
  const hasRunPrompt = promptTemplate.trim().length > 0;
  const canSubmitAssessment =
    !!datasetId &&
    configs.length > 0 &&
    hasRunInputSchema &&
    experimentName.trim().length > 0 &&
    hasRunPrompt &&
    !isSubmitting;
  const submitBlockerMessage = getAssessmentSubmitBlocker({
    datasetId,
    hasInputSchema: hasRunInputSchema,
    configCount: configs.length,
    experimentName,
    hasPrompt: hasRunPrompt,
  });
  const effectiveCompletedConfigSteps = useMemo(() => {
    // Steps: 1 Choose config, 2 Pre-filter (optional), 3 Assessment.
    const merged = new Set(completedConfigSteps);
    // Pre-filter is optional: choosing a config unlocks jumping straight to
    // the Assessment step.
    if (merged.has(1)) merged.add(2);
    return merged;
  }, [completedConfigSteps]);

  return {
    activeTab,
    tabs: [...PAGE_TABS],
    onTabSwitch: goToTab,
    datasetsTabProps: {
      onForbidden: handleForbiddenWithNotify,
      datasetId,
      setDatasetId,
      setSelectedDatasetName: setDatasetName,
    },
    configPanelProps: {
      columnMapping,
      completedSteps: effectiveCompletedConfigSteps,
      configStep,
      configs,
      prefilterConfig,
      outputSchema,
      systemInstruction,
      promptTemplate,
      setColumnMapping,
      setConfigStep,
      setConfigs,
      setPrefilterConfig,
      setOutputSchema,
      setSystemInstruction,
      setPromptTemplate,
      onStepComplete: handleConfigNext,
      configSeed,
      onStartNewConfig: startNewConfig,
      onLoadExistingConfig: loadExistingConfig,
      onForbidden: handleForbiddenWithNotify,
    },
    experimentTabProps: {
      onForbidden: handleForbiddenWithNotify,
      promptTemplate,
      setPromptTemplate,
      configs,
      setConfigs,
      datasetId,
      datasetName,
      setDatasetId,
      setSelectedDatasetName: setDatasetName,
      experimentName,
      setExperimentName,
      isSubmitting,
      canSubmit: canSubmitAssessment,
      submitBlockerMessage,
      onSubmit: handleSubmit,
    },
    evaluationsTabProps: {
      onForbidden: handleForbiddenWithNotify,
    },
  };
}
