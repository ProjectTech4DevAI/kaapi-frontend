/**
 * ConfigDrawer - Enhanced configuration management drawer
 * Following the pattern from prompt-editor/ConfigDrawer.tsx
 * Updated to work with backend API config structure
 */

"use client"
import React, { useState } from 'react';
import { colors } from '@/app/lib/colors';
import { SavedConfig } from './SimplifiedConfigEditor';
import { Tool } from '@/app/lib/configTypes';

interface DiffLine {
  type: 'same' | 'added' | 'removed';
  content: string;
  lineNumber: number;
}

interface ConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedConfigs: SavedConfig[];
  currentConfig: {
    name: string;
    instructions: string;
    modelName: string;
    provider: string;
    temperature: number;
    vectorStoreIds: string;
    tools?: Tool[];
    commitMessage?: string;
  };
  selectedConfigId: string;
  onConfigChange: (field: string, value: any) => void;
  onSaveConfig: () => void;
  onLoadConfig: (config: SavedConfig) => void;
  onApplyConfig: (configId: string) => void;
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

// Simple diff utility
function generateDiff(text1: string, text2: string): { left: DiffLine[], right: DiffLine[] } {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const left: DiffLine[] = [];
  const right: DiffLine[] = [];
  const maxLen = Math.max(lines1.length, lines2.length);

  for (let i = 0; i < maxLen; i++) {
    const line1 = lines1[i] !== undefined ? lines1[i] : null;
    const line2 = lines2[i] !== undefined ? lines2[i] : null;

    if (line1 === null && line2 !== null) {
      left.push({ type: 'same', content: '', lineNumber: i + 1 });
      right.push({ type: 'added', content: line2, lineNumber: i + 1 });
    } else if (line1 !== null && line2 === null) {
      left.push({ type: 'removed', content: line1, lineNumber: i + 1 });
      right.push({ type: 'same', content: '', lineNumber: i + 1 });
    } else if (line1 !== line2) {
      left.push({ type: 'removed', content: line1 || '', lineNumber: i + 1 });
      right.push({ type: 'added', content: line2 || '', lineNumber: i + 1 });
    } else {
      left.push({ type: 'same', content: line1 || '', lineNumber: i + 1 });
      right.push({ type: 'same', content: line2 || '', lineNumber: i + 1 });
    }
  }

  return { left, right };
}

export default function ConfigDrawer({
  isOpen,
  onClose,
  savedConfigs,
  currentConfig,
  selectedConfigId,
  onConfigChange,
  onSaveConfig,
  onLoadConfig,
  onApplyConfig,
}: ConfigDrawerProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'saved' | 'compare'>('current');
  const [leftConfigId, setLeftConfigId] = useState<string>('current');
  const [rightConfigId, setRightConfigId] = useState<string>('');
  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(new Set());
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Sync isCreatingNew with selectedConfigId
  React.useEffect(() => {
    if (selectedConfigId) {
      setIsCreatingNew(false);
    }
  }, [selectedConfigId]);

  // Toggle expand/collapse
  const toggleExpand = (configId: string) => {
    const newExpanded = new Set(expandedConfigs);
    if (newExpanded.has(configId)) {
      newExpanded.delete(configId);
    } else {
      newExpanded.add(configId);
    }
    setExpandedConfigs(newExpanded);
  };

  // Group saved configs by name
  const groupedConfigs = savedConfigs.reduce((acc, config) => {
    if (!acc[config.name]) {
      acc[config.name] = [];
    }
    acc[config.name].push(config);
    return acc;
  }, {} as Record<string, SavedConfig[]>);

  // Sort versions within each group (newest first)
  Object.keys(groupedConfigs).forEach(name => {
    groupedConfigs[name].sort((a, b) => b.version - a.version);
  });

  // Format timestamp - calculate relative time from UTC timestamps
  const formatTimestamp = (timestamp: number | string) => {
    const now = Date.now(); // Current time in UTC milliseconds
    const date = typeof timestamp === 'string'
      ? new Date(timestamp).getTime() // Parse UTC timestamp to milliseconds
      : timestamp;

    // Calculate difference (works the same in any timezone)
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  // Get content for comparison
  const getContentForComparison = (configId: string) => {
    if (configId === 'current') {
      return { ...currentConfig, label: 'Current (unsaved)' };
    }
    const config = savedConfigs.find(c => c.id === configId);
    if (config) {
      return { ...config, label: `${config.name} v${config.version}` };
    }
    return null;
  };

  // Build compare options
  const buildCompareOptions = () => [
    { value: 'current', label: '📝 Current (unsaved)' },
    ...savedConfigs.map(c => ({
      value: c.id,
      label: `${c.name} v${c.version} · ${formatTimestamp(c.timestamp)}`
    }))
  ];

  // Swap comparison
  const handleSwap = () => {
    const temp = leftConfigId;
    setLeftConfigId(rightConfigId);
    setRightConfigId(temp);
  };

  // Handle load config
  const handleLoadConfigLocal = (configId: string) => {
    const config = savedConfigs.find(c => c.id === configId);
    if (config) {
      onLoadConfig(config);
      setIsCreatingNew(false);
    }
  };

  // Tools management
  const tools = currentConfig.tools || [];

  const addTool = () => {
    const newTools = [
      ...tools,
      {
        type: 'file_search' as const,
        knowledge_base_ids: [''],
        max_num_results: 20,
      },
    ];
    onConfigChange('tools', newTools);
  };

  const removeTool = (index: number) => {
    const newTools = tools.filter((_, i) => i !== index);
    onConfigChange('tools', newTools);
  };

  const updateTool = (index: number, field: keyof Tool, value: any) => {
    const newTools = [...tools];
    if (field === 'knowledge_base_ids') {
      newTools[index][field] = [value];
    } else {
      (newTools[index] as any)[field] = value;
    }
    onConfigChange('tools', newTools);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 w-[420px] z-50 flex flex-col"
        style={{
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: colors.bg.primary,
          borderLeft: `1px solid ${colors.border}`,
          boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Header with Tabs */}
        <div
          style={{
            padding: '20px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setActiveTab('current')}
              style={{
                padding: '6px 12px',
                backgroundColor: activeTab === 'current' ? colors.accent.primary : 'transparent',
                color: activeTab === 'current' ? '#ffffff' : colors.text.primary,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              Current
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              style={{
                padding: '6px 12px',
                backgroundColor: activeTab === 'saved' ? colors.accent.primary : 'transparent',
                color: activeTab === 'saved' ? '#ffffff' : colors.text.primary,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              Saved
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              style={{
                padding: '6px 12px',
                backgroundColor: activeTab === 'compare' ? colors.accent.primary : 'transparent',
                color: activeTab === 'compare' ? '#ffffff' : colors.text.primary,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              Compare
            </button>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: colors.text.secondary,
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
          }}
        >
          {/* CURRENT TAB */}
          {activeTab === 'current' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Config Selector */}
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
                            handleLoadConfigLocal(e.target.value);
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
                        {savedConfigs.map((config) => (
                          <option key={config.id} value={config.id}>
                            {config.name} (v{config.version})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          setIsCreatingNew(true);
                          onConfigChange('name', '');
                          onConfigChange('selectedConfigId', '');
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
                        value={currentConfig.name}
                        onChange={(e) => onConfigChange('name', e.target.value)}
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

              {/* Provider */}
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
                  value={currentConfig.provider}
                  onChange={(e) => {
                    onConfigChange('provider', e.target.value);
                    // Reset model when provider changes
                    const newProvider = e.target.value as keyof typeof MODEL_OPTIONS;
                    onConfigChange('modelName', MODEL_OPTIONS[newProvider][0].value);
                  }}
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

              {/* Model */}
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
                  value={currentConfig.modelName}
                  onChange={(e) => onConfigChange('modelName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                    backgroundColor: colors.bg.primary,
                  }}
                >
                  {MODEL_OPTIONS[currentConfig.provider as keyof typeof MODEL_OPTIONS].map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Instructions */}
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
                  Instructions
                </label>
                <textarea
                  value={currentConfig.instructions}
                  onChange={(e) => onConfigChange('instructions', e.target.value)}
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

              {/* Temperature */}
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
                  Temperature: {currentConfig.temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={currentConfig.temperature}
                  onChange={(e) => onConfigChange('temperature', parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: colors.accent.primary }}
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
                        value={tool.knowledge_base_ids[0] || ''}
                        onChange={(e) => updateTool(index, 'knowledge_base_ids', e.target.value)}
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
                  value={currentConfig.commitMessage || ''}
                  onChange={(e) => onConfigChange('commitMessage', e.target.value)}
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
          )}

          {/* SAVED TAB */}
          {activeTab === 'saved' && (
            <div className="space-y-3">
              <div className="text-xs font-semibold mb-3" style={{ color: colors.text.secondary }}>
                📚 Saved Configurations
              </div>
              {Object.keys(groupedConfigs).length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-6 text-center" style={{ borderColor: colors.border }}>
                  <p className="text-sm" style={{ color: colors.text.secondary }}>
                    No saved configurations yet
                  </p>
                </div>
              ) : (
                Object.entries(groupedConfigs).map(([configName, versions]) => {
                  const isExpanded = expandedConfigs.has(configName);
                  const latestVersion = versions[0];
                  return (
                    <div
                      key={configName}
                      className="border rounded-lg overflow-hidden"
                      style={{
                        borderColor: colors.border,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Config Header */}
                      <div
                        onClick={() => toggleExpand(configName)}
                        className="p-3 cursor-pointer"
                        style={{
                          backgroundColor: colors.bg.secondary,
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-sm" style={{ color: colors.text.secondary }}>
                            {isExpanded ? '▼' : '▶'}
                          </span>
                          <div className="flex-1">
                            <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                              {configName}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>
                              {versions.length} version{versions.length > 1 ? 's' : ''} • Latest: {latestVersion.provider}/{latestVersion.modelName}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Versions List */}
                      {isExpanded && (
                        <div className="border-t" style={{ borderColor: colors.border }}>
                          {versions.map((version, idx) => (
                            <div
                              key={version.id}
                              className="p-3 border-l-2"
                              style={{
                                backgroundColor: idx === 0 ? '#f0fdf4' : colors.bg.primary,
                                borderLeftColor: idx === 0 ? colors.status.success : colors.border,
                                marginLeft: '12px',
                                borderTop: idx > 0 ? `1px solid ${colors.border}` : 'none'
                              }}
                            >
                              <div className="flex items-start gap-2 mb-2">
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: colors.bg.secondary,
                                    color: colors.text.primary,
                                    border: `1px solid ${colors.border}`
                                  }}
                                >
                                  v{version.version}
                                </span>
                                {idx === 0 && (
                                  <span
                                    className="px-2 py-0.5 rounded text-xs font-medium"
                                    style={{
                                      backgroundColor: '#dcfce7',
                                      color: '#15803d',
                                      border: '1px solid #86efac'
                                    }}
                                  >
                                    Latest
                                  </span>
                                )}
                              </div>
                              <div className="text-xs mb-2" style={{ color: colors.text.secondary }}>
                                {formatTimestamp(version.timestamp)} • {version.provider}/{version.modelName} • T:{version.temperature}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    onLoadConfig(version);
                                    setIsCreatingNew(false);
                                  }}
                                  className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium"
                                  style={{
                                    backgroundColor: colors.bg.primary,
                                    borderWidth: '1px',
                                    borderColor: colors.border,
                                    color: colors.text.primary,
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
                                >
                                  📥 Load
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLeftConfigId('current');
                                    setRightConfigId(version.id);
                                    setActiveTab('compare');
                                  }}
                                  className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium"
                                  style={{
                                    backgroundColor: colors.bg.primary,
                                    borderWidth: '1px',
                                    borderColor: colors.border,
                                    color: colors.text.primary,
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
                                >
                                  🔍 Diff
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* COMPARE TAB */}
          {activeTab === 'compare' && (
            <div className="space-y-4">
              <div className="text-xs font-semibold mb-3" style={{ color: colors.text.secondary }}>
                🔄 Compare Configurations
              </div>

              {/* Comparison Selectors */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: colors.text.secondary }}>Left:</label>
                  <select
                    value={leftConfigId}
                    onChange={(e) => setLeftConfigId(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border text-xs focus:outline-none"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.bg.primary,
                      color: colors.text.primary
                    }}
                  >
                    {buildCompareOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-center">
                  <button
                    onClick={handleSwap}
                    className="px-3 py-1.5 rounded-md text-xs font-medium"
                    style={{
                      backgroundColor: colors.bg.primary,
                      borderWidth: '1px',
                      borderColor: colors.border,
                      color: colors.text.secondary,
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.bg.secondary;
                      e.currentTarget.style.color = colors.text.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = colors.bg.primary;
                      e.currentTarget.style.color = colors.text.secondary;
                    }}
                  >
                    ↔️ Swap
                  </button>
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: colors.text.secondary }}>Right:</label>
                  <select
                    value={rightConfigId}
                    onChange={(e) => setRightConfigId(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border text-xs focus:outline-none"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.bg.primary,
                      color: colors.text.primary
                    }}
                  >
                    <option value="">Select config...</option>
                    {buildCompareOptions().map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Diff View */}
              {rightConfigId && (() => {
                const leftContent = getContentForComparison(leftConfigId);
                const rightContent = getContentForComparison(rightConfigId);
                if (!leftContent || !rightContent) return null;

                const { left, right } = generateDiff(leftContent.instructions, rightContent.instructions);

                return (
                  <div className="space-y-3">
                    <div className="border rounded-lg overflow-hidden" style={{ borderColor: colors.border }}>
                      <div className="grid grid-cols-2 border-b" style={{ borderColor: colors.border, backgroundColor: colors.bg.secondary }}>
                        <div className="px-2 py-1.5 text-xs font-semibold" style={{ color: colors.text.primary }}>
                          {leftContent.label}
                        </div>
                        <div className="px-2 py-1.5 text-xs font-semibold border-l" style={{ color: colors.text.primary, borderColor: colors.border }}>
                          {rightContent.label}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 max-h-64 overflow-auto font-mono text-xs">
                        <div style={{ backgroundColor: colors.bg.primary }}>
                          {left.map((line, idx) => (
                            <div
                              key={idx}
                              className="px-2 py-0.5"
                              style={{
                                backgroundColor: line.type === 'removed' ? '#fee2e2' : line.type === 'added' ? 'transparent' : colors.bg.primary,
                                color: line.type === 'removed' ? colors.status.error : colors.text.primary,
                                minHeight: '20px',
                                fontSize: '11px'
                              }}
                            >
                              {line.type === 'removed' && '- '}
                              {line.content || '\u00A0'}
                            </div>
                          ))}
                        </div>
                        <div className="border-l" style={{ borderColor: colors.border, backgroundColor: colors.bg.primary }}>
                          {right.map((line, idx) => (
                            <div
                              key={idx}
                              className="px-2 py-0.5"
                              style={{
                                backgroundColor: line.type === 'added' ? '#dcfce7' : line.type === 'removed' ? 'transparent' : colors.bg.primary,
                                color: line.type === 'added' ? '#15803d' : colors.text.primary,
                                minHeight: '20px',
                                fontSize: '11px'
                              }}
                            >
                              {line.type === 'added' && '+ '}
                              {line.content || '\u00A0'}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Apply Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onApplyConfig(leftConfigId);
                          onClose();
                        }}
                        disabled={leftConfigId === 'current'}
                        className="flex-1 px-3 py-2 rounded-md text-xs font-medium"
                        style={{
                          backgroundColor: leftConfigId === 'current' ? colors.bg.secondary : colors.bg.primary,
                          borderWidth: '1px',
                          borderColor: colors.border,
                          color: leftConfigId === 'current' ? colors.text.secondary : colors.text.primary,
                          cursor: leftConfigId === 'current' ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (leftConfigId !== 'current') e.currentTarget.style.backgroundColor = colors.bg.secondary;
                        }}
                        onMouseLeave={(e) => {
                          if (leftConfigId !== 'current') e.currentTarget.style.backgroundColor = colors.bg.primary;
                        }}
                      >
                        ← Use Left
                      </button>
                      <button
                        onClick={() => {
                          onApplyConfig(rightConfigId);
                          onClose();
                        }}
                        disabled={rightConfigId === 'current'}
                        className="flex-1 px-3 py-2 rounded-md text-xs font-medium"
                        style={{
                          backgroundColor: rightConfigId === 'current' ? colors.bg.secondary : colors.bg.primary,
                          borderWidth: '1px',
                          borderColor: colors.border,
                          color: rightConfigId === 'current' ? colors.text.secondary : colors.text.primary,
                          cursor: rightConfigId === 'current' ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (rightConfigId !== 'current') e.currentTarget.style.backgroundColor = colors.bg.secondary;
                        }}
                        onMouseLeave={(e) => {
                          if (rightConfigId !== 'current') e.currentTarget.style.backgroundColor = colors.bg.primary;
                        }}
                      >
                        Use Right →
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
