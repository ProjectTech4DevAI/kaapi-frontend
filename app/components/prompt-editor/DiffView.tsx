import { useMemo, useState } from 'react';
import { colors } from '@/app/lib/colors';
import PromptDiffPane from './PromptDiffPane';
import ConfigDiffPane from './ConfigDiffPane';
import { SavedConfig, ConfigVersionItems } from '@/app/lib/types/configs';
import { formatRelativeTime } from '@/app/lib/utils';

interface DiffViewProps {
  selectedCommit: SavedConfig;
  compareWith: SavedConfig | null;
  commits: SavedConfig[];
  onCompareChange: (commit: SavedConfig | null) => void;
  onLoadVersion: (versionId: string) => void;
  /** Lazily loads the lightweight version list for a given config_id (1 call or no-op) */
  loadVersionsForConfig?: (config_id: string) => Promise<void>;
  /**
   * Lightweight version items per config_id. When provided, the compare dropdown
   * shows ALL versions (not just loaded ones); full details are fetched on selection.
   */
  versionItemsMap?: Record<string, ConfigVersionItems[]>;
  /**
   * Fetches a single version's full details on demand (1 GET call).
   * Called when the user picks a version that isn't yet in `commits`.
   */
  onFetchVersionDetail?: (config_id: string, version: number) => Promise<SavedConfig | null>;
}

// Group configs by name for the dropdown
interface ConfigGroupForCompare {
  config_id: string;
  name: string;
  /** Lightweight items used for the option list */
  items: ConfigVersionItems[];
}

export default function DiffView({
  selectedCommit,
  compareWith,
  commits,
  onCompareChange,
  onLoadVersion,
  loadVersionsForConfig,
  versionItemsMap,
  onFetchVersionDetail,
}: DiffViewProps) {
  const [isLoadingCompare, setIsLoadingCompare] = useState(false);

  // Build groups for the compare dropdown.
  // Prefer the lightweight versionItemsMap (full history, no config_blob) over
  // the loaded commits (which may only have the latest version per config).
  const configGroups = useMemo((): ConfigGroupForCompare[] => {
    if (versionItemsMap && Object.keys(versionItemsMap).length > 0) {
      // Use lightweight items as the authoritative list; derive config names from commits
      return Object.entries(versionItemsMap).map(([config_id, items]) => {
        const nameFallback = commits.find(c => c.config_id === config_id)?.name ?? config_id;
        const sorted = [...items].sort((a, b) => b.version - a.version);
        return { config_id, name: nameFallback, items: sorted };
      });
    }
    // Fallback: use loaded commits
    const grouped = new Map<string, SavedConfig[]>();
    commits.forEach((config) => {
      const existing = grouped.get(config.config_id) || [];
      existing.push(config);
      grouped.set(config.config_id, existing);
    });
    return Array.from(grouped.entries()).map(([config_id, versions]) => {
      const sorted = versions.sort((a, b) => b.version - a.version);
      return {
        config_id,
        name: sorted[0].name,
        items: sorted.map(v => ({
          id: v.id,
          config_id: v.config_id,
          version: v.version,
          commit_message: v.commit_message ?? null,
          inserted_at: v.timestamp,
          updated_at: v.timestamp,
        })),
      };
    });
  }, [commits, versionItemsMap]);

  // Encode option value as "config_id:version" so we can look up or fetch on select
  const encodeValue = (config_id: string, version: number) => `${config_id}:${version}`;
  const decodeValue = (val: string): { config_id: string; version: number } | null => {
    const idx = val.lastIndexOf(':');
    if (idx === -1) return null;
    return { config_id: val.slice(0, idx), version: parseInt(val.slice(idx + 1), 10) };
  };
  const currentValue = compareWith ? encodeValue(compareWith.config_id, compareWith.version) : '';

  const handleCompareSelect = async (rawValue: string) => {
    if (!rawValue) { onCompareChange(null); return; }
    const decoded = decodeValue(rawValue);
    if (!decoded) return;
    const { config_id, version } = decoded;

    // Fast path: already loaded
    let detail = commits.find(c => c.config_id === config_id && c.version === version);
    if (detail) { onCompareChange(detail); return; }

    // Fetch on demand — 1 API call
    if (onFetchVersionDetail) {
      setIsLoadingCompare(true);
      detail = (await onFetchVersionDetail(config_id, version)) ?? undefined;
      setIsLoadingCompare(false);
    }
    onCompareChange(detail ?? null);
  };

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
              onFocus={() => {
                // Ensure lightweight version lists are populated for all configs
                if (loadVersionsForConfig) {
                  configGroups.forEach(g => loadVersionsForConfig(g.config_id));
                }
              }}
              onChange={(e) => { handleCompareSelect(e.target.value); }}
              value={currentValue}
              disabled={isLoadingCompare}
              className="px-3 py-2 rounded-md text-sm min-w-[300px]"
              style={{
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.bg.primary,
                color: colors.text.primary,
                outline: 'none',
                opacity: isLoadingCompare ? 0.6 : 1,
              }}
            >
              <option value="">{isLoadingCompare ? 'Loading…' : 'Select version to compare...'}</option>
              {configGroups.map(group => (
                <optgroup key={group.config_id} label={`${group.name} (${group.items.length} versions)`}>
                  {group.items
                    .filter(v => !(v.config_id === selectedCommit.config_id && v.version === selectedCommit.version))
                    .map(item => (
                      <option key={item.id} value={encodeValue(item.config_id, item.version)}>
                        v{item.version} - {item.commit_message || 'No message'} ({formatTimestamp(item.inserted_at)})
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
                              <div className="text-xs font-semibold" style={{ color: colors.text.secondary }}>{tool.type}</div>
                              {tool.knowledge_base_ids && (
                                <div className="text-xs mt-1" style={{ color: colors.text.secondary }}>
                                  Knowledge Base: {tool.knowledge_base_ids[0]}
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
