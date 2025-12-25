import React, { useState } from 'react';
import { colors } from '@/app/lib/colors';
import { Config, Tool } from '@/app/configurations/prompt-editor/types';

interface CurrentConfigTabProps {
  configs: Config[];
  selectedConfigId: string;
  configName: string;
  provider: string;
  model: string;
  instructions: string;
  temperature: number;
  tools: Tool[];
  configCommitMsg: string;
  onConfigNameChange: (name: string) => void;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onInstructionsChange: (instructions: string) => void;
  onTemperatureChange: (temp: number) => void;
  onToolsChange: (tools: Tool[]) => void;
  onConfigCommitMsgChange: (msg: string) => void;
  onSaveConfig: () => void;
  onLoadConfig: (configId: string) => void;
  onUseCurrentPrompt: () => void;
}

export default function CurrentConfigTab({
  configs,
  selectedConfigId,
  configName,
  provider,
  model,
  instructions,
  temperature,
  tools,
  configCommitMsg,
  onConfigNameChange,
  onProviderChange,
  onModelChange,
  onInstructionsChange,
  onTemperatureChange,
  onToolsChange,
  onConfigCommitMsgChange,
  onSaveConfig,
  onLoadConfig,
  onUseCurrentPrompt,
}: CurrentConfigTabProps) {
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const addTool = () => {
    onToolsChange([
      ...tools,
      {
        type: 'file_search',
        vector_store_ids: [''],
        max_num_results: 20,
      },
    ]);
  };

  const removeTool = (index: number) => {
    onToolsChange(tools.filter((_, i) => i !== index));
  };

  const updateTool = (index: number, field: keyof Tool, value: any) => {
    const newTools = [...tools];
    if (field === 'vector_store_ids') {
      newTools[index][field] = [value];
    } else {
      (newTools[index] as any)[field] = value;
    }
    onToolsChange(newTools);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Config Name Selector */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: colors.text.primary,
            marginBottom: '6px',
          }}
        >
          Configuration
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!isCreatingNew ? (
            <>
              <select
                value={selectedConfigId}
                onChange={(e) => {
                  if (e.target.value) {
                    onLoadConfig(e.target.value);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  fontSize: '13px',
                  backgroundColor: colors.bg.primary,
                }}
              >
                <option value="">Select a config...</option>
                {configs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name} (v{config.version})
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setIsCreatingNew(true);
                  onConfigNameChange('');
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: colors.accent.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                + New
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                value={configName}
                onChange={(e) => onConfigNameChange(e.target.value)}
                placeholder="Enter config name..."
                style={{
                  flex: 1,
                  padding: '8px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              />
              <button
                onClick={() => setIsCreatingNew(false)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.primary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Provider Dropdown */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: colors.text.primary,
            marginBottom: '6px',
          }}
        >
          Provider
        </label>
        <select
          value={provider}
          onChange={(e) => onProviderChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            fontSize: '13px',
            backgroundColor: colors.bg.primary,
          }}
        >
          <option value="openai">OpenAI</option>
          {/* <option value="anthropic">Anthropic</option> */}
          {/* <option value="google">Google</option> */}
        </select>
      </div>

      {/* Model Dropdown */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: colors.text.primary,
            marginBottom: '6px',
          }}
        >
          Model
        </label>
        <select
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            fontSize: '13px',
            backgroundColor: colors.bg.primary,
          }}
        >
          <option value="gpt-4o-mini">gpt-4o-mini</option>
          <option value="gpt-4o">gpt-4o</option>
          <option value="gpt-4-turbo">gpt-4-turbo</option>
          <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
        </select>
      </div>

      {/* Instructions Section */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}
        >
          <label
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: colors.text.primary,
            }}
          >
            Instructions
          </label>
          <button
            onClick={onUseCurrentPrompt}
            style={{
              padding: '4px 8px',
              backgroundColor: colors.bg.secondary,
              color: colors.text.primary,
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Use Current Prompt
          </button>
        </div>
        <textarea
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          placeholder="Enter instructions..."
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '8px',
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'monospace',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Temperature Slider */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: colors.text.primary,
            marginBottom: '6px',
          }}
        >
          Temperature: {temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={temperature}
          onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: colors.text.secondary,
            marginTop: '4px',
          }}
        >
          <span>Focused (0)</span>
          <span>Balanced (0.5)</span>
          <span>Creative (1)</span>
        </div>
      </div>

      {/* Tools Section */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <label
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: colors.text.primary,
            }}
          >
            Tools
          </label>
          <button
            onClick={addTool}
            style={{
              padding: '4px 8px',
              backgroundColor: colors.accent.primary,
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            + Add Tool
          </button>
        </div>
        {tools.map((tool, index) => (
          <div
            key={index}
            style={{
              padding: '12px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              marginBottom: '8px',
              backgroundColor: colors.bg.secondary,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 600 }}>File Search</span>
              <button
                onClick={() => removeTool(index)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.status.error,
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Remove
              </button>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: colors.text.secondary,
                  marginBottom: '4px',
                }}
              >
                Vector Store ID
              </label>
              <input
                type="text"
                value={tool.vector_store_ids[0] || ''}
                onChange={(e) => updateTool(index, 'vector_store_ids', e.target.value)}
                placeholder="vs_abc123"
                style={{
                  width: '100%',
                  padding: '6px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: colors.text.secondary,
                  marginBottom: '4px',
                }}
              >
                Max Results
              </label>
              <input
                type="number"
                value={tool.max_num_results}
                onChange={(e) =>
                  updateTool(index, 'max_num_results', parseInt(e.target.value) || 20)
                }
                style={{
                  width: '100%',
                  padding: '6px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Commit Message */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: colors.text.primary,
            marginBottom: '6px',
          }}
        >
          Commit Message (Optional)
        </label>
        <input
          type="text"
          value={configCommitMsg}
          onChange={(e) => onConfigCommitMsgChange(e.target.value)}
          placeholder="Describe this configuration..."
          style={{
            width: '100%',
            padding: '8px',
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Save Button */}
      <button
        onClick={onSaveConfig}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: colors.status.success,
          color: '#ffffff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        Save Configuration
      </button>
    </div>
  );
}
