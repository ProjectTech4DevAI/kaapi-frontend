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
import { colors } from "@/app/lib/colors";
import {
  ConfigBlob,
  ConfigPublic,
  ConfigVersionItems,
} from "@/app/lib/types/configs";
import { formatRelativeTime } from "@/app/lib/utils";
import {
  MAX_CONFIGS,
  type ConfigSelection,
  type SchemaProperty,
} from "@/app/assessment/types";
import { OutputSchemaModal } from "./OutputSchemaStep";
import {
  buildDefaultParams,
  ConfigParamDefinition,
  DEFAULT_CONFIG,
  getDefaultModelForProvider,
  getModelConfigDefinition,
  getModelsByProvider,
  PAGE_SIZE,
  PROVIDER_OPTIONS,
} from "@/app/assessment/config/constants";
import {
  fetchConfigPage,
  fetchConfigSelection,
  fetchConfigVersionsPage,
  invalidateAssessmentConfigCache,
  saveAssessmentConfig,
} from "@/app/assessment/config/api";
import { useToast } from "@/app/components/Toast";

interface PromptAndConfigStepProps {
  apiKey: string;
  textColumns: string[];
  sampleRow: Record<string, string>;
  promptTemplate: string;
  setPromptTemplate: (template: string) => void;
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

type ConfigMode = "existing" | "create";

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

export default function PromptAndConfigStep({
  apiKey,
  textColumns,
  sampleRow,
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

  // ── Prompt editor state ──
  const [previewMode, setPreviewMode] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionPos, setMentionPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Config state ──
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

  // ── Create new config state ──
  const [draft, setDraft] = useState<ConfigBlob>(() => buildInitialDraft());
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

  // ── Schema modal ──
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);
  const [systemInstructionSheetOpen, setSystemInstructionSheetOpen] =
    useState(false);

  // ══════════════════════════════════════════════════════════
  // PROMPT EDITOR LOGIC
  // ══════════════════════════════════════════════════════════

  const mentionOptions = useMemo(() => {
    if (mentionQuery === null) return [];
    const normalized = mentionQuery.toLowerCase();
    return textColumns.filter((col) => col.toLowerCase().includes(normalized));
  }, [mentionQuery, textColumns]);

  const computeCaretPosition = useCallback(() => {
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!textarea || !mirror) return null;

    const style = window.getComputedStyle(textarea);
    [
      "font-family",
      "font-size",
      "font-weight",
      "line-height",
      "letter-spacing",
      "padding-top",
      "padding-left",
      "padding-right",
      "padding-bottom",
      "border-top-width",
      "border-left-width",
      "word-wrap",
      "overflow-wrap",
      "tab-size",
      "box-sizing",
    ].forEach((prop) => {
      mirror.style.setProperty(prop, style.getPropertyValue(prop));
    });
    mirror.style.width = `${textarea.clientWidth}px`;
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap = "break-word";
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.left = "0";
    mirror.style.top = "0";

    mirror.textContent = textarea.value.substring(0, textarea.selectionStart);
    const marker = document.createElement("span");
    marker.textContent = "\u200b";
    mirror.appendChild(marker);

    const markerRect = marker.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    return {
      top:
        markerRect.top -
        mirrorRect.top -
        textarea.scrollTop +
        parseInt(style.lineHeight, 10) +
        6,
      left: markerRect.left - mirrorRect.left,
    };
  }, []);

  const closeMention = useCallback(() => {
    setMentionQuery(null);
    setMentionStart(null);
    setMentionPos(null);
  }, []);

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const value = textarea.value;
    let index = cursor - 1;
    while (
      index >= 0 &&
      value[index] !== "@" &&
      value[index] !== " " &&
      value[index] !== "\n" &&
      value[index] !== "\t"
    ) {
      index -= 1;
    }
    if (index >= 0 && value[index] === "@") {
      setMentionQuery(value.substring(index + 1, cursor));
      setMentionStart(index);
      setMentionIndex(0);
      setMentionPos(computeCaretPosition());
      return;
    }
    closeMention();
  }, [closeMention, computeCaretPosition]);

  const insertMention = useCallback(
    (column: string) => {
      const textarea = textareaRef.current;
      if (!textarea || mentionStart === null) return;
      const cursor = textarea.selectionStart;
      const nextValue = `${promptTemplate.substring(0, mentionStart)}{${column}}${promptTemplate.substring(cursor)}`;
      const nextCursor = mentionStart + column.length + 2;
      setPromptTemplate(nextValue);
      closeMention();
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(nextCursor, nextCursor);
      }, 0);
    },
    [closeMention, mentionStart, promptTemplate, setPromptTemplate],
  );

  const insertPlaceholder = (column: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${promptTemplate.slice(0, start)}{${column}}${promptTemplate.slice(end)}`;
    const nextCursor = start + column.length + 2;
    setPromptTemplate(nextValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionQuery === null || mentionOptions.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionOptions.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex(
          (prev) => (prev - 1 + mentionOptions.length) % mentionOptions.length,
        );
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertMention(mentionOptions[mentionIndex]);
      } else if (event.key === "Escape") {
        closeMention();
      }
    },
    [closeMention, insertMention, mentionIndex, mentionOptions, mentionQuery],
  );

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        textareaRef.current &&
        !textareaRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        closeMention();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [closeMention]);

  useEffect(() => {
    if (dropdownRef.current && mentionOptions.length > 0) {
      const active = dropdownRef.current.children[mentionIndex] as
        | HTMLElement
        | undefined;
      active?.scrollIntoView({ block: "nearest" });
    }
  }, [mentionIndex, mentionOptions.length]);

  const usedColumns = useMemo(
    () => textColumns.filter((col) => promptTemplate.includes(`{${col}}`)),
    [promptTemplate, textColumns],
  );
  const orderedColumns = useMemo(() => {
    const used = textColumns.filter((col) => usedColumns.includes(col));
    const unused = textColumns.filter((col) => !usedColumns.includes(col));
    return [...used, ...unused];
  }, [textColumns, usedColumns]);

  const previewText = useMemo(() => {
    if (!promptTemplate.trim()) return "";
    let next = promptTemplate;
    textColumns.forEach((col) => {
      const safe = col.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      next = next.replace(
        new RegExp(`\\{${safe}\\}`, "g"),
        sampleRow[col] || "",
      );
    });
    return next;
  }, [promptTemplate, sampleRow, textColumns]);

  // ══════════════════════════════════════════════════════════
  // CONFIG SELECTION LOGIC (from ConfigurationStep)
  // ══════════════════════════════════════════════════════════

  const isSelected = useCallback(
    (configId: string, version: number) =>
      configs.some(
        (c) => c.config_id === configId && c.config_version === version,
      ),
    [configs],
  );

  const addSelection = useCallback(
    (selection: ConfigSelection) => {
      if (
        configs.some(
          (c) =>
            c.config_id === selection.config_id &&
            c.config_version === selection.config_version,
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
          (c) => !(c.config_id === configId && c.config_version === version),
        ),
      );
    },
    [setConfigs],
  );

  const toggleVersionSelection = useCallback(
    async (config: ConfigPublic, version: number) => {
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
    [addSelection, apiKey, isSelected, removeSelection, toast],
  );

  // Load configs
  const loadConfigs = useCallback(
    async (skip: number, replace: boolean) => {
      if (replace) setIsLoadingConfigs(true);
      try {
        const result = await fetchConfigPage({
          apiKey,
          skip,
          limit: PAGE_SIZE,
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
    [apiKey, toast],
  );

  useEffect(() => {
    if (!hasLoadedInitialConfigsRef.current) {
      hasLoadedInitialConfigsRef.current = true;
      void loadConfigs(0, true);
    }
  }, [loadConfigs]);

  const filteredConfigCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return configCards;
    return configCards.filter((c) =>
      `${c.name} ${c.description || ""}`.toLowerCase().includes(query),
    );
  }, [configCards, searchQuery]);

  // Versions
  const loadVersions = useCallback(
    async (configId: string, skip: number) => {
      setVersionStateByConfig((prev) => ({
        ...prev,
        [configId]: {
          ...(prev[configId] ?? buildInitialVersionState()),
          isLoading: true,
          error: null,
        },
      }));
      try {
        const result = await fetchConfigVersionsPage(apiKey, configId, {
          skip,
          limit: VERSION_PAGE_SIZE,
        });
        setVersionStateByConfig((prev) => {
          const existing = prev[configId] ?? buildInitialVersionState();
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
            ...(prev[configId] ?? buildInitialVersionState()),
            isLoading: false,
            error: "Failed to load versions",
          },
        }));
      }
    },
    [apiKey],
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

  // Create new config
  const updateDraftParam = (key: string, value: string | number) => {
    setDraft((prev) => ({
      ...prev,
      completion: {
        ...prev.completion,
        params: { ...prev.completion.params, [key]: value },
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
    if (!configName.trim()) {
      toast.error("Configuration name is required");
      return;
    }
    setIsSaving(true);
    try {
      const saved = await saveAssessmentConfig({
        apiKey,
        configName: configName.trim(),
        commitMessage: commitMessage.trim(),
        configBlob: draft,
      });
      invalidateAssessmentConfigCache();
      addSelection({
        config_id: saved.config_id,
        config_version: saved.config_version,
        name: configName.trim(),
        provider: draft.completion.provider,
        model: currentModel,
      });
      setDraft(buildInitialDraft());
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

  const renderParamControl = (
    paramKey: string,
    definition: ConfigParamDefinition,
  ) => {
    const value = draftParams[paramKey] ?? definition.default;
    if (definition.type === "enum" && definition.options) {
      return (
        <select
          value={String(value)}
          onChange={(e) => updateDraftParam(paramKey, e.target.value)}
          className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
          style={{
            borderColor: colors.border,
            backgroundColor: colors.bg.primary,
            color: colors.text.primary,
          }}
        >
          {definition.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    const numValue = typeof value === "number" ? value : Number(value);
    return (
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={definition.min ?? 0}
          max={definition.max ?? 2}
          step={definition.type === "int" ? 1 : 0.01}
          value={numValue}
          onChange={(e) =>
            updateDraftParam(paramKey, parseFloat(e.target.value))
          }
          className="flex-1"
        />
        <span
          className="w-12 text-right text-sm font-mono"
          style={{ color: colors.text.primary }}
        >
          {definition.type === "int" ? numValue : numValue.toFixed(2)}
        </span>
      </div>
    );
  };

  const namedSchemaFields = outputSchema.filter((field) => field.name.trim());
  const hasPromptTemplate = promptTemplate.trim().length > 0;
  const hasConfiguredResponseFormat = namedSchemaFields.length > 0;
  // Prompt, response format, and at least one config are mandatory.
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

  useEffect(() => {
    if (configMode !== "create") {
      setSystemInstructionSheetOpen(false);
    }
  }, [configMode]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 pb-20">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2
              className="text-xl font-semibold"
              style={{ color: colors.text.primary }}
            >
              Prompt & Config
            </h2>
            <p
              className="mt-1 text-sm"
              style={{ color: colors.text.secondary }}
            >
              Write the task on the left. Tune behavior and output on the right.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.bg.primary,
                color: colors.text.secondary,
              }}
            >
              Prompt: {promptStatus}
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.bg.primary,
                color: colors.text.secondary,
              }}
            >
              Behaviors: {configs.length}/{MAX_CONFIGS}
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.bg.primary,
                color: colors.text.secondary,
              }}
            >
              Output: {responseSummary}
            </span>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(330px,1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(360px,1.05fr)]">
          <section className="min-w-0">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div
                  className="text-base font-semibold"
                  style={{ color: colors.text.primary }}
                >
                  User Prompt
                </div>
                <div
                  className="mt-1 text-xs"
                  style={{ color: colors.text.secondary }}
                >
                  Use `@` or tap a column chip to insert placeholders.
                </div>
              </div>
              <div
                className="flex items-center gap-1 rounded-xl border p-1"
                style={{
                  backgroundColor: colors.bg.secondary,
                  borderColor: colors.border,
                }}
              >
                <button
                  onClick={() => setPreviewMode(false)}
                  className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    backgroundColor: !previewMode
                      ? colors.accent.primary
                      : "transparent",
                    color: !previewMode ? "#ffffff" : colors.text.secondary,
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => setPreviewMode(true)}
                  className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    backgroundColor: previewMode
                      ? colors.accent.primary
                      : "transparent",
                    color: previewMode ? "#ffffff" : colors.text.secondary,
                  }}
                >
                  Preview
                </button>
              </div>
            </div>

            {!previewMode && (
              <div className="mt-4 flex flex-wrap gap-2">
                {orderedColumns.map((col) => {
                  const isUsed = usedColumns.includes(col);
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => insertPlaceholder(col)}
                      className="cursor-pointer rounded-full border px-3 py-1.5 text-xs font-mono transition-colors"
                      style={{
                        backgroundColor: isUsed
                          ? "rgba(22, 163, 74, 0.12)"
                          : colors.bg.primary,
                        borderColor: isUsed
                          ? "rgba(22, 163, 74, 0.3)"
                          : colors.border,
                        color: isUsed ? "#166534" : colors.text.primary,
                      }}
                    >
                      {`{${col}}`}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-4">
              {previewMode ? (
                <div
                  className="min-h-[460px] whitespace-pre-wrap break-words rounded-2xl border px-5 py-4 text-sm leading-7"
                  style={{
                    backgroundColor: colors.bg.secondary,
                    borderColor: colors.border,
                    color: colors.text.primary,
                  }}
                >
                  {!promptTemplate.trim() ? (
                    <span style={{ color: colors.text.secondary }}>
                      Preview will appear here.
                    </span>
                  ) : Object.keys(sampleRow).length === 0 ? (
                    <span style={{ color: colors.text.secondary }}>
                      Sample data not available. Go back to Datasets and choose
                      a row with values.
                    </span>
                  ) : (
                    previewText || (
                      <span style={{ color: colors.text.secondary }}>
                        Preview will appear here.
                      </span>
                    )
                  )}
                </div>
              ) : (
                <div
                  className="relative rounded-2xl border px-5 py-4"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.bg.primary,
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    value={promptTemplate}
                    onChange={(e) => {
                      setPromptTemplate(e.target.value);
                      setTimeout(handleInput, 0);
                    }}
                    onKeyDown={handleKeyDown}
                    onSelect={handleInput}
                    placeholder={`Describe what the AI should do.\n\nExample:\nEvaluate the student's answer.\nQuestion: {question}\nAnswer: {answer}\nContext: {context}`}
                    className="min-h-[460px] w-full resize-y border-0 bg-transparent px-0 py-0 text-sm leading-7 outline-none"
                    style={{ color: colors.text.primary }}
                  />
                  <div ref={mirrorRef} aria-hidden="true" />

                  {mentionQuery !== null &&
                    mentionOptions.length > 0 &&
                    mentionPos && (
                      <div
                        ref={dropdownRef}
                        className="absolute z-50 overflow-hidden rounded-xl border shadow-lg"
                        style={{
                          top: `${mentionPos.top + 16}px`,
                          left: `${Math.max(16, Math.min(mentionPos.left + 16, 320))}px`,
                          backgroundColor: colors.bg.primary,
                          borderColor: colors.border,
                          minWidth: "220px",
                          maxHeight: "180px",
                          overflowY: "auto",
                        }}
                      >
                        {mentionOptions.map((col, idx) => (
                          <button
                            key={col}
                            type="button"
                            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm font-mono"
                            style={{
                              backgroundColor:
                                idx === mentionIndex
                                  ? colors.bg.secondary
                                  : colors.bg.primary,
                              color: colors.text.primary,
                            }}
                            onMouseEnter={() => setMentionIndex(idx)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              insertMention(col);
                            }}
                          >
                            <span
                              className="rounded px-1.5 py-0.5 text-xs font-sans"
                              style={{
                                backgroundColor: colors.bg.secondary,
                                color: colors.text.secondary,
                              }}
                            >
                              @
                            </span>
                            {col}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </div>
          </section>

          <aside className="self-start space-y-5 lg:sticky lg:top-6 lg:min-w-[330px] xl:min-w-[360px]">
            <details
              open
              className="rounded-2xl border"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.bg.primary,
              }}
            >
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: colors.text.primary }}
                  >
                    Response Format
                  </div>
                  <div
                    className="mt-1 text-xs"
                    style={{ color: colors.text.secondary }}
                  >
                    {responseSummary}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    setSchemaModalOpen(true);
                  }}
                  className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold min-w-[64px]"
                  style={{
                    backgroundColor: colors.accent.primary,
                    color: "#fff",
                  }}
                >
                  {namedSchemaFields.length > 0 ? "Edit" : "Set"}
                </button>
              </summary>
            </details>

            <details
              open
              className="rounded-2xl border"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.bg.primary,
              }}
            >
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
                <div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: colors.text.primary }}
                  >
                    AI Configuration
                  </div>
                  <div
                    className="mt-1 text-xs"
                    style={{ color: colors.text.secondary }}
                  >
                    {configs.length > 0
                      ? `${configs.length} selected`
                      : "Choose at least one configuration"}
                  </div>
                </div>
                {configs.length > 0 && configs.length < MAX_CONFIGS && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      setConfigMode("existing");
                    }}
                    className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold min-w-[64px]"
                    style={{
                      borderColor: colors.border,
                      color: colors.text.primary,
                      backgroundColor: colors.bg.primary,
                    }}
                  >
                    Add more
                  </button>
                )}
              </summary>

              {configs.length > 0 && (
                <div
                  className="border-t px-4 py-4"
                  style={{ borderColor: colors.border }}
                >
                  <div className="flex flex-wrap gap-2">
                    {configs.map((c) => (
                      <div
                        key={`${c.config_id}-${c.config_version}`}
                        className="inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1"
                        style={{
                          borderColor: colors.accent.primary,
                          backgroundColor: "rgba(23, 23, 23, 0.05)",
                        }}
                      >
                        <span
                          className="max-w-[100px] truncate text-[12px] font-semibold"
                          style={{ color: colors.text.primary }}
                          title={c.name}
                        >
                          {c.name}
                        </span>
                        <span
                          className="max-w-[96px] truncate text-[10px]"
                          style={{ color: colors.text.secondary }}
                          title={`v${c.config_version} ${c.provider && c.model ? `· ${c.provider}/${c.model}` : ""}`}
                        >
                          v{c.config_version}{" "}
                          {c.provider && c.model
                            ? `· ${c.provider}/${c.model}`
                            : ""}
                        </span>
                        <button
                          onClick={() =>
                            removeSelection(c.config_id, c.config_version)
                          }
                          className="inline-flex h-5.5 w-5.5 cursor-pointer items-center justify-center rounded-full"
                          style={{ color: colors.text.secondary }}
                        >
                          <CloseIcon className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                className="border-t px-4 py-4"
                style={{ borderColor: colors.border }}
              >
                <div
                  className="mb-4 inline-flex items-center gap-1 rounded-xl border p-1"
                  style={{
                    backgroundColor: colors.bg.secondary,
                    borderColor: colors.border,
                  }}
                >
                  <button
                    onClick={() => setConfigMode("existing")}
                    className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      backgroundColor:
                        configMode === "existing"
                          ? colors.accent.primary
                          : "transparent",
                      color:
                        configMode === "existing"
                          ? "#ffffff"
                          : colors.text.secondary,
                    }}
                  >
                    Saved
                  </button>
                  <button
                    onClick={() => setConfigMode("create")}
                    className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      backgroundColor:
                        configMode === "create"
                          ? colors.accent.primary
                          : "transparent",
                      color:
                        configMode === "create"
                          ? "#ffffff"
                          : colors.text.secondary,
                    }}
                  >
                    New
                  </button>
                </div>

                {configMode === "existing" && (
                  <div>
                    <div className="mb-3">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search behaviors..."
                        className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                        style={{
                          borderColor: colors.border,
                          backgroundColor: colors.bg.secondary,
                          color: colors.text.primary,
                        }}
                      />
                    </div>

                    {isLoadingConfigs ? (
                      <div
                        className="py-8 text-center text-sm"
                        style={{ color: colors.text.secondary }}
                      >
                        Loading behaviors...
                      </div>
                    ) : filteredConfigCards.length === 0 ? (
                      <div
                        className="py-8 text-center text-sm"
                        style={{ color: colors.text.secondary }}
                      >
                        {searchQuery
                          ? "No behaviors match your search."
                          : "No saved behaviors found."}
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                        {filteredConfigCards.map((config) => {
                          const versions =
                            versionStateByConfig[config.id] ??
                            buildInitialVersionState();
                          const latestVersion =
                            versions.items.reduce<number>(
                              (maxVersion, item) =>
                                item.version > maxVersion
                                  ? item.version
                                  : maxVersion,
                              0,
                            ) || 1;
                          const defaultSelected = isSelected(
                            config.id,
                            latestVersion,
                          );
                          const defaultLoading =
                            loadingSelectionKeys[
                              `${config.id}:${latestVersion}`
                            ];
                          const isExpanded = expandedConfigId === config.id;
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
                              className="flex flex-col rounded-[24px] border p-3.5"
                              style={{
                                borderColor: isExpanded
                                  ? colors.accent.primary
                                  : defaultSelected
                                    ? colors.accent.primary
                                    : colors.border,
                                backgroundColor: colors.bg.primary,
                                boxShadow: isExpanded
                                  ? "0 10px 22px rgba(15, 23, 42, 0.06)"
                                  : "0 4px 14px rgba(15, 23, 42, 0.035)",
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div
                                    className="truncate text-sm font-semibold"
                                    style={{ color: colors.text.primary }}
                                  >
                                    {config.name}
                                  </div>
                                  <div
                                    className="mt-1 text-xs"
                                    style={{ color: colors.text.secondary }}
                                  >
                                    {config.updated_at
                                      ? formatRelativeTime(config.updated_at)
                                      : "Saved behavior"}
                                  </div>
                                  {config.description && (
                                    <div
                                      className="mt-1.5 text-xs leading-5"
                                      style={{ color: colors.text.secondary }}
                                    >
                                      {config.description}
                                    </div>
                                  )}
                                </div>
                                {defaultSelected && (
                                  <span
                                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                                    style={{
                                      backgroundColor: colors.bg.secondary,
                                      color: colors.text.primary,
                                      border: `1px solid ${colors.border}`,
                                    }}
                                  >
                                    Added
                                  </span>
                                )}
                              </div>

                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                <button
                                  onClick={() =>
                                    void toggleVersionSelection(
                                      config,
                                      latestVersion,
                                    )
                                  }
                                  disabled={Boolean(defaultLoading)}
                                  className="inline-flex min-w-[126px] cursor-pointer items-center justify-center rounded-full px-3.5 py-2 text-[12px] font-medium"
                                  style={{
                                    backgroundColor: defaultSelected
                                      ? colors.bg.secondary
                                      : colors.accent.primary,
                                    color: defaultSelected
                                      ? colors.text.primary
                                      : "#fff",
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
                                    className="inline-flex min-w-[146px] items-center justify-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-medium transition-colors"
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
                                    <span className="font-semibold">
                                      {isExpanded
                                        ? "Hide versions"
                                        : "Show versions"}
                                    </span>
                                    <span
                                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                                      style={{
                                        backgroundColor: colors.bg.secondary,
                                        color: colors.text.secondary,
                                      }}
                                    >
                                      {versionCountLabel}
                                    </span>
                                    <ChevronDownIcon
                                      className="h-3 w-3 transition-transform duration-300 ease-in-out"
                                      style={{
                                        transform: isExpanded
                                          ? "rotate(180deg)"
                                          : "rotate(0deg)",
                                      }}
                                    />
                                  </button>
                                )}
                              </div>

                              {hasVersionsPanel && (
                                <div
                                  className="mt-2 flex items-center gap-1.5 text-[11px]"
                                  style={{ color: colors.text.secondary }}
                                >
                                  <span
                                    className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                                    style={{
                                      borderColor: colors.border,
                                      backgroundColor: colors.bg.secondary,
                                      color: colors.text.secondary,
                                    }}
                                  >
                                    {previewVersions.length > 0
                                      ? previewVersions
                                          .map(
                                            (version) => `v${version.version}`,
                                          )
                                          .join(", ")
                                      : "Versions"}
                                  </span>
                                  <span>
                                    {previewVersions.length > 0
                                      ? `${knownVersionCount} saved version${knownVersionCount === 1 ? "" : "s"}`
                                      : 'Use "Show versions" to view history'}
                                  </span>
                                </div>
                              )}

                              {hasVersionsPanel && (
                                <div
                                  className={`mt-2 overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[22rem] opacity-100" : "max-h-0 opacity-0"}`}
                                  style={{
                                    pointerEvents: isExpanded ? "auto" : "none",
                                  }}
                                >
                                  <div
                                    className="rounded-[20px] border p-2.5"
                                    style={{
                                      borderColor: colors.border,
                                      backgroundColor: colors.bg.secondary,
                                    }}
                                  >
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                      <div>
                                        <div
                                          className="text-sm font-semibold"
                                          style={{ color: colors.text.primary }}
                                        >
                                          Saved versions
                                        </div>
                                        <div
                                          className="mt-0.5 text-xs"
                                          style={{
                                            color: colors.text.secondary,
                                          }}
                                        >
                                          Pick a specific version to reuse.
                                        </div>
                                      </div>
                                      <span
                                        className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                                        style={{
                                          borderColor: colors.border,
                                          backgroundColor: colors.bg.primary,
                                          color: colors.text.secondary,
                                        }}
                                      >
                                        {knownVersionCount}
                                      </span>
                                    </div>
                                    {versions.isLoading &&
                                    versions.items.length === 0 ? (
                                      <div
                                        className="py-2 text-center text-xs"
                                        style={{ color: colors.text.secondary }}
                                      >
                                        Loading versions...
                                      </div>
                                    ) : (
                                      <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                                        {versions.items.map((v) => {
                                          const vSelected = isSelected(
                                            config.id,
                                            v.version,
                                          );
                                          const vLoading =
                                            loadingSelectionKeys[
                                              `${config.id}:${v.version}`
                                            ];

                                          return (
                                            <div
                                              key={v.id}
                                              className="flex items-center justify-between gap-2.5 rounded-[18px] border px-2.5 py-2"
                                              style={{
                                                backgroundColor:
                                                  colors.bg.primary,
                                                borderColor: vSelected
                                                  ? colors.accent.primary
                                                  : colors.border,
                                              }}
                                            >
                                              <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                  <span
                                                    className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                                                    style={{
                                                      borderColor:
                                                        colors.border,
                                                      backgroundColor:
                                                        colors.bg.secondary,
                                                      color:
                                                        colors.text.secondary,
                                                    }}
                                                  >
                                                    v{v.version}
                                                  </span>
                                                  <div
                                                    className="text-xs font-semibold"
                                                    style={{
                                                      color:
                                                        colors.text.primary,
                                                    }}
                                                  >
                                                    Version {v.version}
                                                  </div>
                                                </div>
                                                {v.commit_message && (
                                                  <div
                                                    className="mt-1 truncate text-[11px]"
                                                    style={{
                                                      color:
                                                        colors.text.secondary,
                                                    }}
                                                  >
                                                    {v.commit_message}
                                                  </div>
                                                )}
                                              </div>
                                              <button
                                                onClick={() =>
                                                  void toggleVersionSelection(
                                                    config,
                                                    v.version,
                                                  )
                                                }
                                                disabled={Boolean(vLoading)}
                                                className="cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-medium"
                                                style={{
                                                  backgroundColor: vSelected
                                                    ? colors.bg.secondary
                                                    : colors.accent.primary,
                                                  color: vSelected
                                                    ? colors.text.primary
                                                    : "#fff",
                                                  border: `1px solid ${vSelected ? colors.border : colors.accent.primary}`,
                                                }}
                                              >
                                                {vLoading
                                                  ? "..."
                                                  : vSelected
                                                    ? "Added"
                                                    : "Use"}
                                              </button>
                                            </div>
                                          );
                                        })}
                                        {versions.hasMore &&
                                          !versions.isLoading && (
                                            <button
                                              onClick={() =>
                                                void loadVersions(
                                                  config.id,
                                                  versions.nextSkip,
                                                )
                                              }
                                              className="cursor-pointer w-full py-1.5 text-xs font-medium"
                                              style={{
                                                color: colors.accent.primary,
                                              }}
                                            >
                                              Load more
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
                        {hasMoreConfigs && (
                          <button
                            onClick={() =>
                              void loadConfigs(nextConfigSkip, false)
                            }
                            className="cursor-pointer w-full rounded-xl border py-2 text-xs font-medium"
                            style={{
                              borderColor: colors.border,
                              color: colors.text.primary,
                              backgroundColor: colors.bg.primary,
                            }}
                          >
                            Load more
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {configMode === "create" && (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          className="mb-2 block text-xs font-semibold"
                          style={{ color: colors.text.primary }}
                        >
                          Provider
                        </label>
                        <select
                          value={draft.completion.provider}
                          onChange={(e) => {
                            const provider = e.target.value as "openai";
                            const defaultModel =
                              getDefaultModelForProvider(provider);
                            setDraft((prev) => ({
                              ...prev,
                              completion: {
                                ...prev.completion,
                                provider,
                                params: {
                                  instructions: String(
                                    prev.completion.params.instructions || "",
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
                          {PROVIDER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
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
                          onChange={(e) => handleModelChange(e.target.value)}
                          className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                          style={{
                            borderColor: colors.border,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        >
                          {providerModels.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div
                      className="flex items-center justify-between rounded-xl border px-4 py-3"
                      style={{
                        borderColor: colors.border,
                        backgroundColor: colors.bg.primary,
                        color: colors.text.primary,
                      }}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          System Instructions
                        </div>
                        <div
                          className="mt-1 text-xs"
                          style={{ color: colors.text.secondary }}
                        >
                          {String(draftParams.instructions || "").trim()
                            ? "Added"
                            : "Not added"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSystemInstructionSheetOpen(true)}
                        className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold min-w-[64px]"
                        style={{
                          backgroundColor: colors.accent.primary,
                          color: "#fff",
                        }}
                      >
                        {String(draftParams.instructions || "").trim()
                          ? "Edit"
                          : "+ Add"}
                      </button>
                    </div>

                    <details
                      className="rounded-xl border"
                      style={{
                        borderColor: colors.border,
                        backgroundColor: colors.bg.secondary,
                      }}
                    >
                      <summary
                        className="cursor-pointer px-4 py-3 text-sm font-semibold"
                        style={{ color: colors.text.primary }}
                      >
                        Advanced
                      </summary>
                      <div className="px-4 pb-4">
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
                                  {String(definition.default)}
                                </span>
                              </div>
                              {renderParamControl(paramKey, definition)}
                            </div>
                          ),
                        )}
                      </div>
                    </details>

                    <div className="grid gap-3">
                      <div>
                        <label
                          className="mb-2 block text-xs font-semibold"
                          style={{ color: colors.text.primary }}
                        >
                          Ai Configuration name
                        </label>
                        <input
                          value={configName}
                          onChange={(e) => setConfigName(e.target.value)}
                          placeholder="Helpful grader"
                          className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                          style={{
                            borderColor: colors.border,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        />
                      </div>
                      <div>
                        <label
                          className="mb-2 block text-xs font-semibold"
                          style={{ color: colors.text.primary }}
                        >
                          Save note
                        </label>
                        <input
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          placeholder="Optional"
                          className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
                          style={{
                            borderColor: colors.border,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => void handleCreateAndAdd()}
                      disabled={isSaving || !configName.trim()}
                      className="w-full rounded-xl px-4 py-3 text-sm font-semibold"
                      style={{
                        backgroundColor:
                          isSaving || !configName.trim()
                            ? colors.bg.secondary
                            : colors.accent.primary,
                        color:
                          isSaving || !configName.trim()
                            ? colors.text.secondary
                            : "#fff",
                        cursor:
                          isSaving || !configName.trim()
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {isSaving ? "Saving..." : "Save behavior"}
                    </button>
                  </div>
                )}
              </div>
            </details>
          </aside>
        </div>

        <OutputSchemaModal
          open={schemaModalOpen}
          onClose={() => setSchemaModalOpen(false)}
          schema={outputSchema}
          setSchema={setOutputSchema}
        />
        {systemInstructionSheetOpen && (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}
              onClick={() => setSystemInstructionSheetOpen(false)}
              aria-label="Close system instructions"
            />
            <div
              className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l shadow-2xl"
              style={{
                backgroundColor: colors.bg.primary,
                borderColor: colors.border,
              }}
            >
              <div
                className="flex items-center justify-between border-b px-6 py-4"
                style={{ borderColor: colors.border }}
              >
                <div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: colors.text.primary }}
                  >
                    System Instructions
                  </h3>
                  <p
                    className="mt-1 text-sm"
                    style={{ color: colors.text.secondary }}
                  >
                    Define how the model should behave before it sees the user
                    prompt.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSystemInstructionSheetOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ color: colors.text.secondary }}
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <textarea
                  value={String(draftParams.instructions || "")}
                  onChange={(e) =>
                    updateDraftParam("instructions", e.target.value)
                  }
                  placeholder="Tell the AI how it should respond."
                  className="min-h-[360px] w-full resize-y rounded-2xl border px-4 py-4 text-sm leading-6 outline-none"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.bg.secondary,
                    color: colors.text.primary,
                  }}
                />
              </div>
              <div
                className="flex items-center justify-end gap-3 border-t px-6 py-4"
                style={{ borderColor: colors.border }}
              >
                <button
                  type="button"
                  onClick={() => updateDraftParam("instructions", "")}
                  className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium"
                  style={{
                    borderColor: colors.border,
                    color: colors.text.primary,
                    backgroundColor: colors.bg.primary,
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setSystemInstructionSheetOpen(false)}
                  className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: colors.accent.primary,
                    color: "#fff",
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div
        className="mt-auto sticky bottom-0 z-10 flex items-center justify-between border-t py-2"
        style={{
          backgroundColor: colors.bg.secondary,
          borderColor: colors.border,
          marginLeft: "-1.5rem",
          marginRight: "-1.5rem",
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <button
            onClick={onBack}
            className="flex cursor-pointer items-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-medium"
            style={{
              borderColor: colors.border,
              color: colors.text.primary,
              backgroundColor: colors.bg.primary,
            }}
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="flex items-center gap-3">
            {!canProceed && (
              <span
                className="text-xs"
                style={{ color: colors.text.secondary }}
              >
                {nextBlockerMessage}
              </span>
            )}
            <button
              onClick={onNext}
              disabled={!canProceed}
              className="cursor-pointer rounded-lg px-6 py-2.5 text-sm font-medium"
              style={{
                backgroundColor: canProceed
                  ? colors.accent.primary
                  : colors.bg.primary,
                color: canProceed ? "#fff" : colors.text.secondary,
                cursor: canProceed ? "pointer" : "not-allowed",
                border: `1px solid ${canProceed ? colors.accent.primary : colors.border}`,
              }}
            >
              Next: Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
