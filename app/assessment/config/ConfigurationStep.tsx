"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  CloseIcon,
} from "@/app/components/icons";
import { useToast } from "@/app/components/Toast";
import {
  ConfigBlob,
  ConfigPublic,
  ConfigVersionItems,
} from "@/app/lib/types/configs";
import { formatRelativeTime } from "@/app/lib/utils";
import { ConfigSelection, MAX_CONFIGS, SchemaProperty } from "../types";
import { OutputSchemaModal } from "../components/OutputSchemaStep";
import {
  buildDefaultParams,
  ConfigParamDefinition,
  DEFAULT_CONFIG,
  getDefaultModelForProvider,
  getModelConfigDefinition,
  getModelsByProvider,
  PAGE_SIZE,
  PROVIDER_OPTIONS,
} from "./constants";
import {
  fetchConfigPage,
  fetchConfigSelection,
  fetchConfigVersionsPage,
  invalidateAssessmentConfigCache,
  saveAssessmentConfig,
} from "./api";

interface ConfigurationStepProps {
  apiKey: string;
  configs: ConfigSelection[];
  setConfigs: Dispatch<SetStateAction<ConfigSelection[]>>;
  outputSchema: SchemaProperty[];
  setOutputSchema: (schema: SchemaProperty[]) => void;
  onNext: () => void;
  onBack: () => void;
}

interface VersionListState {
  items: ConfigVersionItems[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  nextSkip: number;
}

type Mode = "existing" | "create";
type ConfigSubtab = "configs" | "schema";

const VERSION_PAGE_SIZE = 8;

function buildInitialDraft(): ConfigBlob {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as ConfigBlob;
}

function buildInitialVersionState(): VersionListState {
  return {
    items: [],
    isLoading: false,
    error: null,
    hasMore: true,
    nextSkip: 0,
  };
}

const CONFIG_SECTION_META: Array<{
  id: ConfigSubtab;
  index: number;
  title: string;
  description: string;
}> = [
  {
    id: "configs",
    index: 1,
    title: "AI Configuration",
    description: "Choose the config the AI should use.",
  },
  {
    id: "schema",
    index: 2,
    title: "Output",
    description: "Choose how the answer should look.",
  },
];

function SelectionChip({
  config,
  onRemove,
}: {
  config: ConfigSelection;
  onRemove: (configId: string, version: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-neutral-900 bg-neutral-900/5 px-3 py-1.5">
      <span className="text-sm font-medium text-neutral-900">
        {config.name}
      </span>
      <span className="text-xs text-neutral-500">
        v{config.config_version}{" "}
        {config.provider && config.model
          ? `• ${config.provider}/${config.model}`
          : ""}
      </span>
      <button
        onClick={() => onRemove(config.config_id, config.config_version)}
        className="cursor-pointer rounded-full p-0.5 text-neutral-500"
        aria-label={`Remove ${config.name || "config"} version ${config.config_version}`}
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function ConfigurationStep({
  apiKey,
  configs,
  setConfigs,
  outputSchema,
  setOutputSchema,
  onNext,
  onBack,
}: ConfigurationStepProps) {
  const toast = useToast();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedInitialConfigsRef = useRef(false);

  const [mode, setMode] = useState<Mode>("existing");
  const [configCards, setConfigCards] = useState<ConfigPublic[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);
  const [isLoadingMoreConfigs, setIsLoadingMoreConfigs] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [hasMoreConfigs, setHasMoreConfigs] = useState(true);
  const [nextConfigSkip, setNextConfigSkip] = useState(0);
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);
  const [versionStateByConfig, setVersionStateByConfig] = useState<
    Record<string, VersionListState>
  >({});
  const [loadingSelectionKeys, setLoadingSelectionKeys] = useState<
    Record<string, boolean>
  >({});

  const [draft, setDraft] = useState<ConfigBlob>(() => buildInitialDraft());
  const [configName, setConfigName] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeSubtab, setActiveSubtab] = useState<ConfigSubtab>("configs");
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);

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

  const isSelected = useCallback(
    (configId: string, version: number) =>
      configs.some(
        (item) =>
          item.config_id === configId && item.config_version === version,
      ),
    [configs],
  );

  const selectedCountForConfig = useCallback(
    (configId: string) =>
      configs.filter((item) => item.config_id === configId).length,
    [configs],
  );

  const filteredConfigCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return configCards;
    }

    return configCards.filter((config) => {
      const haystack =
        `${config.name} ${config.description || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [configCards, searchQuery]);

  const addSelection = useCallback(
    (selection: ConfigSelection) => {
      const alreadySelected = configs.some(
        (item) =>
          item.config_id === selection.config_id &&
          item.config_version === selection.config_version,
      );
      if (alreadySelected) {
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
          (item) =>
            !(item.config_id === configId && item.config_version === version),
        ),
      );
    },
    [setConfigs],
  );

  const loadConfigPage = useCallback(
    async (reset: boolean) => {
      if (reset) {
        setIsLoadingConfigs(true);
        setConfigError(null);
      } else {
        if (isLoadingMoreConfigs || !hasMoreConfigs) return;
        setIsLoadingMoreConfigs(true);
      }

      try {
        const page = await fetchConfigPage({
          apiKey,
          skip: reset ? 0 : nextConfigSkip,
          limit: PAGE_SIZE,
        });

        setConfigCards((prev) => {
          const incoming = reset ? page.items : [...prev, ...page.items];
          const deduped = new Map(incoming.map((item) => [item.id, item]));
          return Array.from(deduped.values());
        });
        setHasMoreConfigs(page.hasMore);
        setNextConfigSkip(page.nextSkip);
        if (reset && page.items.length > 0) {
          setExpandedConfigId((current) =>
            current && page.items.some((item) => item.id === current)
              ? current
              : null,
          );
        }
      } catch (error) {
        setConfigError(
          error instanceof Error
            ? error.message
            : "Failed to load configurations",
        );
      } finally {
        setIsLoadingConfigs(false);
        setIsLoadingMoreConfigs(false);
      }
    },
    [apiKey, hasMoreConfigs, isLoadingMoreConfigs, nextConfigSkip],
  );

  useEffect(() => {
    if (hasLoadedInitialConfigsRef.current) {
      return;
    }

    hasLoadedInitialConfigsRef.current = true;
    void loadConfigPage(true);
  }, [loadConfigPage]);

  const namedSchemaCount = outputSchema.filter((field) =>
    field.name.trim(),
  ).length;
  const hasConfiguredResponseFormat = namedSchemaCount > 0;
  const canFinishFromSchema = configs.length > 0 && hasConfiguredResponseFormat;
  const schemaBlockerMessage =
    configs.length === 0
      ? "Select at least one configuration to continue"
      : !hasConfiguredResponseFormat
        ? "Set response format to continue"
        : "";

  useEffect(() => {
    if (mode !== "existing") return undefined;
    if (!hasMoreConfigs || isLoadingConfigs || isLoadingMoreConfigs)
      return undefined;

    const node = loadMoreRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          void loadConfigPage(false);
        }
      },
      {
        rootMargin: "320px 0px",
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [
    hasMoreConfigs,
    isLoadingConfigs,
    isLoadingMoreConfigs,
    loadConfigPage,
    mode,
  ]);

  const loadVersions = useCallback(
    async (configId: string, reset: boolean) => {
      const currentState =
        versionStateByConfig[configId] || buildInitialVersionState();
      if (!reset && (!currentState.hasMore || currentState.isLoading)) {
        return;
      }

      setVersionStateByConfig((prev) => ({
        ...prev,
        [configId]: {
          ...(reset ? buildInitialVersionState() : currentState),
          isLoading: true,
          error: null,
        },
      }));

      try {
        const page = await fetchConfigVersionsPage(apiKey, configId, {
          skip: reset ? 0 : currentState.nextSkip,
          limit: VERSION_PAGE_SIZE,
        });

        setVersionStateByConfig((prev) => {
          const existing = reset ? [] : prev[configId]?.items || [];
          const merged = [...existing, ...page.items];
          const deduped = new Map(merged.map((item) => [item.version, item]));

          return {
            ...prev,
            [configId]: {
              items: Array.from(deduped.values()).sort(
                (a, b) => b.version - a.version,
              ),
              isLoading: false,
              error: null,
              hasMore: page.hasMore,
              nextSkip: page.nextSkip,
            },
          };
        });
      } catch (error) {
        setVersionStateByConfig((prev) => ({
          ...prev,
          [configId]: {
            ...(prev[configId] || buildInitialVersionState()),
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to load versions",
          },
        }));
      }
    },
    [apiKey, versionStateByConfig],
  );

  const toggleConfigExpansion = useCallback(
    (configId: string) => {
      setExpandedConfigId((current) =>
        current === configId ? null : configId,
      );

      const state = versionStateByConfig[configId];
      if (!state || state.items.length === 0) {
        void loadVersions(configId, true);
      }
    },
    [loadVersions, versionStateByConfig],
  );

  const toggleVersionSelection = useCallback(
    async (config: ConfigPublic, versionNumber: number) => {
      if (isSelected(config.id, versionNumber)) {
        removeSelection(config.id, versionNumber);
        return;
      }

      if (configs.length >= MAX_CONFIGS) {
        toast.error(`You can select up to ${MAX_CONFIGS} configurations`);
        return;
      }

      const key = `${config.id}:${versionNumber}`;
      setLoadingSelectionKeys((prev) => ({ ...prev, [key]: true }));

      try {
        const selection = await fetchConfigSelection(
          apiKey,
          config,
          versionNumber,
        );
        addSelection(selection);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to select configuration",
        );
      } finally {
        setLoadingSelectionKeys((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [addSelection, apiKey, configs.length, isSelected, removeSelection, toast],
  );

  const updateDraftParam = useCallback(
    (key: string, value: string | number) => {
      setDraft((prev) => ({
        ...prev,
        completion: {
          ...prev.completion,
          params: {
            ...prev.completion.params,
            [key]: value,
          },
        },
      }));
    },
    [],
  );

  const handleModelChange = useCallback((modelName: string) => {
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
  }, []);

  const handleCreateAndAdd = useCallback(async () => {
    if (!configName.trim()) {
      toast.error("Configuration name is required");
      return;
    }

    if (configs.length >= MAX_CONFIGS) {
      toast.error(`You can select up to ${MAX_CONFIGS} configurations`);
      return;
    }

    setIsSaving(true);

    try {
      const saved = await saveAssessmentConfig({
        apiKey,
        configName,
        commitMessage,
        configBlob: draft,
      });

      addSelection(saved);
      invalidateAssessmentConfigCache();
      setCommitMessage("");
      toast.success(`Configuration "${saved.name}" is ready to use`);
      void loadConfigPage(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save configuration",
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    addSelection,
    apiKey,
    commitMessage,
    configName,
    configs.length,
    draft,
    loadConfigPage,
    toast,
  ]);

  const renderNumericParameter = (
    paramKey: string,
    definition: ConfigParamDefinition,
  ) => {
    const min = definition.min ?? 0;
    const max = definition.max ?? 100;
    const value = Number(draftParams[paramKey] ?? definition.default);
    const rangeStep =
      definition.type === "float"
        ? 0.01
        : Math.max(1, Math.round((max - min) / 100));

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={min}
            max={max}
            step={rangeStep}
            value={value}
            onChange={(event) =>
              updateDraftParam(
                paramKey,
                definition.type === "float"
                  ? parseFloat(event.target.value)
                  : parseInt(event.target.value, 10),
              )
            }
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-neutral-900"
          />
          <input
            type="number"
            min={min}
            max={max}
            step={definition.type === "float" ? "0.01" : "1"}
            value={String(value)}
            onChange={(event) => {
              const nextValue =
                definition.type === "float"
                  ? parseFloat(event.target.value)
                  : parseInt(event.target.value, 10);
              updateDraftParam(
                paramKey,
                Number.isNaN(nextValue) ? definition.default : nextValue,
              );
            }}
            className="w-24 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    );
  };

  const renderParamControl = (
    paramKey: string,
    definition: ConfigParamDefinition,
  ) => {
    const value = draftParams[paramKey] ?? definition.default;

    if (definition.type === "enum") {
      return (
        <select
          value={String(value)}
          onChange={(event) => updateDraftParam(paramKey, event.target.value)}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none"
        >
          {(definition.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    return renderNumericParameter(paramKey, definition);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mx-auto flex w-full max-w-7xl flex-1 min-h-0 flex-col">
        <div className="flex-1 space-y-6 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              Configuration
            </h2>
          </div>

          <div className="space-y-4">
            <div
              className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-1"
              role="tablist"
              aria-label="Configuration sections"
            >
              {CONFIG_SECTION_META.map((section) => {
                const isActive = activeSubtab === section.id;
                const status =
                  section.id === "configs"
                    ? `${configs.length}/${MAX_CONFIGS} selected`
                    : hasConfiguredResponseFormat
                      ? `${namedSchemaCount} fields`
                      : "Required";

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSubtab(section.id)}
                    className={`relative min-w-[200px] rounded-xl px-4 py-2.5 text-left text-neutral-900 transition-all ${
                      isActive
                        ? "bg-neutral-50 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                        : "bg-transparent"
                    }`}
                    aria-selected={isActive}
                    role="tab"
                  >
                    {isActive && (
                      <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-neutral-900" />
                    )}
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          isActive
                            ? "bg-neutral-900 text-white"
                            : "bg-white text-neutral-500"
                        }`}
                      >
                        {section.index}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-5">
                          {section.title}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {status}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {activeSubtab === "configs" && (
              <div
                className="rounded-2xl border border-neutral-200 bg-white p-4"
                role="tabpanel"
              >
                {configs.length > 0 && (
                  <div className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-neutral-900">
                        Selected behavior
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {configs.map((config) => (
                        <SelectionChip
                          key={`${config.config_id}-${config.config_version}`}
                          config={config}
                          onRemove={removeSelection}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-4 inline-flex items-center gap-0 rounded-full bg-neutral-50 p-1">
                  <button
                    type="button"
                    onClick={() => setMode("existing")}
                    className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                      mode === "existing"
                        ? "bg-neutral-900 text-white"
                        : "bg-transparent text-neutral-500"
                    }`}
                  >
                    Saved
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("create")}
                    className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                      mode === "create"
                        ? "bg-neutral-900 text-white"
                        : "bg-transparent text-neutral-500"
                    }`}
                  >
                    New
                  </button>
                </div>

                {mode === "existing" ? (
                  <div className="space-y-5">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Choose behavior
                    </h3>

                    <div>
                      <div className="mb-5">
                        <input
                          value={searchQuery}
                          onChange={(event) =>
                            setSearchQuery(event.target.value)
                          }
                          placeholder="Search behaviors..."
                          className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none"
                        />
                      </div>

                      {isLoadingConfigs ? (
                        <div className="py-12 text-center text-sm text-neutral-500">
                          Loading behaviors...
                        </div>
                      ) : configError ? (
                        <div className="py-12 text-center text-sm text-red-600">
                          {configError}
                        </div>
                      ) : filteredConfigCards.length === 0 ? (
                        <div className="py-12 text-center text-sm text-neutral-500">
                          No saved behaviors found.
                        </div>
                      ) : (
                        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {filteredConfigCards.map((config) => {
                            const versions =
                              versionStateByConfig[config.id] ||
                              buildInitialVersionState();
                            const latestVersion =
                              versions.items.reduce<number>(
                                (maxVersion, item) =>
                                  item.version > maxVersion
                                    ? item.version
                                    : maxVersion,
                                0,
                              ) || 1;
                            const isExpanded = expandedConfigId === config.id;
                            const selectedVersions = selectedCountForConfig(
                              config.id,
                            );
                            const defaultSelected = isSelected(
                              config.id,
                              latestVersion,
                            );
                            const defaultLoading =
                              loadingSelectionKeys[
                                `${config.id}:${latestVersion}`
                              ];
                            const knownVersionCount = versions.items.length;
                            const hasVersionsPanel =
                              knownVersionCount > 0 ||
                              versions.hasMore ||
                              versions.isLoading ||
                              Boolean(versions.error);
                            const previewVersions = versions.items.slice(0, 3);
                            const versionCountLabel =
                              knownVersionCount > 0
                                ? `${knownVersionCount}${versions.hasMore ? "+" : ""}`
                                : "Check";

                            return (
                              <div
                                key={config.id}
                                className={`self-start rounded-2xl border bg-white transition-shadow ${
                                  isExpanded
                                    ? "border-neutral-900 shadow-[0_10px_22px_rgba(23,23,23,0.07)]"
                                    : "border-neutral-200 shadow-[0_1px_2px_rgba(23,23,23,0.03)]"
                                }`}
                              >
                                <button
                                  onClick={() =>
                                    toggleConfigExpansion(config.id)
                                  }
                                  className="cursor-pointer w-full rounded-2xl p-4 text-left"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <h4 className="truncate text-base font-semibold text-neutral-900">
                                        {config.name}
                                      </h4>
                                      <div className="mt-1 text-xs text-neutral-500">
                                        {formatRelativeTime(config.updated_at)}
                                      </div>
                                    </div>
                                    {selectedVersions > 0 && (
                                      <span className="rounded-full bg-neutral-900/5 px-2.5 py-1 text-[11px] font-medium text-neutral-900">
                                        In use
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-3 text-sm leading-6 text-neutral-500">
                                    {config.description ||
                                      "No description provided for this configuration."}
                                  </p>
                                </button>

                                <div className="px-4 pb-4 pt-1">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void toggleVersionSelection(
                                          config,
                                          latestVersion,
                                        );
                                      }}
                                      disabled={Boolean(defaultLoading)}
                                      className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium ${
                                        defaultSelected
                                          ? "border-neutral-200 bg-neutral-50 text-neutral-900"
                                          : "border-neutral-900 bg-neutral-900 text-white"
                                      } ${defaultLoading ? "cursor-progress" : "cursor-pointer"}`}
                                    >
                                      {defaultLoading
                                        ? "Working..."
                                        : defaultSelected
                                          ? "Added"
                                          : "Use this behavior"}
                                    </button>
                                  </div>
                                  {hasVersionsPanel && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleConfigExpansion(config.id)
                                      }
                                      aria-label={
                                        isExpanded
                                          ? "Hide saved versions"
                                          : "View saved versions"
                                      }
                                      className={`mt-2 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-neutral-900 transition-colors ${
                                        isExpanded
                                          ? "border-neutral-900 bg-neutral-50"
                                          : "border-neutral-200 bg-white"
                                      }`}
                                    >
                                      <div className="relative h-7 w-9 shrink-0">
                                        <span className="absolute inset-x-1 top-0 h-4 rounded-md border border-neutral-200 bg-white opacity-65" />
                                        <span
                                          className={`absolute inset-x-0 top-1.5 h-4 rounded-md border bg-neutral-50 ${
                                            isExpanded
                                              ? "border-neutral-900"
                                              : "border-neutral-200"
                                          }`}
                                        />
                                      </div>

                                      <div className="flex min-w-0 flex-1 items-center gap-2">
                                        <div className="flex items-center -space-x-1.5">
                                          {previewVersions.length > 0
                                            ? previewVersions.map((version) => (
                                                <span
                                                  key={version.id}
                                                  className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-neutral-200 bg-white px-1.5 text-[10px] font-semibold text-neutral-500"
                                                >
                                                  v{version.version}
                                                </span>
                                              ))
                                            : null}
                                        </div>
                                        <span className="text-xs font-semibold">
                                          {isExpanded
                                            ? "Hide versions"
                                            : "View more versions"}
                                        </span>
                                        <span
                                          className={`rounded-full px-2 py-1 text-[10px] font-semibold text-neutral-500 ${
                                            isExpanded
                                              ? "bg-neutral-900/10"
                                              : "bg-neutral-50"
                                          }`}
                                        >
                                          {versionCountLabel}
                                        </span>
                                      </div>

                                      <span
                                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white ${
                                          isExpanded
                                            ? "border-neutral-900"
                                            : "border-neutral-200"
                                        }`}
                                      >
                                        <ChevronDownIcon
                                          className={`h-3.5 w-3.5 transition-transform duration-300 ease-in-out ${
                                            isExpanded
                                              ? "rotate-180"
                                              : "rotate-0"
                                          }`}
                                        />
                                      </span>
                                    </button>
                                  )}
                                </div>

                                {hasVersionsPanel && (
                                  <div
                                    className={`overflow-hidden border-t border-neutral-200 bg-neutral-50 transition-all duration-300 ease-in-out ${
                                      isExpanded
                                        ? "pointer-events-auto max-h-[30rem] opacity-100"
                                        : "pointer-events-none max-h-0 opacity-0"
                                    }`}
                                  >
                                    <div className="px-4 pb-4 pt-3">
                                      <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                          <div className="text-sm font-semibold text-neutral-900">
                                            Other versions
                                          </div>
                                          <div className="mt-0.5 text-[11px] text-neutral-500">
                                            Choose a different saved version for
                                            this behavior.
                                          </div>
                                        </div>
                                        <button
                                          onClick={() =>
                                            void loadVersions(config.id, true)
                                          }
                                          className="cursor-pointer text-xs font-medium text-neutral-500"
                                        >
                                          Refresh
                                        </button>
                                      </div>

                                      {versions.error ? (
                                        <div className="rounded-xl border border-neutral-200 px-3 py-4 text-sm text-red-600">
                                          {versions.error}
                                        </div>
                                      ) : versions.items.length === 0 &&
                                        versions.isLoading ? (
                                        <div className="rounded-xl border border-neutral-200 px-3 py-4 text-sm text-neutral-500">
                                          Loading versions...
                                        </div>
                                      ) : (
                                        <div className="max-h-64 space-y-2 overflow-auto pr-1">
                                          {versions.items.map((version) => {
                                            const selected = isSelected(
                                              config.id,
                                              version.version,
                                            );
                                            const selectionKey = `${config.id}:${version.version}`;
                                            const isSelecting =
                                              loadingSelectionKeys[
                                                selectionKey
                                              ];

                                            return (
                                              <div
                                                key={version.id}
                                                className={`rounded-xl border bg-white px-3 py-2.5 ${
                                                  selected
                                                    ? "border-neutral-900"
                                                    : "border-neutral-200"
                                                }`}
                                              >
                                                <div className="flex items-center justify-between gap-3">
                                                  <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-neutral-900">
                                                      Version {version.version}
                                                    </div>
                                                    <div className="mt-0.5 text-xs leading-5 text-neutral-500">
                                                      {version.commit_message ||
                                                        config.name}
                                                    </div>
                                                    <div className="mt-1 text-[11px] text-neutral-500">
                                                      {formatRelativeTime(
                                                        version.updated_at,
                                                      )}
                                                    </div>
                                                  </div>
                                                  <button
                                                    onClick={() =>
                                                      void toggleVersionSelection(
                                                        config,
                                                        version.version,
                                                      )
                                                    }
                                                    disabled={Boolean(
                                                      isSelecting,
                                                    )}
                                                    className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-medium ${
                                                      selected
                                                        ? "border-neutral-200 bg-neutral-50 text-neutral-900"
                                                        : "border-neutral-900 bg-neutral-900 text-white"
                                                    } ${
                                                      isSelecting
                                                        ? "cursor-progress"
                                                        : "cursor-pointer"
                                                    }`}
                                                  >
                                                    {isSelecting
                                                      ? "Working..."
                                                      : selected
                                                        ? "Remove"
                                                        : "Select"}
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })}

                                          {versions.hasMore && (
                                            <button
                                              onClick={() =>
                                                void loadVersions(
                                                  config.id,
                                                  false,
                                                )
                                              }
                                              disabled={versions.isLoading}
                                              className="w-full cursor-pointer rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900"
                                            >
                                              {versions.isLoading
                                                ? "Loading more versions..."
                                                : "Load more versions"}
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div ref={loadMoreRef} className="h-2 w-full" />

                      {isLoadingMoreConfigs && (
                        <div className="pt-4 text-center text-sm text-neutral-500">
                          Loading more behaviors...
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_1px_minmax(24rem,0.95fr)] lg:gap-5">
                      <div>
                        <div>
                          <div className="mb-3">
                            <h4 className="text-sm font-semibold text-neutral-900">
                              Instructions
                            </h4>
                          </div>
                          <textarea
                            value={String(draftParams.instructions || "")}
                            onChange={(event) =>
                              updateDraftParam(
                                "instructions",
                                event.target.value,
                              )
                            }
                            placeholder="Tell the AI how it should respond"
                            className="min-h-[28rem] w-full rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm leading-6 text-neutral-900 outline-none"
                          />
                        </div>
                      </div>

                      <div className="hidden bg-neutral-200 lg:block" />

                      <div className="space-y-8">
                        <div>
                          <h4 className="mb-4 text-sm font-semibold text-neutral-900">
                            Basics
                          </h4>
                          <div className="space-y-4">
                            <div>
                              <label className="mb-2 block text-xs font-semibold text-neutral-900">
                                Ai Configuration name
                              </label>
                              <input
                                value={configName}
                                onChange={(event) =>
                                  setConfigName(event.target.value)
                                }
                                placeholder="e.g. Helpful grader"
                                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none"
                              />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-xs font-semibold text-neutral-900">
                                  AI service
                                </label>
                                <select
                                  value={draft.completion.provider}
                                  onChange={(event) => {
                                    const provider = event.target
                                      .value as "openai";
                                    const defaultModel =
                                      getDefaultModelForProvider(provider);
                                    setDraft((prev) => ({
                                      ...prev,
                                      completion: {
                                        ...prev.completion,
                                        provider,
                                        params: {
                                          instructions: String(
                                            prev.completion.params
                                              .instructions || "",
                                          ),
                                          model: defaultModel,
                                          ...buildDefaultParams(defaultModel),
                                        },
                                      },
                                    }));
                                  }}
                                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none"
                                >
                                  {PROVIDER_OPTIONS.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="mb-2 block text-xs font-semibold text-neutral-900">
                                  Model
                                </label>
                                <select
                                  value={currentModel}
                                  onChange={(event) =>
                                    handleModelChange(event.target.value)
                                  }
                                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none"
                                >
                                  {providerModels.map((model) => (
                                    <option
                                      key={model.value}
                                      value={model.value}
                                    >
                                      {model.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        <details className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                          <summary className="cursor-pointer text-sm font-semibold text-neutral-900">
                            Advanced settings
                          </summary>
                          <div className="mt-4">
                            {Object.entries(currentParamDefs).map(
                              ([paramKey, definition]) => (
                                <div
                                  key={paramKey}
                                  className="border-b border-neutral-200 py-4 last:border-b-0"
                                >
                                  <div className="mb-3 flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-sm font-semibold text-neutral-900">
                                        {paramKey}
                                      </div>
                                      <div className="mt-1 text-xs leading-5 text-neutral-500">
                                        {definition.description}
                                      </div>
                                    </div>
                                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-neutral-500">
                                      default {String(definition.default)}
                                    </span>
                                  </div>
                                  {renderParamControl(paramKey, definition)}
                                </div>
                              ),
                            )}
                          </div>
                        </details>

                        <div>
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-neutral-900">
                              Save behavior
                            </h4>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="mb-2 block text-xs font-semibold text-neutral-900">
                                Save note
                              </label>
                              <input
                                value={commitMessage}
                                onChange={(event) =>
                                  setCommitMessage(event.target.value)
                                }
                                placeholder="Optional"
                                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none"
                              />
                            </div>

                            <div className="rounded-xl bg-neutral-50 p-3">
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                                Summary
                              </div>
                              <div className="mt-3 space-y-1.5 text-sm">
                                <div className="text-neutral-900">
                                  {configName.trim() || "Unnamed configuration"}
                                </div>
                                <div className="text-neutral-500">
                                  {draft.completion.provider}/{currentModel}
                                </div>
                                <div className="text-neutral-500">
                                  {Object.keys(currentParamDefs).length}{" "}
                                  parameter
                                  {Object.keys(currentParamDefs).length === 1
                                    ? ""
                                    : "s"}{" "}
                                  configured
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => void handleCreateAndAdd()}
                              disabled={isSaving || !configName.trim()}
                              className={`w-full rounded-2xl border px-4 py-3 text-sm font-semibold ${
                                isSaving || !configName.trim()
                                  ? "cursor-not-allowed border-neutral-200 bg-white text-neutral-500"
                                  : "cursor-pointer border-neutral-900 bg-neutral-900 text-white"
                              }`}
                            >
                              {isSaving
                                ? "Saving behavior..."
                                : "Save behavior"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSubtab === "schema" && (
              <div
                className="rounded-2xl border border-neutral-200 bg-white p-6"
                role="tabpanel"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Response format
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500">
                      {hasConfiguredResponseFormat
                        ? `${namedSchemaCount} field(s) defined`
                        : "No schema defined. Response format is required."}
                    </p>
                  </div>
                  <button
                    onClick={() => setSchemaModalOpen(true)}
                    className="cursor-pointer rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
                  >
                    {hasConfiguredResponseFormat
                      ? "Edit schema"
                      : "Define schema"}
                  </button>
                </div>

                {hasConfiguredResponseFormat && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {outputSchema
                      .filter((p) => p.name.trim())
                      .map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-900"
                        >
                          <span className="font-medium">{p.name}</span>
                          <span className="text-neutral-500">
                            {p.type}
                            {p.isArray ? "[]" : ""}
                          </span>
                        </span>
                      ))}
                  </div>
                )}

                <OutputSchemaModal
                  open={schemaModalOpen}
                  onClose={() => setSchemaModalOpen(false)}
                  schema={outputSchema}
                  setSchema={setOutputSchema}
                />
              </div>
            )}
          </div>
        </div>
        {/* end space-y-6 content wrapper */}
      </div>

      <div className="mt-auto sticky bottom-0 z-10 border-t border-neutral-200 bg-neutral-50 py-2">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6">
          <button
            onClick={
              activeSubtab === "schema"
                ? () => setActiveSubtab("configs")
                : onBack
            }
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-6 py-2.5 text-sm font-medium text-neutral-900"
          >
            <ChevronLeftIcon className="w-3.5 h-3.5" />
            Back
          </button>

          <div className="flex items-center gap-3">
            {activeSubtab === "schema" && !canFinishFromSchema && (
              <span className="text-xs text-neutral-500">
                {schemaBlockerMessage}
              </span>
            )}
            <button
              onClick={
                activeSubtab === "configs"
                  ? () => setActiveSubtab("schema")
                  : onNext
              }
              disabled={activeSubtab === "schema" && !canFinishFromSchema}
              className={`rounded-lg border px-6 py-2.5 text-sm font-medium ${
                activeSubtab === "configs" || canFinishFromSchema
                  ? "cursor-pointer border-neutral-900 bg-neutral-900 text-white"
                  : "cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-500"
              }`}
            >
              {activeSubtab === "configs"
                ? "Next: Response Format"
                : "Next: Review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
