import { useState, useEffect } from "react";
import { guardrailsFetch } from "@/app/lib/guardrailsClient";
import { ConfigBlob, Tool } from "@/app/lib/types/promptEditor";
import {
  ConfigPublic,
  SavedConfig,
  ConfigVersionItems,
  CompletionConfig,
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
import GuardrailsSection from "./GuardrailsSection";

const inputClass =
  "w-full px-3 py-2 rounded-md text-sm focus:outline-none border border-border bg-bg-primary text-text-primary";

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
  const [guardrailsQueryString, setGuardrailsQueryString] = useState<
    string | null
  >(null);

  useEffect(() => {
    guardrailsFetch<{ data?: { organization_id: number; project_id: number } }>(
      "/api/apikeys/verify",
      apiKey,
    )
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
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);
  const [loadingVersionsFor, setLoadingVersionsFor] = useState<Set<string>>(
    new Set(),
  );

  const handleOpenLoadDropdown = () => {
    if (!isDropdownOpen) {
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

  const selectedConfig = savedConfigs.find((c) => c.id === selectedConfigId);

  const existingConfigForHint = configName.trim()
    ? allConfigMeta.find((m) => m.name === configName.trim())
    : undefined;

  const handleProviderChange = (newProvider: string) => {
    onConfigChange({
      ...configBlob,
      completion: {
        ...configBlob.completion,
        provider: newProvider as CompletionConfig["provider"],
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

  const handleUpdateTool = <K extends keyof Tool>(
    index: number,
    field: K,
    value: Tool[K],
  ) => {
    const newTools = tools.map((t, i) =>
      i === index ? { ...t, [field]: value } : t,
    );
    onConfigChange({
      ...configBlob,
      completion: {
        ...configBlob.completion,
        params: { ...params, tools: newTools },
      },
    });
  };

  const saveDisabled = !configName.trim() || isSaving;

  return (
    <div
      className={`flex flex-col overflow-hidden shrink-0 border-l border-border bg-bg-primary ${
        collapsed ? "w-10 flex-[0_0_40px]" : "w-full flex-1"
      }`}
      style={{ transition: "width 0.2s ease-in-out, flex 0.2s ease-in-out" }}
    >
      <div
        className={`border-b border-border flex items-center shrink-0 ${
          collapsed ? "justify-center h-10 p-0" : "justify-between px-4 py-3"
        }`}
        style={{ transition: "padding 0.2s ease-in-out" }}
      >
        {!collapsed && (
          <h3 className="text-sm font-semibold flex-1 text-text-primary">
            Configuration
          </h3>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className="rounded shrink-0 flex items-center justify-center w-7 h-7 border border-border bg-bg-primary text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
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

      {collapsed && (
        <div
          className="flex items-start justify-center pt-4 cursor-pointer text-text-secondary"
          onClick={onToggle}
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

      {!collapsed && (
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-semibold mb-2 text-text-primary">
                Load Configuration
              </label>
              <button
                onClick={handleOpenLoadDropdown}
                className={`w-full px-3 py-2.5 rounded-md text-left flex items-center justify-between transition-colors bg-bg-primary text-text-primary border ${
                  selectedConfig ? "border-accent-primary" : "border-border"
                }`}
              >
                {selectedConfig ? (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {selectedConfig.name}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded shrink-0 bg-bg-secondary text-text-secondary">
                        v{selectedConfig.version}
                      </span>
                    </div>
                    <div className="text-xs mt-0.5 text-text-secondary">
                      {selectedConfig.provider}/{selectedConfig.modelName} •{" "}
                      {selectedConfig.type}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-text-secondary">
                    + New Configuration
                  </span>
                )}
                <ChevronDownIcon
                  className="w-4 h-4 shrink-0 ml-2 transition-transform text-text-secondary"
                  style={{
                    transform: isDropdownOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                  }}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 rounded-md shadow-lg max-h-64 overflow-auto bg-bg-primary border border-border">
                  <button
                    onClick={() => {
                      onLoadConfig(null);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left flex items-center gap-2 transition-colors border-b border-border ${
                      !selectedConfigId
                        ? "bg-bg-secondary"
                        : "bg-bg-primary hover:bg-bg-secondary"
                    }`}
                  >
                    <PlusIcon className="w-4 h-4 text-accent-primary" />
                    <span className="text-sm font-medium text-text-primary">
                      New Configuration
                    </span>
                  </button>

                  {allConfigMeta.map((meta) => {
                    const isExpanded = expandedConfigId === meta.id;
                    const isLoadingGroup = loadingVersionsFor.has(meta.id);
                    const items = versionItemsMap[meta.id] ?? [];
                    return (
                      <div key={meta.id}>
                        <button
                          className="w-full px-3 py-2 text-left flex items-center justify-between sticky top-0 transition-colors bg-bg-secondary text-text-secondary"
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
                                className={`w-full px-4 py-2 text-left flex items-center justify-between transition-colors ${
                                  isSelected
                                    ? "bg-bg-secondary"
                                    : "bg-bg-primary hover:bg-bg-secondary"
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-bg-secondary text-text-secondary">
                                      v{item.version}
                                    </span>
                                    <span className="text-sm truncate text-text-primary">
                                      {item.commit_message || "No message"}
                                    </span>
                                  </div>
                                  <div className="text-xs mt-0.5 text-text-secondary">
                                    {formatRelativeTime(item.inserted_at)}
                                  </div>
                                </div>
                                {isSelected && (
                                  <CheckIcon className="w-4 h-4 shrink-0 text-status-success" />
                                )}
                              </button>
                            );
                          })}
                        {isExpanded && isLoadingGroup && (
                          <div className="px-4 py-3 text-xs text-text-secondary">
                            Loading versions…
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {isDropdownOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 text-text-primary">
                Configuration Name
              </label>
              <input
                type="text"
                value={configName}
                onChange={(e) => onConfigNameChange(e.target.value)}
                placeholder="e.g., my-config"
                className={inputClass}
              />
              {configName.trim() && (
                <p className="text-xs mt-1.5 text-text-secondary">
                  {existingConfigForHint
                    ? `💡 Will create a new version for "${configName}"`
                    : `✨ Will create a new config "${configName}"`}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 text-text-primary">
                Provider
              </label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className={inputClass}
              >
                {PROVIDES_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 text-text-primary">
                Type
              </label>
              <select
                value={configBlob.completion.type || "text"}
                onChange={(e) =>
                  handleTypeChange(e.target.value as "text" | "stt" | "tts")
                }
                className={inputClass}
              >
                {PROVIDER_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs mt-1.5 text-text-secondary">
                Standard text-based LLM completion
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2 text-text-primary">
                Model
              </label>
              <select
                value={params.model}
                onChange={(e) => handleModelChange(e.target.value)}
                className={inputClass}
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
                <label className="block text-xs font-semibold mb-2 text-text-primary">
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
                  className="w-full accent-accent-primary"
                />
                <div className="flex justify-between text-xs mt-1 text-text-secondary">
                  <span>0</span>
                  <span>2</span>
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-text-primary">
                  Tools
                </label>
                <button
                  onClick={handleAddTool}
                  className="px-2 py-1 rounded text-xs font-medium bg-accent-primary text-bg-primary"
                >
                  + Add Tool
                </button>
              </div>
              {tools.map((tool, index) => (
                <div
                  key={index}
                  className="p-3 rounded mb-2 border border-border bg-bg-secondary"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-text-primary">
                      File Search
                    </span>
                    <button
                      onClick={() => handleRemoveTool(index)}
                      className="text-xs bg-transparent border-0 text-status-error cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs mb-1 text-text-primary">
                      Knowledge Base ID
                    </label>
                    <input
                      type="text"
                      value={tool.knowledge_base_ids[0] || ""}
                      onChange={(e) =>
                        handleUpdateTool(index, "knowledge_base_ids", [
                          e.target.value,
                        ])
                      }
                      placeholder="vs_abc123"
                      className="w-full px-2 py-1 rounded text-xs focus:outline-none border border-gray-300 bg-bg-primary text-text-primary"
                    />
                  </div>

                  {!isGpt5 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="text-xs text-text-primary">
                          Max Results
                        </label>
                        <div
                          className="relative inline-flex items-center justify-center cursor-help w-3.5 h-3.5"
                          onMouseEnter={() => setShowTooltip(index)}
                          onMouseLeave={() => setShowTooltip(null)}
                        >
                          <InfoIcon className="w-3.5 h-3.5 text-text-secondary" />
                          {showTooltip === index && (
                            <div className="absolute left-full ml-2 px-2 py-1.5 rounded text-xs z-50 bg-[#1f2937] text-white top-1/2 transform -translate-y-1/2 shadow-lg whitespace-nowrap line-height-1.4">
                              Controls how many matching results are returned
                              <br />
                              from the search
                              <div className="absolute right-full top-[50%] transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-[#1f2937]" />
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
                        className="w-full px-2 py-1 rounded text-xs focus:outline-none border border-border bg-bg-primary text-text-primary"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

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
              <label className="block text-xs font-semibold mb-2 text-text-primary">
                Commit Message (Optional)
              </label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => onCommitMessageChange(e.target.value)}
                placeholder="Describe your changes..."
                className={inputClass}
              />
            </div>

            <button
              onClick={onSave}
              disabled={saveDisabled}
              className={`w-full px-4 py-2 rounded-md text-sm font-semibold border-0 transition-colors ${
                saveDisabled
                  ? "bg-bg-secondary text-text-secondary cursor-not-allowed"
                  : "bg-status-success text-bg-primary cursor-pointer"
              }`}
            >
              {isSaving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
