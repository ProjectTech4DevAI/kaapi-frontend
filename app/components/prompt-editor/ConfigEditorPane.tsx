import React from 'react';
import { colors } from '@/app/lib/colors';
import { ConfigBlob, Tool } from '@/app/configurations/prompt-editor/types';

interface ConfigEditorPaneProps {
  configBlob: ConfigBlob;
  onConfigChange: (blob: ConfigBlob) => void;
  configName: string;
  onConfigNameChange: (name: string) => void;
  // Additional props for full functionality
  savedConfigs: any[];
  selectedConfigId: string;
  onLoadConfig: (configId: string) => void;
  commitMessage: string;
  onCommitMessageChange: (message: string) => void;
  onSave: () => void;
  isSaving?: boolean;
}

// Provider-specific models
const MODEL_OPTIONS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  // anthropic: [
  //   { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  //   { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  //   { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
  //   { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  // ],
  // google: [
  //   { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  //   { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  //   { value: 'gemini-pro', label: 'Gemini Pro' },
  // ],
};

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
}: ConfigEditorPaneProps) {
  const provider = configBlob.completion.provider;
  const params = configBlob.completion.params;
  const tools = (params.tools || []) as Tool[];

  const handleProviderChange = (newProvider: string) => {
    onConfigChange({
      ...configBlob,
      completion: {
        ...configBlob.completion,
        provider: newProvider as any,
        params: {
          ...params,
          model: MODEL_OPTIONS[newProvider as keyof typeof MODEL_OPTIONS][0].value,
        },
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
        type: 'file_search' as const,
        vector_store_ids: [''],
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

  const handleUpdateTool = (index: number, field: keyof Tool, value: any) => {
    const newTools = [...tools];
    if (field === 'vector_store_ids') {
      newTools[index][field] = [value];
    } else {
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
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <h3 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
          Configuration
        </h3>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {/* Load Saved Config */}
          {savedConfigs.length > 0 && (
            <div>
              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: colors.text.primary }}
              >
                Load Saved Config
              </label>
              <select
                value={selectedConfigId}
                onChange={(e) => onLoadConfig(e.target.value)}
                className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                style={{
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.bg.primary,
                  color: colors.text.primary,
                }}
              >
                <option value="">+ New Config</option>
                {savedConfigs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name} v{config.version} • {config.provider}/{config.modelName}
                  </option>
                ))}
              </select>
            </div>
          )}

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
            {configName.trim() && (() => {
              const existingConfig = savedConfigs.find(c => c.name === configName.trim());
              return (
                <p className="text-xs mt-1.5" style={{ color: colors.text.secondary }}>
                  {existingConfig
                    ? `💡 Will create a new version for "${configName}"`
                    : `✨ Will create a new config "${configName}"`
                  }
                </p>
              );
            })()}
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
              <option value="openai">OpenAI</option>
              {/* <option value="anthropic">Anthropic</option> */}
              {/* <option value="google">Google</option> */}
            </select>
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
              {MODEL_OPTIONS[provider as keyof typeof MODEL_OPTIONS].map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: colors.text.primary }}
            >
              Temperature: {(params.temperature || 0.7).toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={params.temperature || 0.7}
              onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
              className="w-full"
              style={{ accentColor: colors.accent.primary }}
            />
            <div
              className="flex justify-between text-xs mt-1"
              style={{ color: colors.text.secondary }}
            >
              <span>Focused (0)</span>
              <span>Balanced (0.5)</span>
              <span>Creative (1)</span>
            </div>
          </div>

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
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
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
                  <span className="text-xs font-semibold">File Search</span>
                  <button
                    onClick={() => handleRemoveTool(index)}
                    className="text-xs"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.status.error,
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
                <div className="mb-2">
                  <label
                    className="block text-xs mb-1"
                    style={{ color: colors.text.secondary }}
                  >
                    Vector Store ID
                  </label>
                  <input
                    type="text"
                    value={tool.vector_store_ids[0] || ''}
                    onChange={(e) =>
                      handleUpdateTool(index, 'vector_store_ids', e.target.value)
                    }
                    placeholder="vs_abc123"
                    className="w-full px-2 py-1 rounded text-xs focus:outline-none"
                    style={{
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.bg.primary,
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs mb-1"
                    style={{ color: colors.text.secondary }}
                  >
                    Max Results
                  </label>
                  <input
                    type="number"
                    value={tool.max_num_results}
                    onChange={(e) =>
                      handleUpdateTool(
                        index,
                        'max_num_results',
                        parseInt(e.target.value) || 20
                      )
                    }
                    className="w-full px-2 py-1 rounded text-xs focus:outline-none"
                    style={{
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.bg.primary,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Commit Message */}
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

          {/* Save Button */}
          <button
            onClick={onSave}
            disabled={!configName.trim() || isSaving}
            className="w-full px-4 py-2 rounded-md text-sm font-semibold"
            style={{
              backgroundColor: !configName.trim() || isSaving ? colors.bg.secondary : colors.status.success,
              color: !configName.trim() || isSaving ? colors.text.secondary : '#ffffff',
              border: 'none',
              cursor: !configName.trim() || isSaving ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
