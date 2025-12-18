import React from 'react';
import { colors } from '@/app/lib/colors';
import PromptDiffPane from './PromptDiffPane';
import ConfigDiffPane from './ConfigDiffPane';

// SavedConfig interface matching page.tsx and HistorySidebar
interface SavedConfig {
  id: string;
  config_id: string;
  name: string;
  version: number;
  timestamp: string;
  instructions: string;
  promptContent: string;
  modelName: string;
  provider: string;
  temperature: number;
  tools?: any[];
  commit_message?: string | null;
}

interface DiffViewProps {
  selectedCommit: SavedConfig;
  compareWith: SavedConfig | null;
  commits: SavedConfig[];
  onCompareChange: (commit: SavedConfig | null) => void;
  onLoadVersion: (versionId: string) => void;
}

export default function DiffView({
  selectedCommit,
  compareWith,
  commits,
  onCompareChange,
  onLoadVersion
}: DiffViewProps) {
  // Format timestamp
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
              className="px-3 py-2 rounded-md text-sm"
              style={{
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.bg.primary,
                color: colors.text.primary,
                outline: 'none'
              }}
            >
              <option value="">Select version to compare...</option>
              {commits
                .filter(c => c.id !== selectedCommit.id)
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} v{c.version} - {formatTimestamp(c.timestamp)}
                  </option>
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
