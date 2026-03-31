"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/app/components/Toast';
import { colors } from '@/app/lib/colors';
import { ConfigBlob, ConfigPublic, ConfigVersionItems } from '@/app/lib/configTypes';
import { formatRelativeTime } from '@/app/lib/useConfigs';
import { ConfigSelection, MAX_CONFIGS } from '../types';
import {
  buildDefaultParams,
  ConfigParamDefinition,
  DEFAULT_CONFIG,
  getDefaultModelForProvider,
  getModelConfigDefinition,
  getModelsByProvider,
  PAGE_SIZE,
  PROVIDER_OPTIONS,
} from './constants';
import {
  fetchConfigPage,
  fetchConfigSelection,
  fetchConfigVersionsPage,
  invalidateAssessmentConfigCache,
  saveAssessmentConfig,
} from './api';

interface ConfigurationStepProps {
  configs: ConfigSelection[];
  setConfigs: (configs: ConfigSelection[]) => void;
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

type Mode = 'existing' | 'create';

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
        backgroundColor: 'rgba(23, 23, 23, 0.05)',
      }}
    >
      <span className="text-sm font-medium" style={{ color: colors.text.primary }}>
        {config.name}
      </span>
      <span className="text-xs" style={{ color: colors.text.secondary }}>
        v{config.config_version} {config.provider && config.model ? `• ${config.provider}/${config.model}` : ''}
      </span>
      <button
        onClick={() => onRemove(config.config_id, config.config_version)}
        className="cursor-pointer rounded-full p-0.5"
        style={{ color: colors.text.secondary }}
        aria-label={`Remove ${config.name || 'config'} version ${config.config_version}`}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function ConfigurationStep({
  configs,
  setConfigs,
  onNext,
  onBack,
}: ConfigurationStepProps) {
  const toast = useToast();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedInitialConfigsRef = useRef(false);

  const [mode, setMode] = useState<Mode>('existing');
  const [configCards, setConfigCards] = useState<ConfigPublic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);
  const [isLoadingMoreConfigs, setIsLoadingMoreConfigs] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [hasMoreConfigs, setHasMoreConfigs] = useState(true);
  const [nextConfigSkip, setNextConfigSkip] = useState(0);
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);
  const [versionStateByConfig, setVersionStateByConfig] = useState<Record<string, VersionListState>>({});
  const [loadingSelectionKeys, setLoadingSelectionKeys] = useState<Record<string, boolean>>({});

  const [draft, setDraft] = useState<ConfigBlob>(() => buildInitialDraft());
  const [configName, setConfigName] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const draftParams = draft.completion.params as Record<string, string | number | undefined>;
  const currentProvider = draft.completion.provider ?? 'openai';
  const providerModels = useMemo(() => getModelsByProvider(currentProvider), [currentProvider]);
  const currentModel = String(draftParams.model || providerModels[0]?.value);
  const currentParamDefs = useMemo(() => getModelConfigDefinition(currentModel), [currentModel]);

  const isSelected = useCallback(
    (configId: string, version: number) =>
      configs.some((item) => item.config_id === configId && item.config_version === version),
    [configs],
  );

  const selectedCountForConfig = useCallback(
    (configId: string) => configs.filter((item) => item.config_id === configId).length,
    [configs],
  );

  const filteredConfigCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return configCards;
    }

    return configCards.filter((config) => {
      const haystack = `${config.name} ${config.description || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [configCards, searchQuery]);

  const addSelection = useCallback((selection: ConfigSelection) => {
    const alreadySelected = configs.some(
      (item) =>
        item.config_id === selection.config_id &&
        item.config_version === selection.config_version,
    );
    if (alreadySelected) {
      toast.error('This configuration version is already selected');
      return;
    }

    if (configs.length >= MAX_CONFIGS) {
      toast.error(`You can select up to ${MAX_CONFIGS} configurations`);
      return;
    }

    setConfigs([...configs, selection]);
  }, [configs, setConfigs, toast]);

  const removeSelection = useCallback((configId: string, version: number) => {
    setConfigs(
      configs.filter(
        (item) => !(item.config_id === configId && item.config_version === version),
      ),
    );
  }, [configs, setConfigs]);

  const loadConfigPage = useCallback(async (reset: boolean) => {
    if (reset) {
      setIsLoadingConfigs(true);
      setConfigError(null);
    } else {
      if (isLoadingMoreConfigs || !hasMoreConfigs) return;
      setIsLoadingMoreConfigs(true);
    }

    try {
      const page = await fetchConfigPage({
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
        setExpandedConfigId((current) => current && page.items.some((item) => item.id === current) ? current : null);
      }
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Failed to load configurations');
    } finally {
      setIsLoadingConfigs(false);
      setIsLoadingMoreConfigs(false);
    }
  }, [hasMoreConfigs, isLoadingMoreConfigs, nextConfigSkip]);

  useEffect(() => {
    if (hasLoadedInitialConfigsRef.current) {
      return;
    }

    hasLoadedInitialConfigsRef.current = true;
    void loadConfigPage(true);
  }, [loadConfigPage]);

  useEffect(() => {
    if (mode !== 'existing') return undefined;
    if (!hasMoreConfigs || isLoadingConfigs || isLoadingMoreConfigs) return undefined;

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
        rootMargin: '320px 0px',
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMoreConfigs, isLoadingConfigs, isLoadingMoreConfigs, loadConfigPage, mode]);

  const loadVersions = useCallback(async (configId: string, reset: boolean) => {
    const currentState = versionStateByConfig[configId] || buildInitialVersionState();
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
      const page = await fetchConfigVersionsPage(configId, {
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
            items: Array.from(deduped.values()).sort((a, b) => b.version - a.version),
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
          error: error instanceof Error ? error.message : 'Failed to load versions',
        },
      }));
    }
  }, [versionStateByConfig]);

  const toggleConfigExpansion = useCallback((configId: string) => {
    setExpandedConfigId((current) => current === configId ? null : configId);

    const state = versionStateByConfig[configId];
    if (!state || state.items.length === 0) {
      void loadVersions(configId, true);
    }
  }, [loadVersions, versionStateByConfig]);

  const toggleVersionSelection = useCallback(async (
    config: ConfigPublic,
    versionNumber: number,
  ) => {
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
      const selection = await fetchConfigSelection(config, versionNumber);
      addSelection(selection);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to select configuration');
    } finally {
      setLoadingSelectionKeys((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }, [addSelection, configs.length, isSelected, removeSelection, toast]);

  const updateDraftParam = useCallback((key: string, value: string | number) => {
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
  }, []);

  const handleModelChange = useCallback((modelName: string) => {
    setDraft((prev) => ({
      ...prev,
      completion: {
        ...prev.completion,
        params: {
          instructions: String(prev.completion.params.instructions || ''),
          model: modelName,
          ...buildDefaultParams(modelName),
        },
      },
    }));
  }, []);

  const handleCreateAndAdd = useCallback(async () => {
    if (!configName.trim()) {
      toast.error('Configuration name is required');
      return;
    }

    if (configs.length >= MAX_CONFIGS) {
      toast.error(`You can select up to ${MAX_CONFIGS} configurations`);
      return;
    }

    setIsSaving(true);

    try {
      const saved = await saveAssessmentConfig({
        configName,
        commitMessage,
        configBlob: draft,
      });

      addSelection(saved);
      invalidateAssessmentConfigCache();
      setCommitMessage('');
      toast.success(`Configuration "${saved.name}" is ready to use`);
      void loadConfigPage(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  }, [addSelection, commitMessage, configName, configs.length, draft, loadConfigPage, toast]);

  const renderNumericParameter = (paramKey: string, definition: ConfigParamDefinition) => {
    const min = definition.min ?? 0;
    const max = definition.max ?? 100;
    const value = Number(draftParams[paramKey] ?? definition.default);
    const rangeStep = definition.type === 'float'
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
            onChange={(event) => updateDraftParam(
              paramKey,
              definition.type === 'float'
                ? parseFloat(event.target.value)
                : parseInt(event.target.value, 10),
            )}
            className="h-2 w-full cursor-pointer appearance-none rounded-full"
            style={{
              background: `linear-gradient(to right, ${colors.accent.primary} 0%, ${colors.accent.primary} ${((value - min) / (max - min || 1)) * 100}%, ${colors.border} ${((value - min) / (max - min || 1)) * 100}%, ${colors.border} 100%)`,
            }}
          />
          <input
            type="number"
            min={min}
            max={max}
            step={definition.type === 'float' ? '0.01' : '1'}
            value={String(value)}
            onChange={(event) => {
              const nextValue = definition.type === 'float'
                ? parseFloat(event.target.value)
                : parseInt(event.target.value, 10);
              updateDraftParam(paramKey, Number.isNaN(nextValue) ? definition.default : nextValue);
            }}
            className="w-24 rounded-xl border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.bg.primary,
              color: colors.text.primary,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px]" style={{ color: colors.text.secondary }}>
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    );
  };

  const renderParamControl = (paramKey: string, definition: ConfigParamDefinition) => {
    const value = draftParams[paramKey] ?? definition.default;

    if (definition.type === 'enum') {
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
    <div className="mx-auto flex min-h-full max-w-6xl flex-col">
      <div className="flex-1 space-y-6 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
            Configuration
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: colors.text.secondary }}>
            Select up to {MAX_CONFIGS} configs to compare in this run.
          </p>
        </div>
        <div
          className="rounded-full border px-3 py-1 text-xs font-medium"
          style={{
            borderColor: colors.border,
            backgroundColor: colors.bg.primary,
            color: colors.text.secondary,
          }}
        >
          {configs.length}/{MAX_CONFIGS} selected
        </div>
      </div>

      {configs.length > 0 && (
        <div
          className="rounded-2xl border p-4"
          style={{
            borderColor: colors.border,
            backgroundColor: colors.bg.primary,
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
              Selected for this assessment
            </h3>
            <span className="text-xs" style={{ color: colors.text.secondary }}>
              Mix versions from different configs
            </span>
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

      {mode === 'existing' ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                Saved configurations
              </h3>
            </div>
            <button
              onClick={() => setMode('create')}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: colors.accent.primary,
                color: '#ffffff',
              }}
            >
              Create Config
            </button>
          </div>

          <div>
            <div className="mb-5">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search configs..."
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.primary,
                }}
              />
            </div>

            {isLoadingConfigs ? (
              <div className="py-12 text-center text-sm" style={{ color: colors.text.secondary }}>
                Loading saved configurations...
              </div>
            ) : configError ? (
              <div className="py-12 text-center text-sm" style={{ color: colors.status.error }}>
                {configError}
              </div>
            ) : filteredConfigCards.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: colors.text.secondary }}>
                No saved configurations are visible yet for this search.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredConfigCards.map((config) => {
                  const versions = versionStateByConfig[config.id] || buildInitialVersionState();
                  const isExpanded = expandedConfigId === config.id;
                  const selectedVersions = selectedCountForConfig(config.id);
                  const defaultSelected = isSelected(config.id, 1);
                  const defaultLoading = loadingSelectionKeys[`${config.id}:1`];

                  return (
                    <div
                      key={config.id}
                      className="rounded-2xl border transition-shadow"
                      style={{
                        borderColor: isExpanded ? colors.accent.primary : colors.border,
                        backgroundColor: colors.bg.primary,
                        boxShadow: isExpanded ? '0 18px 48px rgba(23, 23, 23, 0.08)' : 'none',
                      }}
                    >
                      <button
                        onClick={() => toggleConfigExpansion(config.id)}
                        className="cursor-pointer w-full rounded-2xl p-5 text-left"
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: colors.text.secondary }}>
                              Config
                            </div>
                            <h4 className="mt-2 truncate text-base font-semibold" style={{ color: colors.text.primary }}>
                              {config.name}
                            </h4>
                          </div>
                          {selectedVersions > 0 && (
                            <span
                              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                              style={{
                                backgroundColor: 'rgba(23, 23, 23, 0.08)',
                                color: colors.text.primary,
                              }}
                            >
                              {selectedVersions} selected
                            </span>
                          )}
                        </div>

                        <p className="min-h-[3rem] text-sm leading-6" style={{ color: colors.text.secondary }}>
                          {config.description || 'No description provided for this configuration.'}
                        </p>

                        <div className="mt-4 flex items-center justify-between gap-3 text-xs" style={{ color: colors.text.secondary }}>
                          <span>{formatRelativeTime(config.updated_at)}</span>
                          <span>{config.id.slice(0, 8)}</span>
                        </div>
                      </button>

                      <div className="px-5 pb-5">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            void toggleVersionSelection(config, 1);
                          }}
                          disabled={Boolean(defaultLoading)}
                          className="w-full rounded-xl px-4 py-2.5 text-sm font-medium"
                          style={{
                            backgroundColor: defaultSelected ? colors.bg.secondary : colors.accent.primary,
                            color: defaultSelected ? colors.text.primary : '#ffffff',
                            border: `1px solid ${defaultSelected ? colors.border : colors.accent.primary}`,
                            cursor: defaultLoading ? 'progress' : 'pointer',
                          }}
                        >
                          {defaultLoading ? 'Working...' : defaultSelected ? 'Remove default v1' : 'Select config (default v1)'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div
                          className="border-t px-5 pb-5 pt-4"
                          style={{ borderColor: colors.border, backgroundColor: colors.bg.secondary }}
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                                Versions
                              </div>
                              </div>
                            <button
                              onClick={() => void loadVersions(config.id, true)}
                              className="cursor-pointer text-xs font-medium"
                              style={{ color: colors.text.secondary }}
                            >
                              Refresh
                            </button>
                          </div>

                          {versions.error ? (
                            <div className="rounded-xl border px-3 py-4 text-sm" style={{ borderColor: colors.border, color: colors.status.error }}>
                              {versions.error}
                            </div>
                          ) : versions.items.length === 0 && versions.isLoading ? (
                            <div className="rounded-xl border px-3 py-4 text-sm" style={{ borderColor: colors.border, color: colors.text.secondary }}>
                              Loading versions...
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {versions.items.map((version) => {
                                const selected = isSelected(config.id, version.version);
                                const selectionKey = `${config.id}:${version.version}`;
                                const isSelecting = loadingSelectionKeys[selectionKey];

                                return (
                                  <div
                                    key={version.id}
                                    className="rounded-xl border p-3"
                                    style={{
                                      borderColor: selected ? colors.accent.primary : colors.border,
                                      backgroundColor: colors.bg.primary,
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                                          Version {version.version}
                                        </div>
                                        <div className="mt-1 text-xs leading-5" style={{ color: colors.text.secondary }}>
                                          {version.commit_message || 'No commit message'}
                                        </div>
                                        <div className="mt-2 text-[11px]" style={{ color: colors.text.secondary }}>
                                          {formatRelativeTime(version.updated_at)}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => void toggleVersionSelection(config, version.version)}
                                        disabled={Boolean(isSelecting)}
                                        className="shrink-0 rounded-xl px-3 py-2 text-xs font-medium"
                                        style={{
                                          backgroundColor: selected ? colors.bg.secondary : colors.accent.primary,
                                          color: selected ? colors.text.primary : '#ffffff',
                                          border: `1px solid ${selected ? colors.border : colors.accent.primary}`,
                                          cursor: isSelecting ? 'progress' : 'pointer',
                                        }}
                                      >
                                        {isSelecting ? 'Working...' : selected ? 'Remove' : 'Select'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}

                              {versions.hasMore && (
                                <button
                                  onClick={() => void loadVersions(config.id, false)}
                                  disabled={versions.isLoading}
                                  className="cursor-pointer w-full rounded-xl border px-4 py-2.5 text-sm font-medium"
                                  style={{
                                    borderColor: colors.border,
                                    backgroundColor: colors.bg.primary,
                                    color: colors.text.primary,
                                  }}
                                >
                                  {versions.isLoading ? 'Loading more versions...' : 'Load more versions'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div ref={loadMoreRef} className="h-2 w-full" />

            {isLoadingMoreConfigs && (
              <div className="pt-4 text-center text-sm" style={{ color: colors.text.secondary }}>
                Loading more configurations...
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-6 flex items-center gap-2">
            <button
              onClick={() => setMode('existing')}
              className="cursor-pointer rounded-full border p-1.5"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.bg.secondary,
                color: colors.text.primary,
              }}
              aria-label="Back to saved configurations"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span
              onClick={() => setMode('existing')}
              className="cursor-pointer text-xm font-medium"
              style={{ color: colors.accent.primary }}
            >
              Select existing config
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_1px_minmax(22rem,0.95fr)] lg:gap-6">
            <div>
              <div>
                <div className="mb-3">
                  <h4 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                    System prompt
                  </h4>
                </div>
                <textarea
                  value={String(draftParams.instructions || '')}
                  onChange={(event) => updateDraftParam('instructions', event.target.value)}
                  placeholder="Write the system instructions for this assessment configuration"
                  className="min-h-[28rem] w-full rounded-2xl border px-4 py-4 text-sm leading-6 outline-none"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.bg.primary,
                    color: colors.text.primary,
                  }}
                />
              </div>
            </div>

            <div className="hidden lg:block" style={{ backgroundColor: colors.border }} />

            <div className="space-y-8">
              <div>
                <h4 className="mb-4 text-sm font-semibold" style={{ color: colors.text.primary }}>
                  Configuration details
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold" style={{ color: colors.text.primary }}>
                      Configuration name
                    </label>
                    <input
                      value={configName}
                      onChange={(event) => setConfigName(event.target.value)}
                      placeholder="e.g. assessment-gpt4o-balanced"
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
                      <label className="mb-2 block text-xs font-semibold" style={{ color: colors.text.primary }}>
                        Provider
                      </label>
                      <select
                        value={draft.completion.provider}
                        onChange={(event) => {
                          const provider = event.target.value as 'openai' | 'google';
                          const defaultModel = getDefaultModelForProvider(provider);
                          setDraft((prev) => ({
                            ...prev,
                            completion: {
                              ...prev.completion,
                              provider,
                              params: {
                                instructions: String(prev.completion.params.instructions || ''),
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
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold" style={{ color: colors.text.primary }}>
                        Model
                      </label>
                      <select
                        value={currentModel}
                        onChange={(event) => handleModelChange(event.target.value)}
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

              <div>
                <div className="mb-4">
                  <h4 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                    Model parameters
                  </h4>
                  <p className="mt-1 text-xs leading-5" style={{ color: colors.text.secondary }}>
                    Parameters are rendered from the selected model definition.
                  </p>
                </div>

                <div>
                  {Object.entries(currentParamDefs).map(([paramKey, definition]) => (
                    <div
                      key={paramKey}
                      className="border-b py-5 last:border-b-0"
                      style={{ borderColor: colors.border }}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                            {paramKey}
                          </div>
                          <div className="mt-1 text-xs leading-5" style={{ color: colors.text.secondary }}>
                            {definition.description}
                          </div>
                        </div>
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px]"
                          style={{
                            backgroundColor: colors.bg.secondary,
                            color: colors.text.secondary,
                          }}
                        >
                          default {String(definition.default)}
                        </span>
                      </div>
                      {renderParamControl(paramKey, definition)}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-4">
                  <h4 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                    Save and add
                  </h4>
                  <p className="mt-1 text-xs leading-5" style={{ color: colors.text.secondary }}>
                    This creates a reusable library config, then immediately adds that saved version to the assessment.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold" style={{ color: colors.text.primary }}>
                      Commit message
                    </label>
                    <input
                      value={commitMessage}
                      onChange={(event) => setCommitMessage(event.target.value)}
                      placeholder="Optional note for this saved version"
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
                    <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: colors.text.secondary }}>
                      Current draft
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm">
                      <div style={{ color: colors.text.primary }}>
                        {configName.trim() || 'Unnamed configuration'}
                      </div>
                      <div style={{ color: colors.text.secondary }}>
                        {draft.completion.provider}/{currentModel}
                      </div>
                      <div style={{ color: colors.text.secondary }}>
                        {Object.keys(currentParamDefs).length} parameter{Object.keys(currentParamDefs).length === 1 ? '' : 's'} configured
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => void handleCreateAndAdd()}
                    disabled={isSaving || !configName.trim()}
                    className="w-full rounded-2xl px-4 py-3 text-sm font-semibold"
                    style={{
                      backgroundColor: isSaving || !configName.trim() ? colors.bg.primary : colors.accent.primary,
                      color: isSaving || !configName.trim() ? colors.text.secondary : '#ffffff',
                      border: `1px solid ${isSaving || !configName.trim() ? colors.border : colors.accent.primary}`,
                      cursor: isSaving || !configName.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSaving ? 'Saving configuration...' : 'Save and add to assessment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>{/* end space-y-6 content wrapper */}

      <div
        className="sticky bottom-0 z-10 flex items-center justify-between border-t py-2"
        style={{
          backgroundColor: colors.bg.secondary,
          borderColor: colors.border,
          marginLeft: '-1.5rem',
          marginRight: '-1.5rem',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
        }}
      >
        <button
          onClick={onBack}
          className="cursor-pointer rounded-lg border px-6 py-2.5 text-sm font-medium flex items-center gap-2"
          style={{
            borderColor: colors.border,
            color: colors.text.primary,
            backgroundColor: colors.bg.primary,
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-3">
          {configs.length === 0 && (
            <span className="text-xs" style={{ color: colors.text.secondary }}>
              Select at least one configuration to continue
            </span>
          )}
          <button
            onClick={onNext}
            disabled={configs.length === 0}
            className="rounded-lg px-6 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: configs.length > 0 ? colors.accent.primary : colors.bg.secondary,
              color: configs.length > 0 ? '#ffffff' : colors.text.secondary,
              cursor: configs.length > 0 ? 'pointer' : 'not-allowed',
              border: `1px solid ${configs.length > 0 ? colors.accent.primary : colors.border}`,
            }}
          >
            Next: Output Schema
          </button>
        </div>
      </div>
    </div>
  );
}
