import React, { useState, useMemo } from 'react';
import { colors } from '@/app/lib/colors';
import { ConfigBlob, Tool } from '@/app/configurations/prompt-editor/types';
import { SavedConfig, formatRelativeTime } from '@/app/lib/useConfigs';

interface ConfigEditorPaneProps {
  configBlob: ConfigBlob;
  onConfigChange: (blob: ConfigBlob) => void;
  configName: string;
  onConfigNameChange: (name: string) => void;
  // Additional props for full functionality
  savedConfigs: SavedConfig[];
  selectedConfigId: string;
  onLoadConfig: (configId: string) => void;
  commitMessage: string;
  onCommitMessageChange: (message: string) => void;
  onSave: () => void;
  isSaving?: boolean;
  // Collapse functionality
  collapsed?: boolean;
  onToggle?: () => void;
}

// Group configs by name for nested dropdown
interface ConfigGroupForDropdown {
  config_id: string;
  name: string;
  versions: SavedConfig[];
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
  collapsed = false,
  onToggle,
}: ConfigEditorPaneProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const provider = configBlob.completion.provider;
  const params = configBlob.completion.params;
  const tools = (params.tools || []) as Tool[];

  // Group configs by config_id for nested dropdown
  const configGroups = useMemo(() => {
    const grouped = new Map<string, SavedConfig[]>();
    savedConfigs.forEach((config) => {
      const existing = grouped.get(config.config_id) || [];
      existing.push(config);
      grouped.set(config.config_id, existing);
    });
    return Array.from(grouped.entries()).map(([config_id, versions]) => {
      const sortedVersions = versions.sort((a, b) => b.version - a.version);
      return {
        config_id,
        name: sortedVersions[0].name,
        versions: sortedVersions,
      } as ConfigGroupForDropdown;
    });
  }, [savedConfigs]);

  // Find currently selected config
  const selectedConfig = savedConfigs.find(c => c.id === selectedConfigId);

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
    <div
      className="flex flex-col overflow-hidden flex-shrink-0 border-l"
      style={{
        width: collapsed ? '40px' : '100%',
        flex: collapsed ? '0 0 40px' : '1 1 0%',
        backgroundColor: colors.bg.primary,
        borderColor: colors.border,
        transition: 'width 0.2s ease-in-out, flex 0.2s ease-in-out',
      }}
    >
      {/* Header */}
      <div
        className="border-b flex items-center flex-shrink-0"
        style={{
          borderColor: colors.border,
          padding: collapsed ? '0' : '12px 16px',
          justifyContent: collapsed ? 'center' : 'space-between',
          height: collapsed ? '40px' : 'auto',
          transition: 'padding 0.2s ease-in-out',
        }}
      >
        {/* Title - hidden when collapsed, shown first when expanded */}
        {!collapsed && (
          <h3 className="text-sm font-semibold flex-1" style={{ color: colors.text.primary }}>
            Configuration
          </h3>
        )}
        {/* Toggle button - chevron (on right when expanded, centered when collapsed) */}
        {onToggle && (
          <button
            onClick={onToggle}
            className="rounded flex-shrink-0 flex items-center justify-center"
            style={{
              width: '28px',
              height: '28px',
              borderWidth: '1px',
              borderColor: colors.border,
              backgroundColor: colors.bg.primary,
              color: colors.text.secondary,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.bg.secondary;
              e.currentTarget.style.color = colors.text.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.bg.primary;
              e.currentTarget.style.color = colors.text.secondary;
            }}
            title={collapsed ? 'Show configuration' : 'Hide configuration'}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{
                // When collapsed, chevron points left (to expand); when expanded, points right (to collapse)
                transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease-in-out',
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
            </svg>
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
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
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
          {/* Load Saved Config - Nested dropdown matching Evaluations page pattern */}
          <div className="relative">
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: colors.text.primary }}
            >
              Load Configuration
            </label>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
                    <span className="font-medium text-sm truncate">{selectedConfig.name}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ backgroundColor: colors.bg.secondary, color: colors.text.secondary }}
                    >
                      v{selectedConfig.version}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>
                    {selectedConfig.provider}/{selectedConfig.modelName}
                  </div>
                </div>
              ) : (
                <span className="text-sm" style={{ color: colors.text.secondary }}>+ New Configuration</span>
              )}
              <svg
                className="w-4 h-4 flex-shrink-0 ml-2 transition-transform"
                style={{
                  color: colors.text.secondary,
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
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
                {/* New Config Option */}
                <button
                  onClick={() => {
                    onLoadConfig('');
                    setIsDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2.5 text-left flex items-center gap-2 transition-colors"
                  style={{
                    backgroundColor: !selectedConfigId ? colors.bg.secondary : colors.bg.primary,
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = !selectedConfigId ? colors.bg.secondary : colors.bg.primary}
                >
                  <svg className="w-4 h-4" style={{ color: colors.accent.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium" style={{ color: colors.text.primary }}>New Configuration</span>
                </button>

                {/* Grouped Configs */}
                {configGroups.map((group) => (
                  <div key={group.config_id}>
                    {/* Config group header */}
                    <div
                      className="px-3 py-2 text-xs font-medium sticky top-0"
                      style={{ backgroundColor: colors.bg.secondary, color: colors.text.secondary }}
                    >
                      {group.name} ({group.versions.length} version{group.versions.length !== 1 ? 's' : ''})
                    </div>
                    {/* Versions */}
                    {group.versions.map((version) => (
                      <button
                        key={version.id}
                        onClick={() => {
                          onLoadConfig(version.id);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left flex items-center justify-between transition-colors"
                        style={{
                          backgroundColor: selectedConfig?.id === version.id ? colors.bg.secondary : colors.bg.primary,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = selectedConfig?.id === version.id
                            ? colors.bg.secondary
                            : colors.bg.primary;
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: colors.bg.secondary, color: colors.text.secondary }}
                            >
                              v{version.version}
                            </span>
                            <span className="text-sm truncate" style={{ color: colors.text.primary }}>
                              {version.commit_message || 'No message'}
                            </span>
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>
                            {version.provider}/{version.modelName} • {formatRelativeTime(version.timestamp)}
                          </div>
                        </div>
                        {selectedConfig?.id === version.id && (
                          <svg className="w-4 h-4 flex-shrink-0" style={{ color: colors.status.success }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
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
      )}
    </div>
  );
}
