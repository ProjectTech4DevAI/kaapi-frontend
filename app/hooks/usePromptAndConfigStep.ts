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
  type ConfigParamDefinition,
  type ConfigSelection,
  type LatestConfigModel,
  type ModelOption,
  type PromptAndConfigStepProps,
  type ValueSetter,
  type VersionListState,
} from "@/app/lib/types/assessment";
import type {
  CompletionConfig,
  ConfigBlob,
  ConfigPublic,
} from "@/app/lib/types/configs";
import useLatestConfigModels from "@/app/hooks/useLatestConfigModels";

type UsePromptAndConfigStepParams = Pick<
  PromptAndConfigStepProps,
  "textColumns" | "promptTemplate" | "configs" | "setConfigs" | "outputSchema"
>;

export interface UsePromptAndConfigStepResult {
  promptStatus: string;
  responseSummary: string;
  hasConfiguredResponseFormat: boolean;
  canProceed: boolean;
  nextBlockerMessage: string;
  configMode: ConfigMode;
  setConfigMode: ValueSetter<ConfigMode>;
  removeSelection: (configId: string, version: number) => void;
  filteredConfigCards: ConfigPublic[];
  searchQuery: string;
  setSearchQuery: ValueSetter<string>;
  isLoadingConfigs: boolean;
  hasMoreConfigs: boolean;
  nextConfigSkip: number;
  expandedConfigId: string | null;
  versionStateByConfig: Record<string, VersionListState>;
  latestModelByConfig: Record<string, LatestConfigModel>;
  loadingSelectionKeys: Record<string, boolean>;
  isSelected: (configId: string, version: number) => boolean;
  loadConfigs: (skip: number, replace: boolean) => Promise<void>;
  loadVersions: (configId: string, skip: number) => Promise<void>;
  toggleConfigExpansion: (configId: string) => void;
  toggleVersionSelection: (
    config: ConfigPublic,
    version: number,
  ) => Promise<void>;
  currentProvider: string;
  currentModel: string;
  providerModels: ModelOption[];
  currentParamDefs: Record<string, ConfigParamDefinition>;
  draftParams: Record<string, string | number | undefined>;
  configName: string;
  commitMessage: string;
  isSaving: boolean;
  setConfigName: ValueSetter<string>;
  setCommitMessage: ValueSetter<string>;
  handleProviderChange: (provider: CompletionConfig["provider"]) => void;
  handleModelChange: (modelName: string) => void;
  updateDraftParam: (key: string, value: string | number) => void;
  handleCreateAndAdd: () => Promise<void>;
}

export function usePromptAndConfigStep({
  textColumns,
  promptTemplate,
  configs,
  setConfigs,
  outputSchema,
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

  const [draft, setDraft] = useState<ConfigBlob>(() =>
    buildInitialAssessmentConfigDraft(),
  );
  const [configName, setConfigName] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const draftParams = draft.completion.params as Record<
    string,
    string | number | undefined
  >;
  const currentProvider = draft.completion.provider ?? "openai";
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
      completion: {
        ...prev.completion,
        params: { ...prev.completion.params, [key]: value },
      },
    }));
  };

  const handleProviderChange = (provider: CompletionConfig["provider"]) => {
    const defaultModel = getDefaultModelForProvider(provider);
    setDraft((prev) => ({
      ...prev,
      completion: {
        ...prev.completion,
        provider,
        params: {
          instructions: String(prev.completion.params.instructions || ""),
          model: defaultModel,
          ...buildDefaultParams(defaultModel),
        },
      },
    }));
  };

  const handleModelChange = (modelName: string) => {
    setDraft((prev) => ({
      ...prev,
      completion: {
        ...prev.completion,
        params: {
          instructions: String(prev.completion.params.instructions || ""),
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
    if (!configName.trim()) {
      toast.error("Configuration name is required");
      return;
    }
    setIsSaving(true);
    try {
      const existingConfig =
        configCards.find(
          (c) =>
            c.name.trim().toLowerCase() === configName.trim().toLowerCase(),
        ) ?? null;
      const saved = await saveAssessmentConfig({
        apiKey,
        configName: configName.trim(),
        commitMessage: commitMessage.trim(),
        configBlob: draft,
        existingConfig: existingConfig
          ? { id: existingConfig.id, name: existingConfig.name }
          : null,
      });
      addSelection({
        config_id: saved.config_id,
        config_version: saved.config_version,
        name: configName.trim(),
        provider: draft.completion.provider,
        model: currentModel,
      });
      setDraft(buildInitialAssessmentConfigDraft());
      setConfigName("");
      setCommitMessage("");
      setConfigMode("existing");
      toast.success("Configuration saved and added!");
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
    setConfigName,
    setCommitMessage,
    handleProviderChange,
    handleModelChange,
    updateDraftParam,
    handleCreateAndAdd,
  };
}
