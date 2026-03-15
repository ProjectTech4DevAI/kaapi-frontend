import React, { useState, useMemo } from 'react';
import { colors } from '@/app/lib/colors';
import { ConfigBlob, Tool } from '@/app/configurations/prompt-editor/types';
import { SavedConfig, formatRelativeTime } from '@/app/lib/useConfigs';
import { Validator, AVAILABLE_VALIDATORS } from './ValidatorListPane';
import { useToast } from '@/app/components/Toast';

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
  // Guardrails mode
  isGuardrailsMode?: boolean;
  onEnterGuardrailsMode?: () => void;
  onExitGuardrailsMode?: () => void;
  selectedValidator?: string | null;
  savedValidators?: Validator[];
  onSaveValidator?: (validator: Validator) => void;
  onRemoveValidator?: (index: number) => void;
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
  isGuardrailsMode = false,
  onEnterGuardrailsMode,
  onExitGuardrailsMode,
  selectedValidator = null,
  savedValidators = [],
  onSaveValidator,
  onRemoveValidator,
}: ConfigEditorPaneProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState<number | null>(null);
  const [validatorConfig, setValidatorConfig] = useState<any>({});
  const [showExitModal, setShowExitModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showVersionWarningModal, setShowVersionWarningModal] = useState(false);
  const [editingValidatorIndex, setEditingValidatorIndex] = useState<number | null>(null);
  const [editingValidatorId, setEditingValidatorId] = useState<string | null>(null);
  const [initialValidators, setInitialValidators] = useState<Validator[]>([]);
  const [banLists, setBanLists] = useState<any[]>([]);
  const [showCreateBanListModal, setShowCreateBanListModal] = useState(false);
  const [newBanList, setNewBanList] = useState({ name: '', description:'', banned_words: '', domain: '', is_public: false });
  const toast = useToast();

  const provider = configBlob.completion.provider;
  const params = configBlob.completion.params;
  const tools = (params.tools || []) as Tool[];

  // Capture initial validators state when entering guardrails mode
  React.useEffect(() => {
    if (isGuardrailsMode) {
      // Take a deep copy of validators when entering guardrails mode
      setInitialValidators(JSON.parse(JSON.stringify(savedValidators)));
    }
  }, [isGuardrailsMode]);

  // Fetch ban lists when ban-list validator is selected
  React.useEffect(() => {
    if ((selectedValidator === 'ban-list' || editingValidatorId === 'ban-list') && isGuardrailsMode) {
      fetchBanLists();
    }
  }, [selectedValidator, editingValidatorId, isGuardrailsMode]);

  const fetchBanLists = async () => {
    try {
      const stored = localStorage.getItem('kaapi_api_keys');
      if (!stored) return;

      const keys = JSON.parse(stored);
      if (keys.length === 0 || !keys[0].key) return;

      const apiKey = keys[0].key;

      // Fetch ban lists
      const response = await fetch('/api/guardrails/ban_lists', {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBanLists(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching ban lists:', error);
    }
  };

  const handleCreateBanList = async () => {
    try {
      const stored = localStorage.getItem('kaapi_api_keys');
      if (!stored) {
        toast.error('No API key found. Please add an API key first.');
        return;
      }

      const keys = JSON.parse(stored);
      if (keys.length === 0 || !keys[0].key) {
        toast.error('No API key found. Please add an API key first.');
        return;
      }

      const apiKey = keys[0].key;

      // Parse banned words from textarea (split by newlines or commas)
      const bannedWordsArray = newBanList.banned_words
        .split(/[\n,]+/)
        .map(word => word.trim())
        .filter(word => word.length > 0);

      // Create ban list payload
      const payload = {
        name: newBanList.name,
        banned_words: bannedWordsArray,
        domain: newBanList.domain,
        is_public: newBanList.is_public,
      };

      // Create ban list
      const response = await fetch('/api/guardrails/ban_lists', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Ban list "${newBanList.name}" created successfully!`);
        // Refresh ban lists
        await fetchBanLists();
        // Auto-select the newly created ban list
        if (data.data && data.data.id) {
          setValidatorConfig({ ...validatorConfig, ban_list_id: data.data.id });
        }
        // Reset form and close modal
        setNewBanList({ name: '', description:'', banned_words: '', domain: '', is_public: false });
        setShowCreateBanListModal(false);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to create ban list: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating ban list:', error);
      toast.error('Failed to create ban list. Please try again.');
    }
  };

  // Check if validators have changed
  const validatorsChanged = () => {
    if (initialValidators.length !== savedValidators.length) return true;

    // Deep comparison of validator arrays
    return JSON.stringify(initialValidators) !== JSON.stringify(savedValidators);
  };

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

  const handleTypeChange = (newType: 'text' | 'stt' | 'tts') => {
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
        type: 'file_search' as const,
        knowledge_base_ids: [''],
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
    if (field === 'knowledge_base_ids') {
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
      {!collapsed && !isGuardrailsMode && (
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
                    {selectedConfig.provider}/{selectedConfig.modelName} • {selectedConfig.type}
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

          {/* Type */}
          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: colors.text.primary }}
            >
              Type
            </label>
            <select
              value={configBlob.completion.type || 'text'}
              onChange={(e) => handleTypeChange(e.target.value as 'text' | 'stt' | 'tts')}
              className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
              style={{
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.bg.primary,
                color: colors.text.primary,
              }}
            >
              <option value="text">Text Completion</option>
              <option value="stt" disabled>Speech-to-Text (Coming Soon)</option>
              <option value="tts" disabled>Text-to-Speech (Coming Soon)</option>
            </select>
            <p className="text-xs mt-1.5" style={{ color: colors.text.secondary }}>
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
              Temperature: {(params.temperature ?? 0.7).toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={params.temperature ?? 0.7}
              onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
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
                  <span className="text-xs font-semibold" style={{ color: '#000000' }}>File Search</span>
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
                    style={{ color: '#000000' }}
                  >
                    Knowledge Base ID
                  </label>
                  <input
                    type="text"
                    value={tool.knowledge_base_ids[0] || ''}
                    onChange={(e) =>
                      handleUpdateTool(index, 'knowledge_base_ids', e.target.value)
                    }
                    placeholder="vs_abc123"
                    className="w-full px-2 py-1 rounded text-xs focus:outline-none"
                    style={{
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.bg.primary,
                      color: colors.text.primary,
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label
                      className="text-xs"
                      style={{ color: '#000000' }}
                    >
                      Max Results
                    </label>
                    <div
                      className="relative inline-flex items-center justify-center cursor-help"
                      style={{ width: '14px', height: '14px' }}
                      onMouseEnter={() => setShowTooltip(index)}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        style={{ color: colors.text.secondary }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {showTooltip === index && (
                        <div
                          className="absolute left-full ml-2 px-2 py-1.5 rounded text-xs z-50"
                          style={{
                            backgroundColor: '#1f2937',
                            color: '#ffffff',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                            whiteSpace: 'nowrap',
                            lineHeight: '1.4',
                          }}
                        >
                          Controls how many matching results are returned<br />from the search
                          <div
                            style={{
                              position: 'absolute',
                              right: '100%',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 0,
                              height: 0,
                              borderTop: '4px solid transparent',
                              borderBottom: '4px solid transparent',
                              borderRight: '4px solid #1f2937',
                            }}
                          />
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
                        'max_num_results',
                        parseInt(e.target.value) || 20
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

          {/* Guardrails Button */}
          {savedValidators && savedValidators.length > 0 ? (
            <div className="space-y-2">
              <div
                className="px-4 py-2 rounded-md text-sm"
                style={{
                  backgroundColor: colors.bg.secondary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold" style={{ color: colors.text.primary }}>
                    Guardrails Configured
                  </span>
                  <span
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      backgroundColor: colors.status.success,
                      color: '#ffffff',
                    }}
                  >
                    {savedValidators.length} {savedValidators.length === 1 ? 'validator' : 'validators'}
                  </span>
                </div>
              </div>
              <button
                onClick={onEnterGuardrailsMode}
                className="w-full px-4 py-2 rounded-md text-sm font-semibold"
                style={{
                  backgroundColor: colors.bg.primary,
                  color: colors.text.primary,
                  border: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
              >
                Visit Guardrails Configuration
              </button>
            </div>
          ) : (
            <button
              onClick={onEnterGuardrailsMode}
              className="w-full px-4 py-2 rounded-md text-sm font-semibold"
              style={{
                backgroundColor: colors.bg.primary,
                color: colors.text.primary,
                border: `1px solid ${colors.border}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
            >
              Add Guardrails
            </button>
          )}

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

      {/* Guardrails Mode - Configuration Panel Only */}
      {!collapsed && isGuardrailsMode && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4">
            {/* Validator Configuration Form */}
            {(selectedValidator || editingValidatorId) && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3" style={{ color: colors.text.primary }}>
                  {editingValidatorId ? 'Edit' : 'Configure'} {AVAILABLE_VALIDATORS.find(v => v.id === (editingValidatorId || selectedValidator))?.name}
                </h3>
                <div
                  className="p-4 rounded-lg space-y-3"
                  style={{
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.bg.secondary,
                  }}
                >
                  {/* Detect PII Validator */}
                  {(editingValidatorId || selectedValidator) === 'detect-pii' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          Type
                        </label>
                        <input
                          type="text"
                          value={validatorConfig.type || 'pii_remover'}
                          onChange={(e) => setValidatorConfig({ ...validatorConfig, type: e.target.value })}
                          className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                          style={{
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          Stage
                        </label>
                        <select
                          value={validatorConfig.stage || 'input'}
                          onChange={(e) => setValidatorConfig({ ...validatorConfig, stage: e.target.value })}
                          className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                          style={{
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        >
                          <option value="input">Input</option>
                          <option value="output">Output</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          On Fail Action
                        </label>
                        <select
                          value={validatorConfig.on_fail_action || 'fix'}
                          onChange={(e) => setValidatorConfig({ ...validatorConfig, on_fail_action: e.target.value })}
                          className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                          style={{
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        >
                          <option value="fix">Fix</option>
                          <option value="exception">Exception</option>
                          <option value="rephrase">Rephrase</option>
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm" style={{ color: colors.text.primary }}>
                          <input
                            type="checkbox"
                            checked={validatorConfig.is_enabled !== undefined ? validatorConfig.is_enabled : true}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, is_enabled: e.target.checked })}
                            style={{ accentColor: colors.accent.primary }}
                          />
                          Enabled
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          Entity Types
                        </label>
                        <div className="space-y-2">
                          {['PERSON', 'PHONE_NUMBER', 'IN_AADHAAR', 'EMAIL_ADDRESS', 'CREDIT_CARD', 'IP_ADDRESS'].map((entity) => (
                            <label key={entity} className="flex items-center gap-2 text-xs" style={{ color: colors.text.primary }}>
                              <input
                                type="checkbox"
                                checked={(validatorConfig.entity_types || ['PERSON', 'PHONE_NUMBER', 'IN_AADHAAR']).includes(entity)}
                                onChange={(e) => {
                                  const current = validatorConfig.entity_types || ['PERSON', 'PHONE_NUMBER', 'IN_AADHAAR'];
                                  const updated = e.target.checked
                                    ? [...current, entity]
                                    : current.filter((t: string) => t !== entity);
                                  setValidatorConfig({ ...validatorConfig, entity_types: updated });
                                }}
                                style={{ accentColor: colors.accent.primary }}
                              />
                              {entity}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          Threshold: {(validatorConfig.threshold !== undefined ? validatorConfig.threshold : 0.6).toFixed(1)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={validatorConfig.threshold !== undefined ? validatorConfig.threshold : 0.6}
                          onChange={(e) => setValidatorConfig({ ...validatorConfig, threshold: parseFloat(e.target.value) })}
                          className="w-full"
                          style={{ accentColor: colors.accent.primary }}
                        />
                      </div>
                    </>
                  )}

                  {/* Lexical Slur Match Validator */}
                  {(editingValidatorId || selectedValidator) === 'lexical-slur-match' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          Stage
                        </label>
                        <select
                          value={validatorConfig.stage || 'input'}
                          onChange={(e) => setValidatorConfig({ ...validatorConfig, stage: e.target.value })}
                          className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                          style={{
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        >
                          <option value="input">Input</option>
                          <option value="output">Output</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          On Fail Action
                        </label>
                        <input
                          type="text"
                          value={validatorConfig.on_fail || 'fix'}
                          onChange={(e) => setValidatorConfig({ ...validatorConfig, on_fail: e.target.value })}
                          className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                          style={{
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm" style={{ color: colors.text.primary }}>
                          <input
                            type="checkbox"
                            checked={validatorConfig.enabled !== undefined ? validatorConfig.enabled : true}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, enabled: e.target.checked })}
                            style={{ accentColor: colors.accent.primary }}
                          />
                          Enabled
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          Languages
                        </label>
                        <div className="space-y-2">
                          {['en', 'hi'].map((lang) => (
                            <label key={lang} className="flex items-center gap-2 text-xs" style={{ color: colors.text.primary }}>
                              <input
                                type="checkbox"
                                checked={(validatorConfig.languages || ['en', 'hi']).includes(lang)}
                                onChange={(e) => {
                                  const current = validatorConfig.languages || ['en', 'hi'];
                                  const updated = e.target.checked
                                    ? [...current, lang]
                                    : current.filter((l: string) => l !== lang);
                                  setValidatorConfig({ ...validatorConfig, languages: updated });
                                }}
                                style={{ accentColor: colors.accent.primary }}
                              />
                              {lang === 'en' ? 'English' : 'Hindi'}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          Severity
                        </label>
                        <input
                          type="text"
                          value={validatorConfig.severity || 'all'}
                          onChange={(e) => setValidatorConfig({ ...validatorConfig, severity: e.target.value })}
                          className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                          style={{
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        />
                      </div>
                    </>
                  )}

                  {/* Gender Assumption Bias Validator */}
                  {(editingValidatorId || selectedValidator) === 'gender-assumption-bias' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          Stage
                        </label>
                        <select
                          value={validatorConfig.stage || 'input'}
                          onChange={(e) => setValidatorConfig({ ...validatorConfig, stage: e.target.value })}
                          className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                          style={{
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        >
                          <option value="input">Input</option>
                          <option value="output">Output</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          On Fail Action
                        </label>
                        <select
                          value={validatorConfig.on_fail_action || 'fix'}
                          onChange={(e) => setValidatorConfig({ ...validatorConfig, on_fail_action: e.target.value })}
                          className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                          style={{
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        >
                          <option value="fix">Fix</option>
                          <option value="exception">Exception</option>
                          <option value="rephrase">Rephrase</option>
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm" style={{ color: colors.text.primary }}>
                          <input
                            type="checkbox"
                            checked={validatorConfig.enabled !== undefined ? validatorConfig.enabled : true}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, enabled: e.target.checked })}
                            style={{ accentColor: colors.accent.primary }}
                          />
                          Enabled
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          Bias Category
                        </label>
                        <select
                          value={validatorConfig.bias_category || 'all'}
                          onChange={(e) => setValidatorConfig({ ...validatorConfig, bias_category: e.target.value })}
                          className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                          style={{
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        >
                          <option value="generic">Generic</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="education">Education</option>
                          <option value="all">All</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Ban List Validator */}
                  {(editingValidatorId || selectedValidator) === 'ban-list' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          Stage
                        </label>
                        <select
                          value={validatorConfig.stage || 'input'}
                          onChange={(e) => setValidatorConfig({ ...validatorConfig, stage: e.target.value })}
                          className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                          style={{
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        >
                          <option value="input">Input</option>
                          <option value="output">Output</option>
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm" style={{ color: colors.text.primary }}>
                          <input
                            type="checkbox"
                            checked={validatorConfig.enabled !== undefined ? validatorConfig.enabled : true}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, enabled: e.target.checked })}
                            style={{ accentColor: colors.accent.primary }}
                          />
                          Enabled
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          On Fail Action
                        </label>
                        <select
                          value={validatorConfig.on_fail_action || 'exception'}
                          onChange={(e) => setValidatorConfig({ ...validatorConfig, on_fail_action: e.target.value })}
                          className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                          style={{
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        >
                          <option value="fix">Fix</option>
                          <option value="exception">Exception</option>
                          <option value="rephrase">Rephrase</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          Ban List
                        </label>
                        <select
                          value={validatorConfig.ban_list_id || ''}
                          onChange={(e) => {
                            if (e.target.value === 'create-new') {
                              setShowCreateBanListModal(true);
                            } else {
                              setValidatorConfig({ ...validatorConfig, ban_list_id: e.target.value });
                            }
                          }}
                          className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                          style={{
                            border: `1px solid ${colors.border}`,
                            backgroundColor: colors.bg.primary,
                            color: colors.text.primary,
                          }}
                        >
                          <option value="">Select a ban list...</option>
                          <option value="create-new" style={{ fontWeight: 600 }}>+ Create New Ban List</option>
                          {banLists.map((list) => (
                            <option key={list.id} value={list.id}>
                              {list.name} ({list.banned_words?.length || 0} words)
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {/* Generic Validator Configuration */}
                  {(editingValidatorId || selectedValidator) !== 'detect-pii' && (editingValidatorId || selectedValidator) !== 'lexical-slur-match' && (editingValidatorId || selectedValidator) !== 'gender-assumption-bias' && (editingValidatorId || selectedValidator) !== 'ban-list' && (
                    <>
                      <div>
                        <label className="flex items-center gap-2 text-sm" style={{ color: colors.text.primary }}>
                          <input
                            type="checkbox"
                            checked={validatorConfig.enabled || false}
                            onChange={(e) => setValidatorConfig({ ...validatorConfig, enabled: e.target.checked })}
                            style={{ accentColor: colors.accent.primary }}
                          />
                          Enabled
                        </label>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: colors.text.primary }}>
                          Threshold: {validatorConfig.threshold || 0.8}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={validatorConfig.threshold || 0.8}
                          onChange={(e) => setValidatorConfig({ ...validatorConfig, threshold: parseFloat(e.target.value) })}
                          className="w-full"
                          style={{ accentColor: colors.accent.primary }}
                        />
                      </div>
                    </>
                  )}

                  <button
                    onClick={() => {
                      const currentValidatorId = editingValidatorId || selectedValidator;
                      const validator = AVAILABLE_VALIDATORS.find(v => v.id === currentValidatorId);
                      if (validator && onSaveValidator) {
                        // Merge default values with user-provided values
                        let finalConfig = { ...validatorConfig };

                        if (currentValidatorId === 'detect-pii') {
                          finalConfig = {
                            type: validatorConfig.type || 'pii_remover',
                            stage: validatorConfig.stage || 'input',
                            on_fail_action: validatorConfig.on_fail_action || 'fix',
                            is_enabled: validatorConfig.is_enabled !== undefined ? validatorConfig.is_enabled : true,
                            entity_types: validatorConfig.entity_types || ['PERSON', 'PHONE_NUMBER', 'IN_AADHAAR'],
                            threshold: validatorConfig.threshold !== undefined ? validatorConfig.threshold : 0.6,
                          };
                        } else if (currentValidatorId === 'lexical-slur-match') {
                          finalConfig = {
                            type: validatorConfig.type || 'uli_slur_match',
                            stage: validatorConfig.stage || 'input',
                            on_fail: validatorConfig.on_fail || 'fix',
                            enabled: validatorConfig.enabled !== undefined ? validatorConfig.enabled : true,
                            languages: validatorConfig.languages || ['en', 'hi'],
                            severity: validatorConfig.severity || 'all',
                          };
                        } else if (currentValidatorId === 'gender-assumption-bias') {
                          finalConfig = {
                            type: validatorConfig.type || 'gender_assumption_bias',
                            stage: validatorConfig.stage || 'input',
                            on_fail_action: validatorConfig.on_fail_action || 'fix',
                            enabled: validatorConfig.enabled !== undefined ? validatorConfig.enabled : true,
                            bias_category: validatorConfig.bias_category || 'all',
                          };
                        } else if (currentValidatorId === 'ban-list') {
                          finalConfig = {
                            type: validatorConfig.type || 'ban_list',
                            stage: validatorConfig.stage || 'input',
                            enabled: validatorConfig.enabled !== undefined ? validatorConfig.enabled : true,
                            on_fail_action: validatorConfig.on_fail_action || 'exception',
                            ban_list_id: validatorConfig.ban_list_id || '',
                          };
                        } else {
                          finalConfig = {
                            type: validatorConfig.type || 'topic_relevance',
                            enabled: validatorConfig.enabled || false,
                            threshold: validatorConfig.threshold || 0.8,
                          };
                        }

                        // If editing, remove the old validator first, then add updated one
                        if (editingValidatorIndex !== null && onRemoveValidator) {
                          onRemoveValidator(editingValidatorIndex);
                        }

                        // Save the validator (create new or update)
                        onSaveValidator({
                          id: validator.id,
                          name: validator.name,
                          description: validator.description,
                          tags: validator.tags,
                          config: finalConfig
                        });

                        // Reset state
                        setValidatorConfig({});
                        setEditingValidatorIndex(null);
                        setEditingValidatorId(null);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-md text-sm font-semibold"
                    style={{
                      backgroundColor: colors.status.success,
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {editingValidatorId ? 'Update Validator' : 'Save Validator'}
                  </button>
                </div>
              </div>
            )}

            {/* No Validator Selected - Empty State */}
            {!selectedValidator && savedValidators.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <svg
                  className="w-16 h-16 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: colors.text.secondary, opacity: 0.5 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <p
                  className="text-sm font-medium text-center"
                  style={{ color: colors.text.secondary }}
                >
                  Select any validator from the list
                </p>
                <p
                  className="text-xs text-center mt-2"
                  style={{ color: colors.text.secondary, opacity: 0.7 }}
                >
                  Choose a validator to configure its settings
                </p>
              </div>
            )}

            {/* Saved Validators */}
            {savedValidators.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                    Configured Validators ({savedValidators.length})
                  </h3>
                  {!isEditMode && (
                    <button
                      onClick={() => setShowVersionWarningModal(true)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5"
                      style={{
                        backgroundColor: colors.bg.primary,
                        color: colors.text.primary,
                        border: `1px solid ${colors.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  )}
                </div>

                {/* Input Validators */}
                {(() => {
                  const inputValidators = savedValidators.filter(v => (v.config?.stage || 'input') === 'input');
                  return inputValidators.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold mb-2" style={{ color: colors.text.secondary }}>
                        Input Validators
                      </h4>
                      <div className="space-y-2">
                        {inputValidators.map((validator) => {
                          const originalIdx = savedValidators.indexOf(validator);
                          const isSelected = editingValidatorIndex === originalIdx;
                          return (
                            <div
                              key={originalIdx}
                              className="p-3 rounded-lg"
                              style={{
                                border: `1px solid ${isSelected ? colors.accent.primary : colors.border}`,
                                backgroundColor: isSelected ? colors.bg.secondary : colors.bg.primary,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-2">
                                  <div>
                                    <div className="font-semibold text-sm" style={{ color: colors.text.primary }}>
                                      {validator.name}
                                    </div>
                                    <div className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                                      {(() => {
                                        const isEnabled = validator.config?.is_enabled ?? validator.config?.enabled ?? true;
                                        return isEnabled ? 'Enabled' : 'Disabled';
                                      })()}
                                    </div>
                                  </div>
                                </div>
                                {isEditMode && (
                                  <div className="flex items-center gap-2">
                                    {/* Remove Button */}
                                    <button
                                      onClick={() => onRemoveValidator && onRemoveValidator(originalIdx)}
                                      className="p-1.5 rounded-md transition-colors"
                                      style={{
                                        backgroundColor: colors.bg.secondary,
                                        border: 'none',
                                        cursor: 'pointer',
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                                      title="Remove validator"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: colors.status.error }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Output Validators */}
                {(() => {
                  const outputValidators = savedValidators.filter(v => v.config?.stage === 'output');
                  return outputValidators.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-2" style={{ color: colors.text.secondary }}>
                        Output Validators
                      </h4>
                      <div className="space-y-2">
                        {outputValidators.map((validator) => {
                          const originalIdx = savedValidators.indexOf(validator);
                          const isSelected = editingValidatorIndex === originalIdx;
                          return (
                            <div
                              key={originalIdx}
                              className="p-3 rounded-lg"
                              style={{
                                border: `1px solid ${isSelected ? colors.accent.primary : colors.border}`,
                                backgroundColor: isSelected ? colors.bg.secondary : colors.bg.primary,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-2">
                                  <div>
                                    <div className="font-semibold text-sm" style={{ color: colors.text.primary }}>
                                      {validator.name}
                                    </div>
                                    <div className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                                      {(() => {
                                        const isEnabled = validator.config?.is_enabled ?? validator.config?.enabled ?? true;
                                        return isEnabled ? 'Enabled' : 'Disabled';
                                      })()}
                                    </div>
                                  </div>
                                </div>
                                {isEditMode && (
                                  <div className="flex items-center gap-2">
                                    {/* Remove Button */}
                                    <button
                                      onClick={() => onRemoveValidator && onRemoveValidator(originalIdx)}
                                      className="p-1.5 rounded-md transition-colors"
                                      style={{
                                        backgroundColor: colors.bg.secondary,
                                        border: 'none',
                                        cursor: 'pointer',
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                                      title="Remove validator"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: colors.status.error }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Back Button */}
          <div
            className="p-4 border-t"
            style={{ borderColor: colors.border }}
          >
            <button
              onClick={() => {
                // Only show modal if validators have changed
                if (validatorsChanged()) {
                  setShowExitModal(true);
                } else {
                  // No changes, exit directly
                  if (onExitGuardrailsMode) {
                    onExitGuardrailsMode();
                    setValidatorConfig({});
                    setIsEditMode(false);
                  }
                }
              }}
              className="w-full px-4 py-2 rounded-md text-sm font-semibold"
              style={{
                backgroundColor: colors.bg.primary,
                color: colors.text.primary,
                border: `1px solid ${colors.border}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
            >
              ← Back to Main Config
            </button>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
            onClick={() => setShowExitModal(false)}
          />

          {/* Modal */}
          <div
            className="fixed top-1/2 left-1/2 z-50 w-full max-w-md rounded-lg shadow-lg p-6"
            style={{
              transform: 'translate(-50%, -50%)',
              backgroundColor: colors.bg.primary,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div className="flex items-start gap-4">
              <svg
                className="w-6 h-6 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: colors.accent.primary }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <div className="flex-1">
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: colors.text.primary }}
                >
                  Confirm Guardrails Configuration
                </h3>
                <p className="text-sm mb-6" style={{ color: colors.text.secondary }}>
                  Do you want to go ahead with using the validators you have configured?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowExitModal(false)}
                    className="px-4 py-2 rounded-md text-sm font-medium"
                    style={{
                      backgroundColor: colors.bg.secondary,
                      color: colors.text.primary,
                      border: `1px solid ${colors.border}`,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowExitModal(false);
                      if (onExitGuardrailsMode) {
                        onExitGuardrailsMode();
                        setValidatorConfig({});
                        setIsEditMode(false);
                      }
                    }}
                    className="px-4 py-2 rounded-md text-sm font-semibold"
                    style={{
                      backgroundColor: colors.status.success,
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Version Warning Modal */}
      {showVersionWarningModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
            onClick={() => setShowVersionWarningModal(false)}
          />

          {/* Modal */}
          <div
            className="fixed top-1/2 left-1/2 z-50 w-full max-w-md rounded-lg shadow-lg p-6"
            style={{
              transform: 'translate(-50%, -50%)',
              backgroundColor: colors.bg.primary,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3
                  className="text-lg font-semibold mb-2"
                  style={{ color: colors.text.primary }}
                >
                  Edit Guardrails Configuration
                </h3>
                <p className="text-sm mb-6" style={{ color: colors.text.secondary }}>
                  If you edit these validators, a whole new version of the configuration will be created when you save. Do you want to continue?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowVersionWarningModal(false)}
                    className="px-4 py-2 rounded-md text-sm font-medium"
                    style={{
                      backgroundColor: colors.bg.secondary,
                      color: colors.text.primary,
                      border: `1px solid ${colors.border}`,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowVersionWarningModal(false);
                      setIsEditMode(true);
                    }}
                    className="px-4 py-2 rounded-md text-sm font-semibold"
                    style={{
                      backgroundColor: colors.accent.primary,
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Okay, Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Ban List Modal */}
      {showCreateBanListModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}
            onClick={() => {
              setShowCreateBanListModal(false);
              setNewBanList({ name: '', description:'', banned_words: '', domain: '', is_public: false });
            }}
          />

          {/* Modal */}
          <div
            className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg rounded-lg shadow-lg p-6"
            style={{
              transform: 'translate(-50%, -50%)',
              backgroundColor: colors.bg.primary,
              border: `1px solid ${colors.border}`,
            }}
          >
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: colors.text.primary }}
            >
              Create New Ban List
            </h3>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: colors.text.primary }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={newBanList.name}
                  onChange={(e) => setNewBanList({ ...newBanList, name: e.target.value })}
                  placeholder="e.g., profanity-filter"
                  className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                  style={{
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.bg.primary,
                    color: colors.text.primary,
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: colors.text.primary }}>
                  Description *
                </label>
                <input
                  type="text"
                  value={newBanList.description}
                  onChange={(e) => setNewBanList({ ...newBanList, description: e.target.value })}
                  placeholder="e.g., profanity-filter"
                  className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                  style={{
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.bg.primary,
                    color: colors.text.primary,
                  }}
                />
              </div>

              {/* Banned Words */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: colors.text.primary }}>
                  Banned Words *
                </label>
                <textarea
                  value={newBanList.banned_words}
                  onChange={(e) => setNewBanList({ ...newBanList, banned_words: e.target.value })}
                  placeholder="Enter words separated by commas or new lines&#10;e.g., word1, word2&#10;word3"
                  rows={5}
                  className="w-full px-3 py-2 rounded-md text-sm focus:outline-none resize-none"
                  style={{
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.bg.primary,
                    color: colors.text.primary,
                  }}
                />
                <p className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                  Separate words with commas or new lines
                </p>
              </div>

              {/* Domain */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: colors.text.primary }}>
                  Domain
                </label>
                <input
                  type="text"
                  value={newBanList.domain}
                  onChange={(e) => setNewBanList({ ...newBanList, domain: e.target.value })}
                  placeholder="e.g., general, healthcare"
                  className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
                  style={{
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.bg.primary,
                    color: colors.text.primary,
                  }}
                />
              </div>

              {/* Is Public */}
              <div>
                <label className="flex items-center gap-2 text-sm" style={{ color: colors.text.primary }}>
                  <input
                    type="checkbox"
                    checked={newBanList.is_public}
                    onChange={(e) => setNewBanList({ ...newBanList, is_public: e.target.checked })}
                    style={{ accentColor: colors.accent.primary }}
                  />
                  Make this ban list public
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowCreateBanListModal(false);
                  setNewBanList({ name: '', banned_words: '', domain: '', is_public: false });
                }}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.primary,
                  border: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBanList}
                disabled={!newBanList.name.trim() || !newBanList.banned_words.trim()}
                className="px-4 py-2 rounded-md text-sm font-semibold"
                style={{
                  backgroundColor: !newBanList.name.trim() || !newBanList.banned_words.trim()
                    ? colors.bg.secondary
                    : colors.status.success,
                  color: !newBanList.name.trim() || !newBanList.banned_words.trim()
                    ? colors.text.secondary
                    : '#ffffff',
                  border: 'none',
                  cursor: !newBanList.name.trim() || !newBanList.banned_words.trim()
                    ? 'not-allowed'
                    : 'pointer',
                }}
              >
                Create Ban List
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
