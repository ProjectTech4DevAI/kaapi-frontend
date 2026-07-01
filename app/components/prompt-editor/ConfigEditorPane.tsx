import { useEffect, useRef, useState } from "react";
import { guardrailsFetch } from "@/app/lib/guardrailsClient";
import { ConfigEditorPaneProps, Tool } from "@/app/lib/types/promptEditor";
import { CompletionConfig, CompletionParams } from "@/app/lib/types/configs";
import { ConfigType, getModelsForType } from "@/app/lib/models";
import { PROVIDER_TYPES } from "@/app/lib/constants";
import {
  getAllProviders,
  getCompletionTypesForProvider,
  getModelSchema,
  getParamLabel,
  getProviderLabel,
  reconcileParamsForModel,
} from "@/app/lib/modelSchema";
import { useModelSchemas } from "@/app/hooks/useModelSchemas";
import GuardrailsSection from "./GuardrailsSection";
import SaveConfigModal from "./SaveConfigModal";
import LoadConfigDropdown from "./LoadConfigDropdown";
import ConfigNameSection from "./ConfigNameSection";
import ToolsSection from "./ToolsSection";
import { Button, Select } from "@/app/components/ui";
const inputClass =
  "w-full px-3 py-2 rounded-md text-sm focus:outline-none border border-border bg-bg-primary text-text-primary";

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

  const { isLoaded: schemasLoaded } = useModelSchemas();

  const provider = configBlob.completion.provider;
  const params = configBlob.completion.params;
  const tools = (params.tools || []) as Tool[];
  const modelSchema = getModelSchema(provider, params.model);
  const schemaParamEntries = modelSchema
    ? Object.entries(modelSchema.config)
    : [];
  const acceptsTools =
    !modelSchema || "max_output_tokens" in modelSchema.config;
  const providerOptions = (schemasLoaded ? getAllProviders() : []).map((p) => ({
    value: p,
    label: getProviderLabel(p),
  }));
  const availableTypes = getCompletionTypesForProvider(provider);
  const typeOptions = PROVIDER_TYPES.filter((t) =>
    availableTypes.includes(t.value as ConfigType),
  );

  const selectedConfig = savedConfigs.find((c) => c.id === selectedConfigId);
  const isBoundToSavedConfig = !!boundConfigId;
  const existingConfigForHint = configName.trim()
    ? allConfigMeta.find((m) => m.name === configName.trim())
    : undefined;

  const currentType = (configBlob.completion.type || "text") as ConfigType;

  const handleConfigChange = (patch: {
    params?: Partial<CompletionParams>;
    completion?: Partial<CompletionConfig>;
  }) => {
    onConfigChange({
      ...configBlob,
      completion: {
        ...configBlob.completion,
        ...patch.completion,
        params: { ...params, ...patch.params },
      },
    });
  };

  const applyProviderTypeModel = (
    nextProvider: string,
    nextType: ConfigType,
    nextModel: string,
  ) => {
    const nextSchema = getModelSchema(nextProvider, nextModel);
    const nextSchemaParams = nextSchema
      ? reconcileParamsForModel(nextProvider, nextModel, params)
      : {};
    const oldSchemaKeys = modelSchema ? Object.keys(modelSchema.config) : [];
    const carryover = { ...params };
    delete carryover.model;
    oldSchemaKeys.forEach((k) => delete carryover[k]);
    onConfigChange({
      ...configBlob,
      completion: {
        ...configBlob.completion,
        provider: nextProvider,
        type: nextType,
        params: { ...carryover, model: nextModel, ...nextSchemaParams },
      },
    });
  };

  const handleProviderChange = (newProvider: string) => {
    const types = getCompletionTypesForProvider(newProvider);
    const nextType = types.includes(currentType)
      ? currentType
      : (types[0] ?? currentType);
    const nextModel = getModelsForType(newProvider, nextType)[0]?.value ?? "";
    applyProviderTypeModel(newProvider, nextType, nextModel);
  };

  const handleTypeChange = (newType: ConfigType) => {
    const candidates = getModelsForType(provider, newType);
    const stillValid = candidates.some((m) => m.value === params.model);
    const nextModel = stillValid ? params.model : (candidates[0]?.value ?? "");
    applyProviderTypeModel(provider, newType, nextModel);
  };

  const handleModelChange = (model: string) => {
    applyProviderTypeModel(provider, currentType, model);
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
              {providerOptions.map((option) => (
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
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs mt-1.5 text-text-secondary">
              {typeOptions.find(
                (t) => t.value === (configBlob.completion.type || "text"),
              )?.description ?? ""}
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
              {getModelsForType(provider, currentType).map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          {schemaParamEntries.map(([key, spec]) => {
            const value = params[key] ?? spec.default;
            const setValue = (v: unknown) =>
              handleConfigChange({ params: { [key]: v } });
            const labelText = getParamLabel(key);
            if (spec.type === "enum" && spec.options) {
              return (
                <div key={key}>
                  <label className="block text-xs font-semibold mb-2 text-text-primary">
                    {labelText}
                  </label>
                  <Select
                    value={String(value)}
                    onChange={(e) => setValue(e.target.value)}
                    options={spec.options.map((opt) => ({
                      value: opt,
                      label: opt,
                    }))}
                  />
                  {spec.description && (
                    <p className="text-xs mt-1.5 text-text-secondary">
                      {spec.description}
                    </p>
                  )}
                </div>
              );
            }
            if (spec.type === "float" || spec.type === "int") {
              const numeric = Number(value);
              const min = spec.min ?? 0;
              const max = spec.max ?? 1;
              const step = spec.type === "int" ? 1 : 0.01;
              return (
                <div key={key}>
                  <label className="block text-xs font-semibold mb-2 text-text-primary">
                    {labelText}:{" "}
                    {spec.type === "int"
                      ? Math.round(numeric)
                      : numeric.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={numeric}
                    onChange={(e) =>
                      setValue(
                        spec.type === "int"
                          ? parseInt(e.target.value, 10)
                          : parseFloat(e.target.value),
                      )
                    }
                    className="w-full accent-accent-primary"
                  />
                  <div className="flex justify-between text-xs mt-1 text-text-secondary">
                    <span>{min}</span>
                    <span>{max}</span>
                  </div>
                </div>
              );
            }
            if (spec.type === "string") {
              return (
                <div key={key}>
                  <label className="block text-xs font-semibold mb-2 text-text-primary">
                    {labelText}
                  </label>
                  <input
                    type="text"
                    value={String(value ?? "")}
                    onChange={(e) => setValue(e.target.value)}
                    className={inputClass}
                  />
                </div>
              );
            }
            if (spec.type === "boolean") {
              return (
                <div key={key} className="flex items-center gap-2">
                  <input
                    id={`param-${key}`}
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => setValue(e.target.checked)}
                  />
                  <label
                    htmlFor={`param-${key}`}
                    className="text-xs font-semibold text-text-primary"
                  >
                    {labelText}
                  </label>
                </div>
              );
            }
            return null;
          })}

          <ToolsSection
            tools={tools}
            showMaxResults={acceptsTools}
            onAddTool={() =>
              handleConfigChange({
                params: {
                  tools: [
                    ...tools,
                    {
                      type: "file_search",
                      knowledge_base_ids: [""],
                      max_num_results: 20,
                    },
                  ],
                },
              })
            }
            onRemoveTool={(index) =>
              handleConfigChange({
                params: { tools: tools.filter((_, i) => i !== index) },
              })
            }
            onUpdateTool={(index, field, value) =>
              handleConfigChange({
                params: {
                  tools: tools.map((t, i) =>
                    i === index ? { ...t, [field]: value } : t,
                  ),
                },
              })
            }
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
