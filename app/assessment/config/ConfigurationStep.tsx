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
import { colors } from "@/app/lib/colors";
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
    <div
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
      style={{
        borderColor: colors.accent.primary,
        backgroundColor: "rgba(23, 23, 23, 0.05)",
      }}
    >
      <span
        className="text-sm font-medium"
        style={{ color: colors.text.primary }}
      >
        {config.name}
      </span>
      <span className="text-xs" style={{ color: colors.text.secondary }}>
        v{config.config_version}{" "}
        {config.provider && config.model
          ? `• ${config.provider}/${config.model}`
          : ""}
      </span>
      <button
        onClick={() => onRemove(config.config_id, config.config_version)}
        className="cursor-pointer rounded-full p-0.5"
        style={{ color: colors.text.secondary }}
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
            className="h-2 w-full cursor-pointer appearance-none rounded-full"
            style={{
              background: `linear-gradient(to right, ${colors.accent.primary} 0%, ${colors.accent.primary} ${((value - min) / (max - min || 1)) * 100}%, ${colors.border} ${((value - min) / (max - min || 1)) * 100}%, ${colors.border} 100%)`,
            }}
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
            className="w-24 rounded-xl border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.bg.primary,
              color: colors.text.primary,
            }}
          />
        </div>
        <div
          className="flex items-center justify-between text-[11px]"
          style={{ color: colors.text.secondary }}
        >
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
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{
            borderColor: colors.border,
            backgroundColor: colors.bg.primary,
            color: colors.text.primary,
          }}
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
    <div className="mx-auto flex min-h-full max-w-7xl flex-col">
      <div className="flex-1 space-y-6 pb-4">
        <div>
          <h2
            className="text-lg font-semibold"
            style={{ color: colors.text.primary }}
          >
            Configuration
          </h2>
        </div>

        <div className="space-y-4">
          <div
            className="flex items-center gap-1 overflow-x-auto rounded-2xl border p-1"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.bg.primary,
            }}
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
                  className="relative min-w-[200px] rounded-xl px-4 py-2.5 text-left transition-all"
                  style={{
                    backgroundColor: isActive
                      ? colors.bg.secondary
                      : "transparent",
                    color: colors.text.primary,
                    boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  }}
                  aria-selected={isActive}
                  role="tab"
                >
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                      style={{ backgroundColor: colors.accent.primary }}
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{
                        backgroundColor: isActive
                          ? colors.accent.primary
                          : colors.bg.primary,
                        color: isActive ? "#ffffff" : colors.text.secondary,
                      }}
                    >
                      {section.index}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-5">
                        {section.title}
                      </div>
                      <div
                        className="text-[11px]"
                        style={{ color: colors.text.secondary }}
                      >
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
              className="rounded-2xl border p-4"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.bg.primary,
              }}
              role="tabpanel"
            >
              {configs.length > 0 && (
                <div
                  className="mb-4 rounded-2xl border p-3"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.bg.secondary,
                  }}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: colors.text.primary }}
                    >
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

              <div
                className="mb-4 inline-flex items-center gap-0 rounded-full p-1"
                style={{ backgroundColor: colors.bg.secondary }}
              >
                <button
                  type="button"
                  onClick={() => setMode("existing")}
                  className="cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all"
                  style={{
                    backgroundColor:
                      mode === "existing" ? "#171717" : "transparent",
                    color:
                      mode === "existing" ? "#ffffff" : colors.text.secondary,
                  }}
                >
                  Saved
                </button>
                <button
                  type="button"
                  onClick={() => setMode("create")}
                  className="cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-all"
                  style={{
                    backgroundColor:
                      mode === "create" ? "#171717" : "transparent",
                    color:
                      mode === "create" ? "#ffffff" : colors.text.secondary,
                  }}
                >
                  New
                </button>
              </div>

              {mode === "existing" ? (
                <div className="space-y-5">
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: colors.text.primary }}
                  >
                    Choose behavior
                  </h3>

                  <div>
                    <div className="mb-5">
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search behaviors..."
                        className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                        style={{
                          borderColor: colors.border,
                          backgroundColor: colors.bg.secondary,
                          color: colors.text.primary,
                        }}
                      />
                    </div>

                    {isLoadingConfigs ? (
                      <div
                        className="py-12 text-center text-sm"
                        style={{ color: colors.text.secondary }}
                      >
                        Loading behaviors...
                      </div>
                    ) : configError ? (
                      <div
                        className="py-12 text-center text-sm"
                        style={{ color: colors.status.error }}
                      >
                        {configError}
                      </div>
                    ) : filteredConfigCards.length === 0 ? (
                      <div
                        className="py-12 text-center text-sm"
                        style={{ color: colors.text.secondary }}
                      >
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
                              className="self-start rounded-2xl border transition-shadow"
                              style={{
                                borderColor: isExpanded
                                  ? colors.accent.primary
                                  : colors.border,
                                backgroundColor: colors.bg.primary,
                                boxShadow: isExpanded
                                  ? "0 10px 22px rgba(23, 23, 23, 0.07)"
                                  : "0 1px 2px rgba(23, 23, 23, 0.03)",
                              }}
                            >
                              <button
                                onClick={() => toggleConfigExpansion(config.id)}
                                className="cursor-pointer w-full rounded-2xl p-4 text-left"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h4
                                      className="truncate text-base font-semibold"
                                      style={{ color: colors.text.primary }}
                                    >
                                      {config.name}
                                    </h4>
                                    <div
                                      className="mt-1 text-xs"
                                      style={{ color: colors.text.secondary }}
                                    >
                                      {formatRelativeTime(config.updated_at)}
                                    </div>
                                  </div>
                                  {selectedVersions > 0 && (
                                    <span
                                      className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                                      style={{
                                        backgroundColor:
                                          "rgba(23, 23, 23, 0.06)",
                                        color: colors.text.primary,
                                      }}
                                    >
                                      In use
                                    </span>
                                  )}
                                </div>

                                <p
                                  className="mt-3 text-sm leading-6"
                                  style={{ color: colors.text.secondary }}
                                >
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
                                    className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium"
                                    style={{
                                      backgroundColor: defaultSelected
                                        ? colors.bg.secondary
                                        : colors.accent.primary,
                                      color: defaultSelected
                                        ? colors.text.primary
                                        : "#ffffff",
                                      border: `1px solid ${defaultSelected ? colors.border : colors.accent.primary}`,
                                      cursor: defaultLoading
                                        ? "progress"
                                        : "pointer",
                                    }}
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
                                    className="mt-2 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors"
                                    style={{
                                      borderColor: isExpanded
                                        ? colors.accent.primary
                                        : colors.border,
                                      backgroundColor: isExpanded
                                        ? colors.bg.secondary
                                        : colors.bg.primary,
                                      color: colors.text.primary,
                                    }}
                                  >
                                    <div className="relative h-7 w-9 shrink-0">
                                      <span
                                        className="absolute inset-x-1 top-0 h-4 rounded-md border"
                                        style={{
                                          borderColor: colors.border,
                                          backgroundColor: colors.bg.primary,
                                          opacity: 0.65,
                                        }}
                                      />
                                      <span
                                        className="absolute inset-x-0 top-1.5 h-4 rounded-md border"
                                        style={{
                                          borderColor: isExpanded
                                            ? colors.accent.primary
                                            : colors.border,
                                          backgroundColor: colors.bg.secondary,
                                        }}
                                      />
                                    </div>

                                    <div className="flex min-w-0 flex-1 items-center gap-2">
                                      <div className="flex items-center -space-x-1.5">
                                        {previewVersions.length > 0
                                          ? previewVersions.map((version) => (
                                              <span
                                                key={version.id}
                                                className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-1.5 text-[10px] font-semibold"
                                                style={{
                                                  borderColor: colors.border,
                                                  backgroundColor:
                                                    colors.bg.primary,
                                                  color: colors.text.secondary,
                                                }}
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
                                        className="rounded-full px-2 py-1 text-[10px] font-semibold"
                                        style={{
                                          backgroundColor: isExpanded
                                            ? "rgba(23, 23, 23, 0.08)"
                                            : colors.bg.secondary,
                                          color: colors.text.secondary,
                                        }}
                                      >
                                        {versionCountLabel}
                                      </span>
                                    </div>

                                    <span
                                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
                                      style={{
                                        borderColor: isExpanded
                                          ? colors.accent.primary
                                          : colors.border,
                                        backgroundColor: colors.bg.primary,
                                      }}
                                    >
                                      <ChevronDownIcon
                                        className="h-3.5 w-3.5 transition-transform duration-300 ease-in-out"
                                        style={{
                                          transform: isExpanded
                                            ? "rotate(180deg)"
                                            : "rotate(0deg)",
                                        }}
                                      />
                                    </span>
                                  </button>
                                )}
                              </div>

                              {hasVersionsPanel && (
                                <div
                                  className={`overflow-hidden border-t transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[30rem] opacity-100" : "max-h-0 opacity-0"}`}
                                  style={{
                                    borderColor: colors.border,
                                    backgroundColor: colors.bg.secondary,
                                    pointerEvents: isExpanded ? "auto" : "none",
                                  }}
                                >
                                  <div className="px-4 pb-4 pt-3">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                      <div>
                                        <div
                                          className="text-sm font-semibold"
                                          style={{ color: colors.text.primary }}
                                        >
                                          Other versions
                                        </div>
                                        <div
                                          className="mt-0.5 text-[11px]"
                                          style={{
                                            color: colors.text.secondary,
                                          }}
                                        >
                                          Choose a different saved version for
                                          this behavior.
                                        </div>
                                      </div>
                                      <button
                                        onClick={() =>
                                          void loadVersions(config.id, true)
                                        }
                                        className="cursor-pointer text-xs font-medium"
                                        style={{ color: colors.text.secondary }}
                                      >
                                        Refresh
                                      </button>
                                    </div>

                                    {versions.error ? (
                                      <div
                                        className="rounded-xl border px-3 py-4 text-sm"
                                        style={{
                                          borderColor: colors.border,
                                          color: colors.status.error,
                                        }}
                                      >
                                        {versions.error}
                                      </div>
                                    ) : versions.items.length === 0 &&
                                      versions.isLoading ? (
                                      <div
                                        className="rounded-xl border px-3 py-4 text-sm"
                                        style={{
                                          borderColor: colors.border,
                                          color: colors.text.secondary,
                                        }}
                                      >
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
                                            loadingSelectionKeys[selectionKey];

                                          return (
                                            <div
                                              key={version.id}
                                              className="rounded-xl border px-3 py-2.5"
                                              style={{
                                                borderColor: selected
                                                  ? colors.accent.primary
                                                  : colors.border,
                                                backgroundColor:
                                                  colors.bg.primary,
                                              }}
                                            >
                                              <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                  <div
                                                    className="text-sm font-semibold"
                                                    style={{
                                                      color:
                                                        colors.text.primary,
                                                    }}
                                                  >
                                                    Version {version.version}
                                                  </div>
                                                  <div
                                                    className="mt-0.5 text-xs leading-5"
                                                    style={{
                                                      color:
                                                        colors.text.secondary,
                                                    }}
                                                  >
                                                    {version.commit_message ||
                                                      config.name}
                                                  </div>
                                                  <div
                                                    className="mt-1 text-[11px]"
                                                    style={{
                                                      color:
                                                        colors.text.secondary,
                                                    }}
                                                  >
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
                                                  className="shrink-0 rounded-xl px-3 py-2 text-xs font-medium"
                                                  style={{
                                                    backgroundColor: selected
                                                      ? colors.bg.secondary
                                                      : colors.accent.primary,
                                                    color: selected
                                                      ? colors.text.primary
                                                      : "#ffffff",
                                                    border: `1px solid ${selected ? colors.border : colors.accent.primary}`,
                                                    cursor: isSelecting
                                                      ? "progress"
                                                      : "pointer",
                                                  }}
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
                                            className="cursor-pointer w-full rounded-xl border px-4 py-2.5 text-sm font-medium"
                                            style={{
                                              borderColor: colors.border,
                                              backgroundColor:
                                                colors.bg.primary,
                                              color: colors.text.primary,
                                            }}
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
                      <div
                        className="pt-4 text-center text-sm"
                        style={{ color: colors.text.secondary }}
                      >
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
                          <h4
                            className="text-sm font-semibold"
                            style={{ color: colors.text.primary }}
                          >
                            Instructions
                          </h4>
                        </div>
                        <textarea
                          value={String(draftParams.instructions || "")}
                          onChange={(event) =>
                            updateDraftParam("instructions", event.target.value)
                          }
                          placeholder="Tell the AI how it should respond"
                          className="min-h-[28rem] w-full rounded-2xl border px-4 py-4 text-sm leading-6 outline-none"
                          style={{
                            borderColor: colors.border,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        />
                      </div>
                    </div>

                    <div
                      className="hidden lg:block"
                      style={{ backgroundColor: colors.border }}
                    />

                    <div className="space-y-8">
                      <div>
                        <h4
                          className="mb-4 text-sm font-semibold"
                          style={{ color: colors.text.primary }}
                        >
                          Basics
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label
                              className="mb-2 block text-xs font-semibold"
                              style={{ color: colors.text.primary }}
                            >
                              Ai Configuration name
                            </label>
                            <input
                              value={configName}
                              onChange={(event) =>
                                setConfigName(event.target.value)
                              }
                              placeholder="e.g. Helpful grader"
                              className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                              style={{
                                borderColor: colors.border,
                                backgroundColor: colors.bg.primary,
                                color: colors.text.primary,
                              }}
                            />
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label
                                className="mb-2 block text-xs font-semibold"
                                style={{ color: colors.text.primary }}
                              >
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
                                          prev.completion.params.instructions ||
                                            "",
                                        ),
                                        model: defaultModel,
                                        ...buildDefaultParams(defaultModel),
                                      },
                                    },
                                  }));
                                }}
                                className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                                style={{
                                  borderColor: colors.border,
                                  backgroundColor: colors.bg.primary,
                                  color: colors.text.primary,
                                }}
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
                              <label
                                className="mb-2 block text-xs font-semibold"
                                style={{ color: colors.text.primary }}
                              >
                                Model
                              </label>
                              <select
                                value={currentModel}
                                onChange={(event) =>
                                  handleModelChange(event.target.value)
                                }
                                className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                                style={{
                                  borderColor: colors.border,
                                  backgroundColor: colors.bg.primary,
                                  color: colors.text.primary,
                                }}
                              >
                                {providerModels.map((model) => (
                                  <option key={model.value} value={model.value}>
                                    {model.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <details
                        className="rounded-2xl border px-4 py-3"
                        style={{
                          borderColor: colors.border,
                          backgroundColor: colors.bg.secondary,
                        }}
                      >
                        <summary
                          className="cursor-pointer text-sm font-semibold"
                          style={{ color: colors.text.primary }}
                        >
                          Advanced settings
                        </summary>
                        <div className="mt-4">
                          {Object.entries(currentParamDefs).map(
                            ([paramKey, definition]) => (
                              <div
                                key={paramKey}
                                className="border-b py-4 last:border-b-0"
                                style={{ borderColor: colors.border }}
                              >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                  <div>
                                    <div
                                      className="text-sm font-semibold"
                                      style={{ color: colors.text.primary }}
                                    >
                                      {paramKey}
                                    </div>
                                    <div
                                      className="mt-1 text-xs leading-5"
                                      style={{ color: colors.text.secondary }}
                                    >
                                      {definition.description}
                                    </div>
                                  </div>
                                  <span
                                    className="rounded-full px-2 py-0.5 text-[11px]"
                                    style={{
                                      backgroundColor: colors.bg.primary,
                                      color: colors.text.secondary,
                                    }}
                                  >
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
                          <h4
                            className="text-sm font-semibold"
                            style={{ color: colors.text.primary }}
                          >
                            Save behavior
                          </h4>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label
                              className="mb-2 block text-xs font-semibold"
                              style={{ color: colors.text.primary }}
                            >
                              Save note
                            </label>
                            <input
                              value={commitMessage}
                              onChange={(event) =>
                                setCommitMessage(event.target.value)
                              }
                              placeholder="Optional"
                              className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                              style={{
                                borderColor: colors.border,
                                backgroundColor: colors.bg.primary,
                                color: colors.text.primary,
                              }}
                            />
                          </div>

                          <div
                            className="rounded-xl p-3"
                            style={{ backgroundColor: colors.bg.secondary }}
                          >
                            <div
                              className="text-xs font-semibold uppercase tracking-[0.18em]"
                              style={{ color: colors.text.secondary }}
                            >
                              Summary
                            </div>
                            <div className="mt-3 space-y-1.5 text-sm">
                              <div style={{ color: colors.text.primary }}>
                                {configName.trim() || "Unnamed configuration"}
                              </div>
                              <div style={{ color: colors.text.secondary }}>
                                {draft.completion.provider}/{currentModel}
                              </div>
                              <div style={{ color: colors.text.secondary }}>
                                {Object.keys(currentParamDefs).length} parameter
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
                            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold"
                            style={{
                              backgroundColor:
                                isSaving || !configName.trim()
                                  ? colors.bg.primary
                                  : colors.accent.primary,
                              color:
                                isSaving || !configName.trim()
                                  ? colors.text.secondary
                                  : "#ffffff",
                              border: `1px solid ${isSaving || !configName.trim() ? colors.border : colors.accent.primary}`,
                              cursor:
                                isSaving || !configName.trim()
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            {isSaving ? "Saving behavior..." : "Save behavior"}
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
              className="rounded-2xl border p-6"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.bg.primary,
              }}
              role="tabpanel"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: colors.text.primary }}
                  >
                    Response format
                  </h3>
                  <p
                    className="text-xs mt-1"
                    style={{ color: colors.text.secondary }}
                  >
                    {hasConfiguredResponseFormat
                      ? `${namedSchemaCount} field(s) defined`
                      : "No schema defined. Response format is required."}
                  </p>
                </div>
                <button
                  onClick={() => setSchemaModalOpen(true)}
                  className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: colors.accent.primary,
                    color: "#fff",
                  }}
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
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
                        style={{
                          borderColor: colors.border,
                          color: colors.text.primary,
                        }}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span style={{ color: colors.text.secondary }}>
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

      <div
        className="sticky bottom-0 z-10 flex items-center justify-between border-t py-2"
        style={{
          backgroundColor: colors.bg.secondary,
          borderColor: colors.border,
          marginLeft: "-1.5rem",
          marginRight: "-1.5rem",
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        <button
          onClick={
            activeSubtab === "schema"
              ? () => setActiveSubtab("configs")
              : onBack
          }
          className="cursor-pointer rounded-lg border px-6 py-2.5 text-sm font-medium flex items-center gap-2"
          style={{
            borderColor: colors.border,
            color: colors.text.primary,
            backgroundColor: colors.bg.primary,
          }}
        >
          <ChevronLeftIcon className="w-3.5 h-3.5" />
          Back
        </button>

        <div className="flex items-center gap-3">
          {activeSubtab === "schema" && !canFinishFromSchema && (
            <span className="text-xs" style={{ color: colors.text.secondary }}>
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
            className="rounded-lg px-6 py-2.5 text-sm font-medium"
            style={{
              backgroundColor:
                activeSubtab === "configs" || canFinishFromSchema
                  ? colors.accent.primary
                  : colors.bg.secondary,
              color:
                activeSubtab === "configs" || canFinishFromSchema
                  ? "#ffffff"
                  : colors.text.secondary,
              cursor:
                activeSubtab === "schema" && !canFinishFromSchema
                  ? "not-allowed"
                  : "pointer",
              border: `1px solid ${activeSubtab === "configs" || canFinishFromSchema ? colors.accent.primary : colors.border}`,
            }}
          >
            {activeSubtab === "configs"
              ? "Next: Response Format"
              : "Next: Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
