"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/hooks/useToast";
import { MAX_CONFIGS } from "@/app/lib/assessment/constants";
import {
  buildDefaultParams,
  getDefaultModelForProvider,
  getModelConfigDefinition,
  getModelsByProvider,
} from "@/app/lib/data/assessmentModels";
import {
  buildAssessmentConfigBlob,
  buildInitialAssessmentConfigDraft,
  fetchConfigPage,
  saveAssessmentConfig,
} from "@/app/lib/utils/assessmentFetcher";
import {
  diffDatasetCompatibility,
  storeSubmissionTemplate,
} from "@/app/lib/utils/assessmentTemplate";
import type { UseReferenceDatasetResult } from "@/app/hooks/useReferenceDataset";
import { useDerivedFields } from "@/app/hooks/useDerivedFields";
import type {
  AssessmentSectionProps,
  ConfigSaveMode,
  DerivedField,
} from "@/app/lib/types/assessment";
import type {
  AssessmentConfigBlob,
  CompletionConfig,
  ConfigPublic,
} from "@/app/lib/types/configs";

export interface ReviewWarning {
  level: "error" | "warning";
  message: string;
}

type UseConfigEditorParams = Pick<
  AssessmentSectionProps,
  | "columnMapping"
  | "setColumnMapping"
  | "systemInstruction"
  | "promptTemplate"
  | "setPromptTemplate"
  | "outputSchema"
  | "prefilterConfig"
  | "configs"
  | "setConfigs"
  | "configSeed"
  | "onSaved"
> & { reference: UseReferenceDatasetResult };

function buildReviewWarnings(params: {
  systemInstruction: string;
  promptTemplate: string;
  fields: DerivedField[];
  hasNamedOutputFields: boolean;
  compatibility: {
    missingInDataset: string[];
    extraInDataset: string[];
  } | null;
  removedColumns: string[];
}): ReviewWarning[] {
  const warnings: ReviewWarning[] = [];
  if (!params.systemInstruction.trim()) {
    warnings.push({ level: "error", message: "Instructions are empty." });
  }
  if (params.fields.length === 0) {
    warnings.push({
      level: "error",
      message:
        "No fields yet — reference at least one dataset column with @ in the Submission editor.",
    });
  }
  if (!params.hasNamedOutputFields) {
    warnings.push({
      level: "error",
      message:
        "The response format needs at least one field — free-text output is not supported.",
    });
  }
  if (!params.promptTemplate.trim()) {
    warnings.push({
      level: "warning",
      message:
        "The Submission section is empty — the AI will receive all text columns joined together.",
    });
  }
  params.fields.forEach((field) => {
    if (field.warning) {
      warnings.push({
        level: "warning",
        message: `${field.name}: ${field.warning}`,
      });
    }
  });
  if (params.compatibility) {
    if (params.compatibility.missingInDataset.length > 0) {
      warnings.push({
        level: "warning",
        message: `Missing in the dataset: ${params.compatibility.missingInDataset.join(", ")} — runs against it would fail.`,
      });
    }
    if (params.compatibility.extraInDataset.length > 0) {
      warnings.push({
        level: "warning",
        message: `Dataset columns not used by this config: ${params.compatibility.extraInDataset.join(", ")} — every dataset column must be a field (the backend requires an exact match).`,
      });
    }
  }
  if (params.removedColumns.length > 0) {
    warnings.push({
      level: "warning",
      message: `Removed field(s) ${params.removedColumns.join(", ")} will come back in the saved version (a backend limitation) — save as a new configuration to actually drop them.`,
    });
  }
  return warnings;
}

// Orchestrates the Assessment section: the model draft, the fields derived
// from the Submission template's @-references, and Review & save.
export function useConfigEditor({
  columnMapping,
  setColumnMapping,
  systemInstruction,
  promptTemplate,
  setPromptTemplate,
  outputSchema,
  prefilterConfig,
  configs,
  setConfigs,
  configSeed,
  onSaved,
  reference,
}: UseConfigEditorParams) {
  const toast = useToast();
  const { activeKey, isAuthenticated } = useAuth();
  const apiKey = activeKey?.key ?? "";

  const sampleRow = reference.referenceDataset?.sampleRow ?? {};

  const [draft, setDraft] = useState<AssessmentConfigBlob>(() =>
    buildInitialAssessmentConfigDraft(),
  );
  const [saveMode, setSaveMode] = useState<ConfigSaveMode>("new");
  const [versionConfigId, setVersionConfigId] = useState("");
  const [configName, setConfigName] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [existingConfigs, setExistingConfigs] = useState<ConfigPublic[]>([]);
  // input_schema keys of the loaded version, for the removed-columns warning
  // (version creation deep-merges server-side: removed columns resurrect).
  const [loadedInputSchemaKeys, setLoadedInputSchemaKeys] = useState<string[]>(
    [],
  );
  const appliedSeedNonce = useRef<number | null>(null);

  // Apply a config seed from the Choose-config step once per (re)load.
  useEffect(() => {
    if (!configSeed || appliedSeedNonce.current === configSeed.nonce) return;
    appliedSeedNonce.current = configSeed.nonce;
    setDraft(configSeed.blob ?? buildInitialAssessmentConfigDraft());
    setSaveMode(configSeed.saveMode);
    setVersionConfigId(configSeed.configId);
    setConfigName(configSeed.configName);
    setLoadedInputSchemaKeys(
      configSeed.blob
        ? Object.keys(configSeed.blob.assessment.params.input_schema ?? {})
        : [],
    );
  }, [configSeed]);

  // Save-target list for "new version of existing".
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchConfigPage({ apiKey, limit: 100 })
      .then((page) => setExistingConfigs(page.items))
      .catch(() => {
        // Non-fatal: the select falls back to the loaded config only.
      });
  }, [apiKey, isAuthenticated]);

  // ---- Model draft -------------------------------------------------------
  const draftParams = draft.assessment.params as Record<
    string,
    string | number | undefined
  >;
  const currentProvider = draft.assessment.provider ?? "openai";
  const providerModels = useMemo(
    () => getModelsByProvider(currentProvider),
    [currentProvider],
  );
  const currentModel = String(draftParams.model || providerModels[0]?.value);
  const currentParamDefs = useMemo(
    () => getModelConfigDefinition(currentModel),
    [currentModel],
  );

  const updateDraftParam = (key: string, value: string | number) => {
    setDraft((prev) => ({
      ...prev,
      assessment: {
        ...prev.assessment,
        params: { ...prev.assessment.params, [key]: value },
      },
    }));
  };

  const applyModel = (
    modelName: string,
    provider?: CompletionConfig["provider"],
  ) => {
    setDraft((prev) => ({
      ...prev,
      assessment: {
        ...prev.assessment,
        provider: provider ?? prev.assessment.provider,
        params: {
          instructions: String(prev.assessment.params.instructions || ""),
          input_schema: prev.assessment.params.input_schema,
          model: modelName,
          ...buildDefaultParams(modelName),
        },
      },
    }));
  };

  const handleProviderChange = (provider: CompletionConfig["provider"]) =>
    applyModel(getDefaultModelForProvider(provider), provider);
  const handleModelChange = (modelName: string) => applyModel(modelName);

  // ---- Fields derived from the Submission template -----------------------
  const derived = useDerivedFields({
    columnMapping,
    setColumnMapping,
    promptTemplate,
    setPromptTemplate,
    sampleRow,
  });

  // ---- Review & save -----------------------------------------------------
  const configBlob = useMemo(
    () =>
      buildAssessmentConfigBlob({
        draft,
        systemInstruction,
        submissionTemplate: promptTemplate,
        outputSchema,
        columnMapping,
        prefilterConfig,
      }),
    [
      draft,
      systemInstruction,
      promptTemplate,
      outputSchema,
      columnMapping,
      prefilterConfig,
    ],
  );

  const compatibility = reference.referenceDataset
    ? diffDatasetCompatibility(
        reference.referenceDataset.headers,
        Object.keys(configBlob.assessment.params.input_schema),
      )
    : null;

  const removedColumns = useMemo(() => {
    if (saveMode !== "version" || loadedInputSchemaKeys.length === 0) return [];
    const current = new Set(
      Object.keys(configBlob.assessment.params.input_schema),
    );
    return loadedInputSchemaKeys.filter((key) => !current.has(key));
  }, [configBlob, loadedInputSchemaKeys, saveMode]);

  const reviewWarnings = useMemo(
    () =>
      buildReviewWarnings({
        systemInstruction,
        promptTemplate,
        fields: derived.fields,
        hasNamedOutputFields: outputSchema.some((field) => field.name.trim()),
        compatibility,
        removedColumns,
      }),
    [
      compatibility,
      derived.fields,
      outputSchema,
      promptTemplate,
      removedColumns,
      systemInstruction,
    ],
  );

  const hasBlockingIssues = reviewWarnings.some((w) => w.level === "error");

  const resolveSaveTarget = (): { id: string; name: string } | null => {
    if (saveMode !== "version") return null;
    const fromList = existingConfigs.find((c) => c.id === versionConfigId);
    if (fromList) return { id: fromList.id, name: fromList.name };
    if (versionConfigId && configName)
      return { id: versionConfigId, name: configName };
    return null;
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to save configurations");
      return;
    }
    const isVersion = saveMode === "version";
    const target = resolveSaveTarget();
    if (isVersion && !target) {
      toast.error("Select a configuration to version");
      return;
    }
    if (!isVersion && !configName.trim()) {
      toast.error("Configuration name is required");
      return;
    }
    setIsSaving(true);
    try {
      const saved = await saveAssessmentConfig({
        apiKey,
        configName: isVersion ? target!.name : configName.trim(),
        commitMessage: commitMessage.trim(),
        configBlob,
        existingConfig: target,
      });
      storeSubmissionTemplate(
        saved.config_id,
        saved.config_version,
        promptTemplate,
      );
      // Preselect the saved version for the Experiment tab.
      setConfigs((prev) => {
        const withoutDupe = prev.filter(
          (c) =>
            !(
              c.config_id === saved.config_id &&
              c.config_version === saved.config_version
            ),
        );
        if (withoutDupe.length >= MAX_CONFIGS) return withoutDupe;
        return [
          ...withoutDupe,
          {
            ...saved,
            input_schema: configBlob.assessment.params.input_schema,
            query_template: promptTemplate || undefined,
          },
        ];
      });
      // Continue iterating on the saved config as new versions.
      setSaveMode("version");
      setVersionConfigId(saved.config_id);
      setConfigName(saved.name ?? configName.trim());
      setLoadedInputSchemaKeys(
        Object.keys(configBlob.assessment.params.input_schema),
      );
      setCommitMessage("");
      setIsReviewOpen(false);
      toast.success(
        `Saved “${saved.name ?? configName.trim()}” v${saved.config_version} — ready to run in Experiment.`,
      );
      onSaved();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save configuration",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return {
    // model panel
    currentProvider,
    currentModel,
    providerModels,
    currentParamDefs,
    draftParams,
    handleProviderChange,
    handleModelChange,
    updateDraftParam,
    // fields
    ...derived,
    // reference dataset
    reference,
    sampleRow,
    // review & save
    configBlob,
    isReviewOpen,
    setIsReviewOpen,
    reviewWarnings,
    hasBlockingIssues,
    saveMode,
    setSaveMode,
    versionConfigId,
    setVersionConfigId,
    configName,
    setConfigName,
    commitMessage,
    setCommitMessage,
    existingConfigs,
    isSaving,
    handleSave,
    configs,
  };
}

export type UseConfigEditorResult = ReturnType<typeof useConfigEditor>;
