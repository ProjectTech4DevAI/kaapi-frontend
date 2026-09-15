"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/hooks/useToast";
import { DEFAULT_PAGE_LIMIT } from "@/app/lib/constants";
import {
  ASSESSMENT_CONFIG_VERSION_PAGE_SIZE,
  MAX_CONFIGS,
} from "@/app/lib/assessment/constants";
import {
  buildAssessmentConfigBlob,
  buildDefaultParams,
  buildInitialAssessmentConfigDraft,
  buildInitialAssessmentVersionState,
  fetchConfigPage,
  fetchConfigSelection,
  fetchConfigVersionsPage,
  getDefaultModelForProvider,
  getModelConfigDefinition,
  getModelsByProvider,
  saveAssessmentConfig,
} from "@/app/lib/utils/assessmentFetcher";
import {
  type ConfigMode,
  type ConfigSaveMode,
  type ConfigSelection,
  type PromptAndConfigStepProps,
  type UsePromptAndConfigStepResult,
  type VersionListState,
} from "@/app/lib/types/assessment";
import type {
  AssessmentConfigBlob,
  CompletionConfig,
  ConfigPublic,
} from "@/app/lib/types/configs";
import useLatestConfigModels from "@/app/hooks/useLatestConfigModels";

type UsePromptAndConfigStepParams = Pick<
  PromptAndConfigStepProps,
  | "textColumns"
  | "promptTemplate"
  | "configs"
  | "setConfigs"
  | "outputSchema"
  | "systemInstruction"
  | "columnMapping"
  | "prefilterConfig"
  | "configSeed"
>;

export function usePromptAndConfigStep({
  textColumns,
  promptTemplate,
  configs,
  setConfigs,
  outputSchema,
  systemInstruction,
  columnMapping,
  prefilterConfig,
  configSeed,
}: UsePromptAndConfigStepParams): UsePromptAndConfigStepResult {
  const toast = useToast();
  const { activeKey, isAuthenticated } = useAuth();
  const apiKey = activeKey?.key ?? "";

  const [configMode, setConfigMode] = useState<ConfigMode>("existing");
  const [configCards, setConfigCards] = useState<ConfigPublic[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);
  const [hasMoreConfigs, setHasMoreConfigs] = useState(true);
  const [nextConfigSkip, setNextConfigSkip] = useState(0);
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);
  const [versionStateByConfig, setVersionStateByConfig] = useState<
    Record<string, VersionListState>
  >({});
  const [loadingSelectionKeys, setLoadingSelectionKeys] = useState<
    Record<string, boolean>
  >({});
  const hasLoadedInitialConfigsRef = useRef(false);

  const [draft, setDraft] = useState<AssessmentConfigBlob>(() =>
    buildInitialAssessmentConfigDraft(),
  );
  const [configName, setConfigName] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [saveMode, setSaveMode] = useState<ConfigSaveMode>("new");
  const [versionConfigId, setVersionConfigId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const appliedSeedNonce = useRef<number | null>(null);

  // Apply a config seed from the Configuration step once per (re)load: hydrate
  // the provider/model draft and preset the save mode (new vs new-version).
  useEffect(() => {
    if (!configSeed || appliedSeedNonce.current === configSeed.nonce) return;
    appliedSeedNonce.current = configSeed.nonce;
    if (configSeed.blob) setDraft(configSeed.blob);
    setSaveMode(configSeed.saveMode);
    setVersionConfigId(configSeed.configId);
    setConfigName(configSeed.configName);
  }, [configSeed]);

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

  const usedColumns = useMemo(
    () => textColumns.filter((col) => promptTemplate.includes(`{${col}}`)),
    [promptTemplate, textColumns],
  );
  const namedSchemaFields = outputSchema.filter((field) => field.name.trim());
  const hasConfiguredResponseFormat = namedSchemaFields.length > 0;
  const configBlob = useMemo(
    () =>
      buildAssessmentConfigBlob({
        draft,
        systemInstruction,
        outputSchema,
        columnMapping,
        prefilterConfig,
      }),
    [draft, systemInstruction, outputSchema, columnMapping, prefilterConfig],
  );
  const canProceed = configs.length > 0 && hasConfiguredResponseFormat;
  const nextBlockerMessage =
    configs.length === 0
      ? "Select at least one configuration to continue"
      : !hasConfiguredResponseFormat
        ? "Set response format to continue"
        : "";
  const responseSummary =
    namedSchemaFields.length > 0
      ? `${namedSchemaFields.length} fields`
      : "Not set";
  const promptStatus = promptTemplate.trim()
    ? `${usedColumns.length} placeholders`
    : "Empty";

  const isSelected = useCallback(
    (configId: string, version: number) =>
      configs.some(
        (config) =>
          config.config_id === configId && config.config_version === version,
      ),
    [configs],
  );

  const addSelection = useCallback(
    (selection: ConfigSelection) => {
      if (
        configs.some(
          (config) =>
            config.config_id === selection.config_id &&
            config.config_version === selection.config_version,
        )
      ) {
        toast.error("This configuration version is already selected");
        return;
      }
      if (configs.length >= MAX_CONFIGS) {
        toast.error(`You can select up to ${MAX_CONFIGS} configurations`);
        return;
      }
      setConfigs((prev) => [...prev, selection]);
    },
    [configs, setConfigs, toast],
  );

  const removeSelection = useCallback(
    (configId: string, version: number) => {
      setConfigs((prev) =>
        prev.filter(
          (config) =>
            !(
              config.config_id === configId && config.config_version === version
            ),
        ),
      );
    },
    [setConfigs],
  );

  const toggleVersionSelection = useCallback(
    async (config: ConfigPublic, version: number) => {
      if (!isAuthenticated) return;
      const key = `${config.id}:${version}`;
      if (isSelected(config.id, version)) {
        removeSelection(config.id, version);
        return;
      }
      setLoadingSelectionKeys((prev) => ({ ...prev, [key]: true }));
      try {
        const selection = await fetchConfigSelection(apiKey, config, version);
        addSelection(selection);
      } catch {
        toast.error("Failed to load configuration details");
      } finally {
        setLoadingSelectionKeys((prev) => ({ ...prev, [key]: false }));
      }
    },
    [addSelection, apiKey, isAuthenticated, isSelected, removeSelection, toast],
  );

  const loadConfigs = useCallback(
    async (skip: number, replace: boolean) => {
      if (!isAuthenticated) {
        if (replace) setIsLoadingConfigs(false);
        return;
      }
      if (replace) setIsLoadingConfigs(true);
      try {
        const result = await fetchConfigPage({
          apiKey,
          skip,
          limit: DEFAULT_PAGE_LIMIT,
        });
        setConfigCards((prev) =>
          replace ? result.items : [...prev, ...result.items],
        );
        setHasMoreConfigs(result.hasMore);
        setNextConfigSkip(result.nextSkip);
      } catch {
        toast.error("Failed to load configurations");
      } finally {
        setIsLoadingConfigs(false);
      }
    },
    [apiKey, isAuthenticated, toast],
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!hasLoadedInitialConfigsRef.current) {
      hasLoadedInitialConfigsRef.current = true;
      void loadConfigs(0, true);
    }
  }, [isAuthenticated, loadConfigs]);

  const latestModelByConfig = useLatestConfigModels(
    configCards,
    apiKey,
    isAuthenticated,
  );

  const filteredConfigCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return configCards;
    return configCards.filter((config) =>
      `${config.name} ${config.description || ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [configCards, searchQuery]);

  const loadVersions = useCallback(
    async (configId: string, skip: number) => {
      if (!isAuthenticated) return;
      setVersionStateByConfig((prev) => ({
        ...prev,
        [configId]: {
          ...(prev[configId] ?? buildInitialAssessmentVersionState()),
          isLoading: true,
          error: null,
        },
      }));
      try {
        const result = await fetchConfigVersionsPage(apiKey, configId, {
          skip,
          limit: ASSESSMENT_CONFIG_VERSION_PAGE_SIZE,
        });
        setVersionStateByConfig((prev) => {
          const existing =
            prev[configId] ?? buildInitialAssessmentVersionState();
          return {
            ...prev,
            [configId]: {
              items:
                skip === 0
                  ? result.items
                  : [...existing.items, ...result.items],
              isLoading: false,
              error: null,
              hasMore: result.hasMore,
              nextSkip: result.nextSkip,
            },
          };
        });
      } catch {
        setVersionStateByConfig((prev) => ({
          ...prev,
          [configId]: {
            ...(prev[configId] ?? buildInitialAssessmentVersionState()),
            isLoading: false,
            error: "Failed to load versions",
          },
        }));
      }
    },
    [apiKey, isAuthenticated],
  );

  const toggleConfigExpansion = useCallback(
    (configId: string) => {
      if (expandedConfigId === configId) {
        setExpandedConfigId(null);
        return;
      }
      setExpandedConfigId(configId);
      if (!versionStateByConfig[configId]) {
        void loadVersions(configId, 0);
      }
    },
    [expandedConfigId, loadVersions, versionStateByConfig],
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

  const handleProviderChange = (provider: CompletionConfig["provider"]) => {
    const defaultModel = getDefaultModelForProvider(provider);
    setDraft((prev) => ({
      ...prev,
      assessment: {
        ...prev.assessment,
        provider,
        params: {
          instructions: String(prev.assessment.params.instructions || ""),
          input_schema: prev.assessment.params.input_schema,
          model: defaultModel,
          ...buildDefaultParams(defaultModel),
        },
      },
    }));
  };

  const handleModelChange = (modelName: string) => {
    setDraft((prev) => ({
      ...prev,
      assessment: {
        ...prev.assessment,
        params: {
          instructions: String(prev.assessment.params.instructions || ""),
          input_schema: prev.assessment.params.input_schema,
          model: modelName,
          ...buildDefaultParams(modelName),
        },
      },
    }));
  };

  const handleCreateAndAdd = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to create configurations");
      return;
    }
    const isVersion = saveMode === "version";
    const targetConfig = isVersion
      ? (configCards.find((c) => c.id === versionConfigId) ?? null)
      : null;
    if (isVersion) {
      if (!targetConfig) {
        toast.error("Select a configuration to version");
        return;
      }
    } else if (!configName.trim()) {
      toast.error("Configuration name is required");
      return;
    }
    setIsSaving(true);
    try {
      const configBlob = buildAssessmentConfigBlob({
        draft,
        systemInstruction,
        outputSchema,
        columnMapping,
        prefilterConfig,
      });
      const saved = await saveAssessmentConfig({
        apiKey,
        configName: isVersion ? targetConfig!.name : configName.trim(),
        commitMessage: commitMessage.trim(),
        configBlob,
        existingConfig: isVersion
          ? { id: targetConfig!.id, name: targetConfig!.name }
          : null,
      });
      addSelection({
        config_id: saved.config_id,
        config_version: saved.config_version,
        name: saved.name ?? configName.trim(),
        provider: draft.assessment.provider,
        model: currentModel,
      });
      setDraft(buildInitialAssessmentConfigDraft());
      setConfigName("");
      setCommitMessage("");
      setVersionConfigId("");
      setSaveMode("new");
      setConfigMode("existing");
      toast.success(
        isVersion
          ? "New version saved and added!"
          : "Configuration saved and added!",
      );
      void loadConfigs(0, true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save configuration",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return {
    promptStatus,
    responseSummary,
    hasConfiguredResponseFormat,
    canProceed,
    nextBlockerMessage,
    configMode,
    setConfigMode,
    removeSelection,
    filteredConfigCards,
    searchQuery,
    setSearchQuery,
    isLoadingConfigs,
    hasMoreConfigs,
    nextConfigSkip,
    expandedConfigId,
    versionStateByConfig,
    latestModelByConfig,
    loadingSelectionKeys,
    isSelected,
    loadConfigs,
    loadVersions,
    toggleConfigExpansion,
    toggleVersionSelection,
    currentProvider,
    currentModel,
    providerModels,
    currentParamDefs,
    draftParams,
    configName,
    commitMessage,
    isSaving,
    saveMode,
    setSaveMode,
    versionConfigId,
    setVersionConfigId,
    setConfigName,
    setCommitMessage,
    handleProviderChange,
    handleModelChange,
    updateDraftParam,
    handleCreateAndAdd,
    configBlob,
  };
}
