import { useState, useEffect } from "react";
import { colors } from "@/app/lib/colors";
import { ConfigBlob, Tool } from "@/app/lib/types/promptEditor";
import {
  ConfigPublic,
  SavedConfig,
  ConfigVersionItems,
  GuardrailRef,
} from "@/app/lib/types/configs";
import { formatRelativeTime } from "@/app/lib/utils";
import { MODEL_OPTIONS, isGpt5Model } from "@/app/lib/models";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  CheckIcon,
  PlusIcon,
  SpinnerIcon,
  InfoIcon,
} from "@/app/components/icons";
import { PROVIDER_TYPES, PROVIDES_OPTIONS } from "@/app/lib/constants";

interface ValidatorConfigOption {
  id: string;
  name: string;
  type: string;
  stage?: string;
}

function GuardrailsSection({
  label,
  guardrails,
  onChange,
  apiKey,
  queryString,
  stage,
}: {
  label: string;
  guardrails: GuardrailRef[];
  onChange: (refs: GuardrailRef[]) => void;
  apiKey: string;
  queryString: string | null;
  stage: "input" | "output";
}) {
  const [validators, setValidators] = useState<ValidatorConfigOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!queryString) return;
    setLoading(true);
    fetch(`/api/guardrails/validators/configs${queryString}`, {
      headers: apiKey ? { "X-API-KEY": apiKey } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        const items: ValidatorConfigOption[] = Array.isArray(data?.data?.configs)
          ? data.data.configs
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.configs)
          ? data.configs
          : Array.isArray(data)
          ? data
          : [];
        setValidators(items);
      })
      .catch(() => setValidators([]))
      .finally(() => setLoading(false));
  }, [queryString, apiKey]);

  const addedIds = new Set(guardrails.map((g) => g.validator_config_id));
  const available = validators.filter(
    (v) => !addedIds.has(v.id) && (!v.stage || v.stage === stage),
  );

  const handleAdd = (id: string) => {
    onChange([...guardrails, { validator_config_id: id }]);
    setDropdownOpen(false);
  };

  const handleRemove = (id: string) => {
    onChange(guardrails.filter((g) => g.validator_config_id !== id));
  };

  const getValidatorName = (id: string) => {
    const v = validators.find((v) => v.id === id && (!v.stage || v.stage === stage));
    return v ? v.name || v.type : id.slice(0, 8) + "…";
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label
          className="text-xs font-semibold"
          style={{ color: colors.text.primary }}
        >
          {label}
        </label>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            disabled={loading || available.length === 0}
            className="px-2 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor:
                loading || available.length === 0
                  ? colors.bg.secondary
                  : colors.accent.primary,
              color:
                loading || available.length === 0
                  ? colors.text.secondary
                  : colors.bg.primary,
              cursor:
                loading || available.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Loading…" : available.length === 0 ? "No validators" : "+ Add"}
          </button>
          {dropdownOpen && available.length > 0 && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div
                className="absolute right-0 z-50 mt-1 w-56 rounded-md shadow-lg max-h-48 overflow-auto"
                style={{
                  backgroundColor: colors.bg.primary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                {available.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleAdd(v.id)}
                    className="w-full px-3 py-2 text-left text-sm transition-colors"
                    style={{ color: colors.text.primary }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        colors.bg.secondary)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    {v.name || v.type}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {guardrails.length === 0 ? (
        <p className="text-xs" style={{ color: colors.text.secondary }}>
          No validators added
        </p>
      ) : (
        <div className="space-y-1">
          {guardrails.map((g) => (
            <div
              key={g.validator_config_id}
              className="flex items-center justify-between px-2.5 py-1.5 rounded"
              style={{
                backgroundColor: colors.bg.secondary,
                border: `1px solid ${colors.border}`,
              }}
            >
              <span className="text-xs truncate" style={{ color: colors.text.primary }}>
                {getValidatorName(g.validator_config_id)}
              </span>
              <button
                onClick={() => handleRemove(g.validator_config_id)}
                className="ml-2 text-xs flex-shrink-0"
                style={{ color: colors.status.error, background: "none", border: "none", cursor: "pointer" }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ConfigEditorPaneProps {
  configBlob: ConfigBlob;
  onConfigChange: (blob: ConfigBlob) => void;
  configName: string;
  onConfigNameChange: (name: string) => void;
  savedConfigs: SavedConfig[];
  selectedConfigId: string;
  onLoadConfig: (config: SavedConfig | null) => void;
  commitMessage: string;
  onCommitMessageChange: (message: string) => void;
  onSave: () => void;
  isSaving?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  allConfigMeta?: ConfigPublic[];
  versionItemsMap?: Record<string, ConfigVersionItems[]>;
  loadVersionsForConfig?: (config_id: string) => Promise<void>;
  loadSingleVersion?: (
    config_id: string,
    version: number,
  ) => Promise<SavedConfig | null>;
  apiKey?: string;
}

export default function ConfigEditorPane({
  configBlob,
  onConfigChange,
  configName,
  onConfigNameChange,
  savedConfigs,
  selectedConfigId,
  onLoadConfig,
  commitMessage,
  onCommitMessageChange,
  onSave,
  isSaving = false,
  collapsed = false,
  onToggle,
  allConfigMeta = [],
  versionItemsMap = {},
  loadVersionsForConfig,
  loadSingleVersion,
  apiKey = "",
}: ConfigEditorPaneProps) {
  const [guardrailsQueryString, setGuardrailsQueryString] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) return;
    fetch("/api/apikeys/verify", { headers: { "X-API-KEY": apiKey } })
      .then((r) => r.json())
      .then((data) => {
        const org_id = data?.data?.organization_id;
        const proj_id = data?.data?.project_id;
        if (org_id != null && proj_id != null) {
          setGuardrailsQueryString(
            `?organization_id=${parseInt(String(org_id), 10)}&project_id=${parseInt(String(proj_id), 10)}`,
          );
        }
      })
      .catch(() => {});
  }, [apiKey]);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null); // config group is expanded in the Load dropdown
  const [loadingVersionsFor, setLoadingVersionsFor] = useState<Set<string>>(
    new Set(),
  );

  const handleOpenLoadDropdown = () => {
    if (!isDropdownOpen) {
      // Auto-expand the currently selected config group, load its version list if needed
      if (selectedConfigId) {
        const selected = savedConfigs.find((c) => c.id === selectedConfigId);
        if (selected) {
          setExpandedConfigId(selected.config_id);
          if (!versionItemsMap[selected.config_id] && loadVersionsForConfig) {
            setLoadingVersionsFor((prev) =>
              new Set(prev).add(selected.config_id),
            );
            loadVersionsForConfig(selected.config_id).finally(() => {
              setLoadingVersionsFor((prev) => {
                const s = new Set(prev);
                s.delete(selected.config_id);
                return s;
              });
            });
          }
        }
      }
    }
    setIsDropdownOpen((prev) => !prev);
  };

  const handleToggleGroup = (config_id: string) => {
    if (expandedConfigId === config_id) {
      setExpandedConfigId(null);
      return;
    }
    setExpandedConfigId(config_id);
    if (
      !versionItemsMap[config_id] &&
      !loadingVersionsFor.has(config_id) &&
      loadVersionsForConfig
    ) {
      setLoadingVersionsFor((prev) => new Set(prev).add(config_id));
      loadVersionsForConfig(config_id).finally(() => {
        setLoadingVersionsFor((prev) => {
          const s = new Set(prev);
          s.delete(config_id);
          return s;
        });
      });
    }
  };
  const [showTooltip, setShowTooltip] = useState<number | null>(null);

  const provider = configBlob.completion.provider;
  const params = configBlob.completion.params;
  const isGpt5 = isGpt5Model(params.model);
  const tools = (params.tools || []) as Tool[];

  // Find currently selected config from loaded set
  const selectedConfig = savedConfigs.find((c) => c.id === selectedConfigId);

  // Config name hint text: use allConfigMeta for accurate new-vs-existing detection
  const existingConfigForHint = configName.trim()
    ? allConfigMeta.find((m) => m.name === configName.trim())
    : undefined;

  const handleProviderChange = (newProvider: string) => {
    onConfigChange({
      ...configBlob,
      completion: {
        ...configBlob.completion,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        provider: newProvider as any,
        params: {
          ...params,
          model:
            MODEL_OPTIONS[newProvider as keyof typeof MODEL_OPTIONS][0].value,
        },
      },
    });
  };

  const handleTypeChange = (newType: "text" | "stt" | "tts") => {
    onConfigChange({
      ...configBlob,
      completion: {
        ...configBlob.completion,
        type: newType,
      },
    });
  };

  const handleModelChange = (model: string) => {
    onConfigChange({
      ...configBlob,
      completion: {
        ...configBlob.completion,
        params: { ...params, model },
      },
    });
  };

  const handleTemperatureChange = (temperature: number) => {
    onConfigChange({
      ...configBlob,
      completion: {
        ...configBlob.completion,
        params: { ...params, temperature },
      },
    });
  };

  const handleAddTool = () => {
    const newTools = [
      ...tools,
      {
        type: "file_search" as const,
        knowledge_base_ids: [""],
        max_num_results: 20,
      },
    ];
    onConfigChange({
      ...configBlob,
      completion: {
        ...configBlob.completion,
        params: { ...params, tools: newTools },
      },
    });
  };

  const handleRemoveTool = (index: number) => {
    const newTools = tools.filter((_, i) => i !== index);
    onConfigChange({
      ...configBlob,
      completion: {
        ...configBlob.completion,
        params: { ...params, tools: newTools },
      },
    });
  };

  const handleUpdateTool = (
    index: number,
    field: keyof Tool,
    value: unknown,
  ) => {
    const newTools = [...tools];
    if (field === "knowledge_base_ids") {
      newTools[index][field] = [value as string];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (newTools[index] as any)[field] = value;
    }
    onConfigChange({
      ...configBlob,
      completion: {
        ...configBlob.completion,
        params: { ...params, tools: newTools },
      },
    });
  };

  return (
    <div
      className="flex flex-col overflow-hidden flex-shrink-0 border-l"
      style={{
        width: collapsed ? "40px" : "100%",
        flex: collapsed ? "0 0 40px" : "1 1 0%",
        backgroundColor: colors.bg.primary,
        borderColor: colors.border,
        transition: "width 0.2s ease-in-out, flex 0.2s ease-in-out",
      }}
    >
      <div
        className="border-b flex items-center flex-shrink-0"
        style={{
          borderColor: colors.border,
          padding: collapsed ? "0" : "12px 16px",
          justifyContent: collapsed ? "center" : "space-between",
          height: collapsed ? "40px" : "auto",
          transition: "padding 0.2s ease-in-out",
        }}
      >
        {!collapsed && (
          <h3
            className="text-sm font-semibold flex-1"
            style={{ color: colors.text.primary }}
          >
            Configuration
          </h3>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className="rounded shrink-0 flex items-center justify-center w-7 h-7 border"
            style={{
              borderColor: colors.border,
              backgroundColor: colors.bg.primary,
              color: colors.text.secondary,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.bg.secondary;
              e.currentTarget.style.color = colors.text.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.bg.primary;
              e.currentTarget.style.color = colors.text.secondary;
            }}
            title={collapsed ? "Show configuration" : "Hide configuration"}
          >
            <ChevronRightIcon
              className="w-4 h-4"
              style={{
                transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease-in-out",
              }}
            />
          </button>
        )}
      </div>

      {/* Vertical text when collapsed */}
      {collapsed && (
        <div
          className="flex items-start justify-center pt-4 cursor-pointer"
          onClick={onToggle}
          style={{ color: colors.text.secondary }}
          title="Show configuration"
        >
          <span
            className="text-xs font-medium whitespace-nowrap"
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
            }}
          >
            Configuration
          </span>
        </div>
      )}

      {/* Content - hidden when collapsed */}
      {!collapsed && (
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            <div className="relative">
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: colors.text.primary }}
              >
                Load Configuration
              </label>
              <button
                onClick={handleOpenLoadDropdown}
                className="w-full px-3 py-2.5 rounded-md text-left flex items-center justify-between transition-colors"
                style={{
                  backgroundColor: colors.bg.primary,
                  border: `1px solid ${selectedConfig ? colors.accent.primary : colors.border}`,
                  color: colors.text.primary,
                }}
              >
                {selectedConfig ? (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {selectedConfig.name}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          backgroundColor: colors.bg.secondary,
                          color: colors.text.secondary,
                        }}
                      >
                        v{selectedConfig.version}
                      </span>
                    </div>
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: colors.text.secondary }}
                    >
                      {selectedConfig.provider}/{selectedConfig.modelName} •{" "}
                      {selectedConfig.type}
                    </div>
                  </div>
                ) : (
                  <span
                    className="text-sm"
                    style={{ color: colors.text.secondary }}
                  >
                    + New Configuration
                  </span>
                )}
                <ChevronDownIcon
                  className="w-4 h-4 flex-shrink-0 ml-2 transition-transform"
                  style={{
                    color: colors.text.secondary,
                    transform: isDropdownOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                  }}
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div
                  className="absolute z-50 w-full mt-1 rounded-md shadow-lg max-h-64 overflow-auto"
                  style={{
                    backgroundColor: colors.bg.primary,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <button
                    onClick={() => {
                      onLoadConfig(null);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-3 py-2.5 text-left flex items-center gap-2 transition-colors"
                    style={{
                      backgroundColor: !selectedConfigId
                        ? colors.bg.secondary
                        : colors.bg.primary,
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        colors.bg.secondary)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = !selectedConfigId
                        ? colors.bg.secondary
                        : colors.bg.primary)
                    }
                  >
                    <PlusIcon
                      className="w-4 h-4"
                      style={{ color: colors.accent.primary }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: colors.text.primary }}
                    >
                      New Configuration
                    </span>
                  </button>

                  {/* Grouped Configs — built from lightweight allConfigMeta */}
                  {allConfigMeta.map((meta) => {
                    const isExpanded = expandedConfigId === meta.id;
                    const isLoadingGroup = loadingVersionsFor.has(meta.id);
                    const items = versionItemsMap[meta.id] ?? [];
                    return (
                      <div key={meta.id}>
                        <button
                          className="w-full px-3 py-2 text-left flex items-center justify-between sticky top-0 transition-colors"
                          style={{
                            backgroundColor: colors.bg.secondary,
                            color: colors.text.secondary,
                          }}
                          onClick={() => handleToggleGroup(meta.id)}
                        >
                          <span className="text-xs font-medium">
                            {meta.name}
                            {items.length > 0 && (
                              <span className="ml-1 font-normal">
                                ({items.length})
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            {isLoadingGroup && (
                              <SpinnerIcon className="w-3 h-3" />
                            )}
                            <ChevronDownIcon
                              className="w-3.5 h-3.5"
                              style={{
                                transform: isExpanded
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                                transition: "transform 0.15s",
                              }}
                            />
                          </span>
                        </button>
                        {/* Version items — only when expanded */}
                        {isExpanded &&
                          !isLoadingGroup &&
                          items.map((item) => {
                            const isSelected =
                              selectedConfig?.config_id === meta.id &&
                              selectedConfig?.version === item.version;
                            return (
                              <button
                                key={item.id}
                                onClick={async () => {
                                  const full = savedConfigs.find(
                                    (c) =>
                                      c.config_id === item.config_id &&
                                      c.version === item.version,
                                  );
                                  const config =
                                    full ??
                                    (loadSingleVersion
                                      ? await loadSingleVersion(
                                          item.config_id,
                                          item.version,
                                        )
                                      : null);
                                  if (config) {
                                    onLoadConfig(config);
                                    setIsDropdownOpen(false);
                                  }
                                }}
                                className="w-full px-4 py-2 text-left flex items-center justify-between transition-colors"
                                style={{
                                  backgroundColor: isSelected
                                    ? colors.bg.secondary
                                    : colors.bg.primary,
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    colors.bg.secondary)
                                }
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    isSelected
                                      ? colors.bg.secondary
                                      : colors.bg.primary;
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="text-xs px-1.5 py-0.5 rounded"
                                      style={{
                                        backgroundColor: colors.bg.secondary,
                                        color: colors.text.secondary,
                                      }}
                                    >
                                      v{item.version}
                                    </span>
                                    <span
                                      className="text-sm truncate"
                                      style={{ color: colors.text.primary }}
                                    >
                                      {item.commit_message || "No message"}
                                    </span>
                                  </div>
                                  <div
                                    className="text-xs mt-0.5"
                                    style={{ color: colors.text.secondary }}
                                  >
                                    {formatRelativeTime(item.inserted_at)}
                                  </div>
                                </div>
                                {isSelected && (
                                  <CheckIcon
                                    className="w-4 h-4 flex-shrink-0"
                                    style={{ color: colors.status.success }}
                                  />
                                )}
                              </button>
                            );
                          })}
                        {isExpanded && isLoadingGroup && (
                          <div
                            className="px-4 py-3 text-xs"
                            style={{ color: colors.text.secondary }}
                          >
                            Loading versions…
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Click outside to close dropdown */}
              {isDropdownOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
              )}
            </div>

            {/* Config Name */}
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: colors.text.primary }}
              >
                Configuration Name
              </label>
              <input
                type="text"
                value={configName}
                onChange={(e) => onConfigNameChange(e.target.value)}
                placeholder="e.g., my-config"
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                style={{
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bg.primary,
                  color: colors.text.primary,
                }}
              />
              {configName.trim() && (
                <p
                  className="text-xs mt-1.5"
                  style={{ color: colors.text.secondary }}
                >
                  {existingConfigForHint
                    ? `💡 Will create a new version for "${configName}"`
                    : `✨ Will create a new config "${configName}"`}
                </p>
              )}
            </div>

            {/* Provider */}
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: colors.text.primary }}
              >
                Provider
              </label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                style={{
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bg.primary,
                  color: colors.text.primary,
                }}
              >
                {PROVIDES_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: colors.text.primary }}
              >
                Type
              </label>
              <select
                value={configBlob.completion.type || "text"}
                onChange={(e) =>
                  handleTypeChange(e.target.value as "text" | "stt" | "tts")
                }
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                style={{
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bg.primary,
                  color: colors.text.primary,
                }}
              >
                {PROVIDER_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p
                className="text-xs mt-1.5"
                style={{ color: colors.text.secondary }}
              >
                Standard text-based LLM completion
              </p>
            </div>

            {/* Model */}
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: colors.text.primary }}
              >
                Model
              </label>
              <select
                value={params.model}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                style={{
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bg.primary,
                  color: colors.text.primary,
                }}
              >
                {(
                  MODEL_OPTIONS[provider as keyof typeof MODEL_OPTIONS] ??
                  MODEL_OPTIONS.openai
                ).map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>

            {!isGpt5 && (
              <div>
                <label
                  className="block text-xs font-semibold mb-2"
                  style={{ color: colors.text.primary }}
                >
                  Temperature: {(params.temperature ?? 0.7).toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={params.temperature ?? 0.7}
                  onChange={(e) =>
                    handleTemperatureChange(parseFloat(e.target.value))
                  }
                  className="w-full"
                  style={{ accentColor: colors.accent.primary }}
                />
                <div
                  className="flex justify-between text-xs mt-1"
                  style={{ color: colors.text.secondary }}
                >
                  <span>0</span>
                  <span>2</span>
                </div>
              </div>
            )}

            {/* Tools */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label
                  className="text-xs font-semibold"
                  style={{ color: colors.text.primary }}
                >
                  Tools
                </label>
                <button
                  onClick={handleAddTool}
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: colors.accent.primary,
                    color: colors.bg.primary,
                  }}
                >
                  + Add Tool
                </button>
              </div>
              {tools.map((tool, index) => (
                <div
                  key={index}
                  className="p-3 rounded mb-2"
                  style={{
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.bg.secondary,
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: colors.text.primary }}
                    >
                      File Search
                    </span>
                    <button
                      onClick={() => handleRemoveTool(index)}
                      className="text-xs"
                      style={{
                        background: "none",
                        border: "none",
                        color: colors.status.error,
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mb-2">
                    <label
                      className="block text-xs mb-1"
                      style={{ color: colors.text.primary }}
                    >
                      Knowledge Base ID
                    </label>
                    <input
                      type="text"
                      value={tool.knowledge_base_ids[0] || ""}
                      onChange={(e) =>
                        handleUpdateTool(
                          index,
                          "knowledge_base_ids",
                          e.target.value,
                        )
                      }
                      placeholder="vs_abc123"
                      className="w-full px-2 py-1 rounded text-xs focus:outline-none border border-gray-300"
                      style={{
                        backgroundColor: colors.bg.primary,
                        color: colors.text.primary,
                      }}
                    />
                  </div>

                  {!isGpt5 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label
                          className="text-xs"
                          style={{ color: colors.text.primary }}
                        >
                          Max Results
                        </label>
                        <div
                          className="relative inline-flex items-center justify-center cursor-help w-[14px] h-[14px]"
                          onMouseEnter={() => setShowTooltip(index)}
                          onMouseLeave={() => setShowTooltip(null)}
                        >
                          <InfoIcon
                            className="w-3.5 h-3.5"
                            style={{ color: colors.text.secondary }}
                          />
                          {showTooltip === index && (
                            <div className="absolute left-full ml-2 px-2 py-1.5 rounded text-xs z-50 bg-[#1f2937] text-white top-1/2 transform -translate-y-1/2 shadow-lg whitespace-nowrap line-height-1.4">
                              Controls how many matching results are returned
                              <br />
                              from the search
                              <div className="absolute right-[100%] top-[50%] transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-[#1f2937]" />
                            </div>
                          )}
                        </div>
                      </div>
                      <input
                        type="number"
                        value={tool.max_num_results}
                        onChange={(e) =>
                          handleUpdateTool(
                            index,
                            "max_num_results",
                            parseInt(e.target.value) || 20,
                          )
                        }
                        className="w-full px-2 py-1 rounded text-xs focus:outline-none"
                        style={{
                          border: `1px solid ${colors.border}`,
                          backgroundColor: colors.bg.primary,
                          color: colors.text.primary,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input Guardrails */}
            <GuardrailsSection
              label="Input Guardrails"
              guardrails={configBlob.input_guardrails ?? []}
              onChange={(refs) =>
                onConfigChange({ ...configBlob, input_guardrails: refs })
              }
              apiKey={apiKey}
              queryString={guardrailsQueryString}
              stage="input"
            />

            {/* Output Guardrails */}
            <GuardrailsSection
              label="Output Guardrails"
              guardrails={configBlob.output_guardrails ?? []}
              onChange={(refs) =>
                onConfigChange({ ...configBlob, output_guardrails: refs })
              }
              apiKey={apiKey}
              queryString={guardrailsQueryString}
              stage="output"
            />

            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: colors.text.primary }}
              >
                Commit Message (Optional)
              </label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => onCommitMessageChange(e.target.value)}
                placeholder="Describe your changes..."
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                style={{
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bg.primary,
                  color: colors.text.primary,
                }}
              />
            </div>

            <button
              onClick={onSave}
              disabled={!configName.trim() || isSaving}
              className="w-full px-4 py-2 rounded-md text-sm font-semibold"
              style={{
                backgroundColor:
                  !configName.trim() || isSaving
                    ? colors.bg.secondary
                    : colors.status.success,
                color:
                  !configName.trim() || isSaving
                    ? colors.text.secondary
                    : colors.bg.primary,
                border: "none",
                cursor:
                  !configName.trim() || isSaving ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {isSaving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
