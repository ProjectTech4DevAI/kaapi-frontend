import React, { useMemo } from 'react';
import { colors } from '@/app/lib/colors';
import PromptDiffPane from './PromptDiffPane';
import ConfigDiffPane from './ConfigDiffPane';
import { SavedConfig, formatRelativeTime } from '@/app/lib/useConfigs';

interface DiffViewProps {
  selectedCommit: SavedConfig;
  compareWith: SavedConfig | null;
  commits: SavedConfig[];
  onCompareChange: (commit: SavedConfig | null) => void;
  onLoadVersion: (versionId: string) => void;
}

// Group configs by name for the dropdown
interface ConfigGroupForCompare {
  config_id: string;
  name: string;
  versions: SavedConfig[];
}

export default function DiffView({
  selectedCommit,
  compareWith,
  commits,
  onCompareChange,
  onLoadVersion
}: DiffViewProps) {
  // Group configs by config_id for nested dropdown
  const configGroups = useMemo(() => {
    const grouped = new Map<string, SavedConfig[]>();
    commits.forEach((config) => {
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
      } as ConfigGroupForCompare;
    });
  }, [commits]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return formatRelativeTime(timestamp);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b" style={{
        backgroundColor: colors.bg.primary,
        borderColor: colors.border
      }}>
        <div className="mb-3">
          <div className="text-lg font-semibold mb-1" style={{ color: colors.text.primary }}>
            {selectedCommit.name} v{selectedCommit.version}
          </div>
          <div className="text-xs" style={{ color: colors.text.secondary }}>
            {formatTimestamp(selectedCommit.timestamp)} • {selectedCommit.provider}/{selectedCommit.modelName}
            {selectedCommit.commit_message && ` • ${selectedCommit.commit_message}`}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex gap-3 items-center">
            <select
              onChange={(e) => {
                const commit = commits.find(c => c.id === e.target.value);
                onCompareChange(commit || null);
              }}
              value={compareWith?.id || ''}
              className="px-3 py-2 rounded-md text-sm min-w-[300px]"
              style={{
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.bg.primary,
                color: colors.text.primary,
                outline: 'none'
              }}
            >
              <option value="">Select version to compare...</option>
              {configGroups.map(group => (
                <optgroup key={group.config_id} label={`${group.name} (${group.versions.length} versions)`}>
                  {group.versions
                    .filter(v => v.id !== selectedCommit.id)
                    .map(version => (
                      <option key={version.id} value={version.id}>
                        v{version.version} - {version.commit_message || 'No message'} ({formatTimestamp(version.timestamp)})
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            {compareWith && (
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => onLoadVersion(compareWith.id)}
                  className="px-3 py-1.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: colors.bg.secondary,
                    color: colors.text.primary,
                    border: `1px solid ${colors.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.accent.primary;
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.borderColor = colors.accent.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.bg.secondary;
                    e.currentTarget.style.color = colors.text.primary;
                    e.currentTarget.style.borderColor = colors.border;
                  }}
                >
                  {compareWith.name === selectedCommit.name
                    ? `← Load v${compareWith.version}`
                    : `← Load ${compareWith.name} v${compareWith.version}`
                  }
                </button>
                <button
                  onClick={() => onLoadVersion(selectedCommit.id)}
                  className="px-3 py-1.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: colors.accent.primary,
                    color: '#ffffff',
                    border: `1px solid ${colors.accent.primary}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.85';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  {compareWith.name === selectedCommit.name
                    ? `Load v${selectedCommit.version} →`
                    : `Load ${selectedCommit.name} v${selectedCommit.version} →`
                  }
                </button>
              </div>
            )}
          </div>
          {compareWith && (
            <div className="text-xs" style={{ color: colors.text.secondary }}>
              {compareWith.name === selectedCommit.name
                ? `Comparing v${compareWith.version} → v${selectedCommit.version}`
                : `Comparing ${compareWith.name} v${compareWith.version} → ${selectedCommit.name} v${selectedCommit.version}`
              }
            </div>
          )}
        </div>
      </div>

      {compareWith ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex border-r" style={{ borderColor: colors.border }}>
            <PromptDiffPane
              selectedCommit={selectedCommit}
              compareWith={compareWith}
            />
          </div>
          <div className="flex-1 flex">
            <ConfigDiffPane
              selectedCommit={selectedCommit}
              compareWith={compareWith}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 flex border-r" style={{ borderColor: colors.border }}>
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
                  <h3 className="text-sm font-semibold" style={{ color: colors.text.primary }}>Prompt</h3>
                </div>
                <div className="flex-1 p-4 overflow-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono" style={{ color: colors.text.primary }}>
                    {selectedCommit.promptContent}
                  </pre>
                </div>
              </div>
            </div>
            <div className="flex-1 flex">
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
                  <h3 className="text-sm font-semibold" style={{ color: colors.text.primary }}>Configuration</h3>
                </div>
                <div className="flex-1 p-4 overflow-auto">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-semibold mb-1" style={{ color: colors.text.secondary }}>Provider</div>
                      <div className="text-sm" style={{ color: colors.text.primary }}>{selectedCommit.provider}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold mb-1" style={{ color: colors.text.secondary }}>Model</div>
                      <div className="text-sm" style={{ color: colors.text.primary }}>{selectedCommit.modelName}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold mb-1" style={{ color: colors.text.secondary }}>Temperature</div>
                      <div className="text-sm" style={{ color: colors.text.primary }}>{selectedCommit.temperature}</div>
                    </div>
                    {selectedCommit.tools && selectedCommit.tools.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold mb-1" style={{ color: colors.text.secondary }}>Tools</div>
                        <div className="text-sm space-y-2">
                          {selectedCommit.tools.map((tool, idx) => (
                            <div key={idx} className="p-2 rounded" style={{ backgroundColor: colors.bg.secondary }}>
                              <div className="text-xs font-semibold">{tool.type}</div>
                              {tool.vector_store_ids && (
                                <div className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                                  Vector Store: {tool.vector_store_ids[0]}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
