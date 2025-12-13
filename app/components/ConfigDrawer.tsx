/**
 * ConfigDrawer - Right-side drawer for configuration management
 *
 * Tabs:
 * - Current: Edit and save current config
 * - Saved: List of saved configs with load/diff actions
 * - Compare: Side-by-side config comparison
 */

"use client"
import { useState } from 'react';

interface SavedConfig {
  id: string;
  name: string;
  version: number;
  timestamp: number;
  instructions: string;
  modelName: string;
  provider: string;
  temperature: number;
  vectorStoreIds: string;
}

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
  };
  onConfigChange: (field: string, value: any) => void;
  onSaveConfig: () => void;
  onLoadConfig: (config: SavedConfig) => void;
  onApplyConfig: (configId: string) => void;
}

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
  onConfigChange,
  onSaveConfig,
  onLoadConfig,
  onApplyConfig,
}: ConfigDrawerProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'saved' | 'compare'>('current');
  const [leftConfigId, setLeftConfigId] = useState<string>('current');
  const [rightConfigId, setRightConfigId] = useState<string>('');

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
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

  // Handle quick compare
  const handleQuickCompare = (configId: string) => {
    setLeftConfigId('current');
    setRightConfigId(configId);
    setActiveTab('compare');
  };

  // Swap comparison
  const handleSwap = () => {
    const temp = leftConfigId;
    setLeftConfigId(rightConfigId);
    setRightConfigId(temp);
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
        className="fixed right-0 top-0 bottom-0 w-96 z-50 flex flex-col"
        style={{
          backgroundColor: '#ffffff',
          borderLeft: '1px solid #e5e5e5',
          boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
          animation: 'slideInRight 0.3s ease'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#e5e5e5' }}>
          <h2 className="text-lg font-semibold" style={{ color: '#171717' }}>
            ⚙️ Configuration
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md"
            style={{
              color: '#737373',
              backgroundColor: 'transparent',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fafafa';
              e.currentTarget.style.color = '#171717';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#737373';
            }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: '#e5e5e5' }}>
          {(['current', 'saved', 'compare'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 px-4 py-3 text-sm font-medium"
              style={{
                color: activeTab === tab ? '#171717' : '#737373',
                borderBottom: activeTab === tab ? '2px solid #171717' : '2px solid transparent',
                backgroundColor: activeTab === tab ? '#fafafa' : 'transparent',
                transition: 'all 0.15s ease'
              }}
            >
              {tab === 'current' ? 'Current' : tab === 'saved' ? 'Saved' : 'Compare'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'current' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#737373' }}>
                  Config Name
                </label>
                <input
                  type="text"
                  value={currentConfig.name}
                  onChange={(e) => onConfigChange('name', e.target.value)}
                  placeholder="e.g., FAQ Config"
                  className="w-full px-3 py-2 rounded-md border text-sm focus:outline-none"
                  style={{
                    borderColor: '#e5e5e5',
                    backgroundColor: '#ffffff',
                    color: '#171717'
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#737373' }}>
                  Provider
                </label>
                <select
                  value={currentConfig.provider}
                  onChange={(e) => onConfigChange('provider', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border text-sm focus:outline-none"
                  style={{
                    borderColor: '#e5e5e5',
                    backgroundColor: '#ffffff',
                    color: '#171717'
                  }}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#737373' }}>
                  Model
                </label>
                <input
                  type="text"
                  value={currentConfig.modelName}
                  onChange={(e) => onConfigChange('modelName', e.target.value)}
                  placeholder="e.g., gpt-4"
                  className="w-full px-3 py-2 rounded-md border text-sm focus:outline-none"
                  style={{
                    borderColor: '#e5e5e5',
                    backgroundColor: '#ffffff',
                    color: '#171717'
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#737373' }}>
                  Temperature: {currentConfig.temperature.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={currentConfig.temperature}
                  onChange={(e) => onConfigChange('temperature', parseFloat(e.target.value))}
                  className="w-full"
                  style={{ accentColor: '#171717' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: '#737373' }}>
                  Vector Store IDs
                </label>
                <input
                  type="text"
                  value={currentConfig.vectorStoreIds}
                  onChange={(e) => onConfigChange('vectorStoreIds', e.target.value)}
                  placeholder="vs_123, vs_456"
                  className="w-full px-3 py-2 rounded-md border text-sm focus:outline-none"
                  style={{
                    borderColor: '#e5e5e5',
                    backgroundColor: '#ffffff',
                    color: '#171717'
                  }}
                />
              </div>

              <button
                onClick={onSaveConfig}
                className="w-full px-4 py-2 rounded-md text-sm font-medium"
                style={{
                  backgroundColor: '#171717',
                  color: '#ffffff',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#404040'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#171717'}
              >
                💾 Save Config
              </button>
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="space-y-3">
              <div className="text-xs font-semibold mb-3" style={{ color: '#737373' }}>
                📚 Recent Configurations
              </div>
              {savedConfigs.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-6 text-center" style={{ borderColor: '#e5e5e5' }}>
                  <p className="text-sm" style={{ color: '#737373' }}>
                    No saved configurations yet
                  </p>
                </div>
              ) : (
                savedConfigs.map((config) => (
                  <div
                    key={config.id}
                    className="border rounded-lg p-3"
                    style={{
                      backgroundColor: '#fafafa',
                      borderColor: '#e5e5e5',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div className="mb-2">
                      <div className="text-sm font-medium" style={{ color: '#171717' }}>
                        {config.name} v{config.version}
                      </div>
                      <div className="text-xs" style={{ color: '#737373' }}>
                        {formatTimestamp(config.timestamp)} • {config.modelName}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onLoadConfig(config)}
                        className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium"
                        style={{
                          backgroundColor: '#ffffff',
                          borderWidth: '1px',
                          borderColor: '#e5e5e5',
                          color: '#171717',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                      >
                        📥 Load
                      </button>
                      <button
                        onClick={() => handleQuickCompare(config.id)}
                        className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium"
                        style={{
                          backgroundColor: '#ffffff',
                          borderWidth: '1px',
                          borderColor: '#e5e5e5',
                          color: '#171717',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                      >
                        🔍 Diff
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="space-y-4">
              <div className="text-xs font-semibold mb-3" style={{ color: '#737373' }}>
                🔄 Compare Configurations
              </div>

              {/* Comparison Selectors */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: '#737373' }}>Left:</label>
                  <select
                    value={leftConfigId}
                    onChange={(e) => setLeftConfigId(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border text-xs focus:outline-none"
                    style={{
                      borderColor: '#e5e5e5',
                      backgroundColor: '#ffffff',
                      color: '#171717'
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
                      backgroundColor: '#ffffff',
                      borderWidth: '1px',
                      borderColor: '#e5e5e5',
                      color: '#737373',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fafafa';
                      e.currentTarget.style.color = '#171717';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.color = '#737373';
                    }}
                  >
                    ↔️ Swap
                  </button>
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: '#737373' }}>Right:</label>
                  <select
                    value={rightConfigId}
                    onChange={(e) => setRightConfigId(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border text-xs focus:outline-none"
                    style={{
                      borderColor: '#e5e5e5',
                      backgroundColor: '#ffffff',
                      color: '#171717'
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
                    <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#e5e5e5' }}>
                      <div className="grid grid-cols-2 border-b" style={{ borderColor: '#e5e5e5', backgroundColor: '#fafafa' }}>
                        <div className="px-2 py-1.5 text-xs font-semibold" style={{ color: '#171717' }}>
                          {leftContent.label}
                        </div>
                        <div className="px-2 py-1.5 text-xs font-semibold border-l" style={{ color: '#171717', borderColor: '#e5e5e5' }}>
                          {rightContent.label}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 max-h-64 overflow-auto font-mono text-xs">
                        <div style={{ backgroundColor: '#ffffff' }}>
                          {left.map((line, idx) => (
                            <div
                              key={idx}
                              className="px-2 py-0.5"
                              style={{
                                backgroundColor: line.type === 'removed' ? '#fee2e2' : line.type === 'added' ? 'transparent' : '#ffffff',
                                color: line.type === 'removed' ? '#dc2626' : '#171717',
                                minHeight: '20px',
                                fontSize: '11px'
                              }}
                            >
                              {line.type === 'removed' && '- '}
                              {line.content || '\u00A0'}
                            </div>
                          ))}
                        </div>
                        <div className="border-l" style={{ borderColor: '#e5e5e5', backgroundColor: '#ffffff' }}>
                          {right.map((line, idx) => (
                            <div
                              key={idx}
                              className="px-2 py-0.5"
                              style={{
                                backgroundColor: line.type === 'added' ? '#dcfce7' : line.type === 'removed' ? 'transparent' : '#ffffff',
                                color: line.type === 'added' ? '#15803d' : '#171717',
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
                          backgroundColor: leftConfigId === 'current' ? '#fafafa' : '#ffffff',
                          borderWidth: '1px',
                          borderColor: '#e5e5e5',
                          color: leftConfigId === 'current' ? '#737373' : '#171717',
                          cursor: leftConfigId === 'current' ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (leftConfigId !== 'current') e.currentTarget.style.backgroundColor = '#fafafa';
                        }}
                        onMouseLeave={(e) => {
                          if (leftConfigId !== 'current') e.currentTarget.style.backgroundColor = '#ffffff';
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
                          backgroundColor: rightConfigId === 'current' ? '#fafafa' : '#ffffff',
                          borderWidth: '1px',
                          borderColor: '#e5e5e5',
                          color: rightConfigId === 'current' ? '#737373' : '#171717',
                          cursor: rightConfigId === 'current' ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (rightConfigId !== 'current') e.currentTarget.style.backgroundColor = '#fafafa';
                        }}
                        onMouseLeave={(e) => {
                          if (rightConfigId !== 'current') e.currentTarget.style.backgroundColor = '#ffffff';
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

      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
