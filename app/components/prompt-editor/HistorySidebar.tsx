import React, { useState } from 'react';
import { colors } from '@/app/lib/colors';
import { SavedConfig } from '@/app/lib/useConfigs';

interface HistorySidebarProps {
  savedConfigs: SavedConfig[];
  selectedVersion: SavedConfig | null;
  onSelectVersion: (version: SavedConfig) => void;
  onLoadVersion: (version: SavedConfig) => void;
  onBackToEditor: () => void;
  isLoading?: boolean;
  currentConfigId?: string; // To filter versions for current config only
}

export default function HistorySidebar({
  savedConfigs,
  selectedVersion,
  onSelectVersion,
  onLoadVersion,
  onBackToEditor,
  isLoading = false,
  currentConfigId
}: HistorySidebarProps) {
  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(new Set());

  // Toggle expand/collapse
  const toggleExpand = (configName: string) => {
    const newExpanded = new Set(expandedConfigs);
    if (newExpanded.has(configName)) {
      newExpanded.delete(configName);
    } else {
      newExpanded.add(configName);
    }
    setExpandedConfigs(newExpanded);
  };

  // Filter configs - if currentConfigId is provided, only show that config's versions
  const filteredConfigs = currentConfigId
    ? savedConfigs.filter(c => c.config_id === currentConfigId)
    : savedConfigs;

  // Group saved configs by name
  const groupedConfigs = filteredConfigs.reduce((acc, config) => {
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
  const formatTimestamp = (timestamp: string) => {
    const now = Date.now();
    const date = new Date(timestamp).getTime();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div
      className="border-r flex flex-col"
      style={{
        width: '320px',
        backgroundColor: colors.bg.primary,
        borderColor: colors.border
      }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <div className="text-sm font-semibold mb-1" style={{ color: colors.text.primary }}>
          {currentConfigId ? 'Version History' : 'All Configurations'}
        </div>
        <div className="text-xs" style={{ color: colors.text.secondary }}>
          {filteredConfigs.length} version{filteredConfigs.length !== 1 ? 's' : ''}
          {!currentConfigId && ` • ${Object.keys(groupedConfigs).length} config${Object.keys(groupedConfigs).length !== 1 ? 's' : ''}`}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8">
            <div
              className="animate-spin rounded-full border-4 border-solid mb-3"
              style={{
                width: '40px',
                height: '40px',
                borderColor: colors.bg.secondary,
                borderTopColor: colors.accent.primary,
              }}
            />
            <p className="text-sm font-medium" style={{ color: colors.text.primary }}>
              Loading versions...
            </p>
            <p className="text-xs mt-1" style={{ color: colors.text.secondary }}>
              Fetching config history from backend
            </p>
          </div>
        ) : Object.keys(groupedConfigs).length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-6 text-center" style={{ borderColor: colors.border }}>
            <p className="text-sm" style={{ color: colors.text.secondary }}>
              No saved configurations yet
            </p>
            <p className="text-xs mt-2" style={{ color: colors.text.secondary }}>
              Create and save your first config to see version history
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedConfigs).map(([configName, versions]) => {
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
                          {versions.length} version{versions.length > 1 ? 's' : ''} • Latest: v{latestVersion.version}
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
                            backgroundColor: selectedVersion?.id === version.id ? '#f0fdf4' : idx === 0 ? '#fafafa' : colors.bg.primary,
                            borderLeftColor: selectedVersion?.id === version.id ? colors.status.success : idx === 0 ? colors.accent.primary : colors.border,
                            marginLeft: '12px',
                            borderTop: idx > 0 ? `1px solid ${colors.border}` : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
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
                          </div>

                          {version.commit_message && (
                            <div className="text-xs mb-1" style={{ color: colors.text.primary }}>
                              {version.commit_message}
                            </div>
                          )}

                          <div className="text-xs mb-2" style={{ color: colors.text.secondary }}>
                            {formatTimestamp(version.timestamp)} • {version.provider}/{version.modelName}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onLoadVersion(version);
                              }}
                              className="px-2 py-1 rounded text-xs font-medium transition-colors"
                              style={{
                                backgroundColor: colors.accent.primary,
                                color: '#ffffff',
                                border: 'none'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              Load
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectVersion(version);
                              }}
                              className="px-2 py-1 rounded text-xs font-medium transition-colors"
                              style={{
                                backgroundColor: colors.bg.secondary,
                                color: colors.text.secondary,
                                border: `1px solid ${colors.border}`
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colors.bg.primary;
                                e.currentTarget.style.color = colors.text.primary;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = colors.bg.secondary;
                                e.currentTarget.style.color = colors.text.secondary;
                              }}
                            >
                              Compare
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedVersion && (
        <div className="p-3 border-t" style={{ borderColor: colors.border }}>
          <button
            onClick={onBackToEditor}
            className="w-full px-4 py-2 rounded-md text-sm font-medium"
            style={{
              backgroundColor: colors.accent.primary,
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            ← Back to Editor
          </button>
        </div>
      )}
    </div>
  );
}
