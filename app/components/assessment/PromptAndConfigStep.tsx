"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components";
import { ChevronLeftIcon } from "@/app/components/icons";
import { DEFAULT_PAGE_LIMIT } from "@/app/lib/constants";
import { ASSESSMENT_CONFIG_VERSION_PAGE_SIZE } from "@/app/lib/assessment/constants";
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
  MAX_CONFIGS,
  type ConfigMode,
  type ConfigSelection,
  type SampleRow,
  type SchemaProperty,
  type StateSetter,
  type ValueSetter,
  type VersionListState,
} from "@/app/lib/types/assessment";
import type { ConfigBlob, ConfigPublic } from "@/app/lib/types/configs";
import AssessmentConfiguration from "./prompt-config/AssessmentConfiguration";
import SetupProgress from "./prompt-config/SetupProgress";
import PromptPanel from "./prompt-config/PromptPanel";
import ResponseSchema from "./prompt-config/ResponseSchema";

interface PromptAndConfigStepProps {
  onNext: () => void;
  onBack: () => void;
  textColumns: string[];
  sampleRow: SampleRow;
  systemInstruction: string;
  setSystemInstruction: ValueSetter<string>;
  promptTemplate: string;
  setPromptTemplate: ValueSetter<string>;
  configs: ConfigSelection[];
  setConfigs: StateSetter<ConfigSelection[]>;
  outputSchema: SchemaProperty[];
  setOutputSchema: ValueSetter<SchemaProperty[]>;
}

export default function PromptAndConfigStep({
  textColumns,
  sampleRow,
  systemInstruction,
  setSystemInstruction,
  promptTemplate,
  setPromptTemplate,
  configs,
  setConfigs,
  outputSchema,
  setOutputSchema,
  onNext,
  onBack,
}: PromptAndConfigStepProps) {
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
  const hasPromptTemplate = promptTemplate.trim().length > 0;
  const hasConfiguredResponseFormat = namedSchemaFields.length > 0;
  const canProceed =
    hasPromptTemplate && configs.length > 0 && hasConfiguredResponseFormat;
  const nextBlockerMessage = !hasPromptTemplate
    ? "Write a prompt to continue"
    : configs.length === 0
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

  const handleProviderChange = (provider: "openai") => {
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

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 pb-20">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              Prompt & Config
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Write the task on the left. Tune behavior and output on the right.
            </p>
          </div>
          <SetupProgress
            promptStatus={promptStatus}
            selectedConfigCount={configs.length}
            responseSummary={responseSummary}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(330px,1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(360px,1.05fr)]">
          <PromptPanel
            textColumns={textColumns}
            sampleRow={sampleRow}
            systemInstruction={systemInstruction}
            setSystemInstruction={setSystemInstruction}
            promptTemplate={promptTemplate}
            setPromptTemplate={setPromptTemplate}
          />

          <aside className="self-start space-y-5 lg:sticky lg:top-6 lg:min-w-[330px] xl:min-w-[360px]">
            <ResponseSchema
              schema={outputSchema}
              setSchema={setOutputSchema}
              summary={responseSummary}
              hasFields={hasConfiguredResponseFormat}
            />

            <AssessmentConfiguration
              configMode={configMode}
              setConfigMode={setConfigMode}
              configs={configs}
              onRemoveConfig={removeSelection}
              configCards={filteredConfigCards}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isLoadingConfigs={isLoadingConfigs}
              hasMoreConfigs={hasMoreConfigs}
              nextConfigSkip={nextConfigSkip}
              expandedConfigId={expandedConfigId}
              versionStateByConfig={versionStateByConfig}
              loadingSelectionKeys={loadingSelectionKeys}
              isSelected={isSelected}
              onLoadMoreConfigs={(skip) => loadConfigs(skip, false)}
              onLoadVersions={(configId, skip) =>
                void loadVersions(configId, skip)
              }
              onToggleConfigExpansion={toggleConfigExpansion}
              onToggleVersionSelection={toggleVersionSelection}
              currentProvider={currentProvider}
              currentModel={currentModel}
              providerModels={providerModels}
              currentParamDefs={currentParamDefs}
              draftParams={draftParams}
              configName={configName}
              commitMessage={commitMessage}
              isSaving={isSaving}
              setConfigName={setConfigName}
              setCommitMessage={setCommitMessage}
              onProviderChange={handleProviderChange}
              onModelChange={handleModelChange}
              onParamChange={updateDraftParam}
              onSaveConfig={handleCreateAndAdd}
            />
          </aside>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 mt-auto -mx-6 flex items-center justify-between border-t border-border bg-bg-secondary px-6 py-2">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onBack}
            className="!rounded-lg !px-6"
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            {!canProceed && (
              <span className="text-xs text-text-secondary">
                {nextBlockerMessage}
              </span>
            )}
            <Button
              type="button"
              size="lg"
              onClick={onNext}
              disabled={!canProceed}
              className="!rounded-lg !px-6"
            >
              Next: Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
