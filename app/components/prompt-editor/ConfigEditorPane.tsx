import { useEffect, useRef, useState } from "react";
import { guardrailsFetch } from "@/app/lib/guardrailsClient";
import { ConfigBlob, Tool } from "@/app/lib/types/promptEditor";
import {
  ConfigPublic,
  SavedConfig,
  ConfigVersionItems,
  CompletionConfig,
} from "@/app/lib/types/configs";
import { MODEL_OPTIONS, isGpt5Model } from "@/app/lib/models";
import { PROVIDER_TYPES, PROVIDES_OPTIONS } from "@/app/lib/constants";
import GuardrailsSection from "./GuardrailsSection";
import SaveConfigModal from "./SaveConfigModal";
import LoadConfigDropdown from "./LoadConfigDropdown";
import ConfigNameSection from "./ConfigNameSection";
import ToolsSection from "./ToolsSection";
import { Button } from "@/app/components";

const inputClass =
  "w-full px-3 py-2 rounded-md text-sm focus:outline-none border border-border bg-bg-primary text-text-primary";

interface ConfigEditorPaneProps {
  configBlob: ConfigBlob;
  onConfigChange: (blob: ConfigBlob) => void;
  configName: string;
  onConfigNameChange: (name: string) => void;
  savedConfigs: SavedConfig[];
  selectedConfigId: string;
  boundConfigId?: string;
  onRenameConfig?: (configId: string, newName: string) => Promise<boolean>;
  onLoadConfig: (config: SavedConfig | null) => void;
  commitMessage: string;
  onCommitMessageChange: (message: string) => void;
  onSave: () => void;
  isSaving?: boolean;
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
  boundConfigId,
  onRenameConfig,
  onLoadConfig,
  commitMessage,
  onCommitMessageChange,
  onSave,
  isSaving = false,
  allConfigMeta = [],
  versionItemsMap = {},
  loadVersionsForConfig,
  loadSingleVersion,
  apiKey = "",
}: ConfigEditorPaneProps) {
  const [guardrailsQueryString, setGuardrailsQueryString] = useState<
    string | null
  >(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const wasSavingRef = useRef(false);

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

  // Close the save modal when a save just completed successfully.
  useEffect(() => {
    if (wasSavingRef.current && !isSaving && commitMessage === "") {
      setShowSaveModal(false);
    }
    wasSavingRef.current = isSaving;
  }, [isSaving, commitMessage]);

  const provider = configBlob.completion.provider;
  const params = configBlob.completion.params;
  const isGpt5 = isGpt5Model(params.model);
  const tools = (params.tools || []) as Tool[];

  const selectedConfig = savedConfigs.find((c) => c.id === selectedConfigId);
  const isBoundToSavedConfig = !!boundConfigId;
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
      completion: { ...configBlob.completion, type: newType },
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
    <div className="flex flex-col overflow-hidden border-l border-border bg-bg-primary flex-1 min-w-0">
      <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
        <h3 className="text-sm font-semibold flex-1 text-text-primary">
          Configuration
        </h3>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          <LoadConfigDropdown
            selectedConfig={selectedConfig}
            selectedConfigId={selectedConfigId}
            savedConfigs={savedConfigs}
            allConfigMeta={allConfigMeta}
            versionItemsMap={versionItemsMap}
            loadVersionsForConfig={loadVersionsForConfig}
            loadSingleVersion={loadSingleVersion}
            onLoadConfig={onLoadConfig}
          />

          <ConfigNameSection
            configName={configName}
            onConfigNameChange={onConfigNameChange}
            boundConfigId={boundConfigId}
            onRenameConfig={onRenameConfig}
            allConfigMeta={allConfigMeta}
          />

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

          <ToolsSection
            tools={tools}
            isGpt5={isGpt5}
            onAddTool={handleAddTool}
            onRemoveTool={handleRemoveTool}
            onUpdateTool={handleUpdateTool}
          />

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

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => setShowSaveModal(true)}
            disabled={saveDisabled}
          >
            {isSaving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>

      <SaveConfigModal
        open={showSaveModal}
        configName={configName}
        isUpdate={isBoundToSavedConfig || !!existingConfigForHint}
        commitMessage={commitMessage}
        onCommitMessageChange={onCommitMessageChange}
        isSaving={isSaving}
        onClose={() => setShowSaveModal(false)}
        onConfirm={onSave}
      />
    </div>
  );
}
