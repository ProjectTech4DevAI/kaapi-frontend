import { useEffect, useState } from 'react';
import { colors } from '@/app/lib/colors';
import { SavedConfig, ConfigVersionItems } from '@/app/lib/types/configs';

interface HistorySidebarProps {
  savedConfigs: SavedConfig[];
  selectedVersion: SavedConfig | null;
  onSelectVersion: (version: SavedConfig) => void;
  onLoadVersion: (version: SavedConfig) => void;
  onBackToEditor: () => void;
  onToggle: () => void; // Callback to toggle the sidebar
  collapsed: boolean; // Whether the sidebar is collapsed
  isLoading?: boolean;
  currentConfigId?: string; // To filter versions for current config only
  versionItems?: ConfigVersionItems[];
  onFetchVersionDetail?: (version: number) => Promise<SavedConfig | null>;
}

export default function HistorySidebar({
  savedConfigs,
  selectedVersion,
  onSelectVersion,
  onLoadVersion,
  onBackToEditor,
  onToggle,
  collapsed,
  isLoading = false,
  currentConfigId,
  versionItems,
  onFetchVersionDetail,
}: HistorySidebarProps) {
  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(new Set());
  /** Which version number is currently being fetched on-demand (for loading indicator) */
  const [fetchingVersion, setFetchingVersion] = useState<number | null>(null);

  // Auto-expand the current config's group when arriving from URL params
  useEffect(() => {
    if (currentConfigId) {
      setExpandedConfigs(prev => {
        if (prev.has(currentConfigId)) return prev;
        return new Set([...prev, currentConfigId]);
      });
    }
  }, [currentConfigId]);

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

  // When versionItems is provided for the current config, use it as the
  // authoritative (lightweight) list; the fully-loaded SavedConfig entries
  const sortedVersionItems = versionItems
    ? [...versionItems].sort((a, b) => b.version - a.version)
    : null;

  // Total version count for the header subtitle
  const totalVersionCount = currentConfigId
    ? (sortedVersionItems?.length ?? filteredConfigs.length)
    : filteredConfigs.length;

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

  const titleText = currentConfigId ? 'Version History' : 'All Configurations';

  return (
    <div
      className="border-r flex flex-col flex-shrink-0"
      style={{
        width: collapsed ? '40px' : '320px',
        backgroundColor: colors.bg.primary,
        borderColor: colors.border,
        transition: 'width 0.2s ease-in-out',
        overflow: 'hidden',
      }}
    >
      {/* Header - always visible */}
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
        {/* Title - hidden when collapsed */}
        {!collapsed && (
          <div className="flex-1 overflow-hidden mr-2">
            <div className="text-sm font-semibold mb-0.5 whitespace-nowrap" style={{ color: colors.text.primary }}>
              {titleText}
            </div>
            <div className="text-xs whitespace-nowrap" style={{ color: colors.text.secondary }}>
              {totalVersionCount} version{totalVersionCount !== 1 ? 's' : ''}
              {!currentConfigId && ` • ${Object.keys(groupedConfigs).length} config${Object.keys(groupedConfigs).length !== 1 ? 's' : ''}`}
            </div>
          </div>
        )}
        {/* Toggle button - chevron */}
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
          title={collapsed ? 'Show version history' : 'Hide version history'}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease-in-out',
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Vertical text when collapsed - at the top */}
      {collapsed && (
        <div
          className="flex items-start justify-center pt-4 cursor-pointer"
          onClick={onToggle}
          style={{ color: colors.text.secondary }}
          title="Show version history"
        >
          <span
            className="text-xs font-medium whitespace-nowrap"
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
            }}
          >
            {titleText}
          </span>
        </div>
      )}

      {/* Content - hidden when collapsed */}
      {!collapsed && (
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
        ) : Object.keys(groupedConfigs).length === 0 && !sortedVersionItems?.length ? (
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
            {currentConfigId && sortedVersionItems ? (() => {
              const configName = savedConfigs.find(c => c.config_id === currentConfigId)?.name ?? '';
              const isExpanded = expandedConfigs.has(currentConfigId);

              return (
                <div
                  className="border rounded-lg overflow-hidden"
                  style={{ borderColor: colors.border, transition: 'all 0.15s ease' }}
                >
                  {/* Config header */}
                  <div
                    onClick={() => toggleExpand(currentConfigId)}
                    className="p-3 cursor-pointer"
                    style={{ backgroundColor: colors.bg.secondary, transition: 'all 0.15s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm" style={{ color: colors.text.secondary }}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                          {configName || 'Config'}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: colors.text.secondary }}>
                          {sortedVersionItems.length} version{sortedVersionItems.length !== 1 ? 's' : ''} • Latest: v{sortedVersionItems[0]?.version}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lightweight version entries */}
                  {isExpanded && (
                    <div className="border-t" style={{ borderColor: colors.border }}>
                      {sortedVersionItems.map((item, idx) => {
                        // Look up the already-loaded full version if available
                        const full = savedConfigs.find(
                          c => c.config_id === currentConfigId && c.version === item.version
                        );
                        const isSelected = selectedVersion?.config_id === currentConfigId &&
                          selectedVersion?.version === item.version;
                        const isFetchingThis = fetchingVersion === item.version;

                        const handleAction = async (action: 'load' | 'compare') => {
                          let detail = full;
                          if (!detail && onFetchVersionDetail) {
                            setFetchingVersion(item.version);
                            detail = (await onFetchVersionDetail(item.version)) ?? undefined;
                            setFetchingVersion(null);
                          }
                          if (!detail) return;
                          if (action === 'load') onLoadVersion(detail);
                          else onSelectVersion(detail);
                        };

                        return (
                          <div
                            key={item.id}
                            className="p-3 border-l-2"
                            style={{
                              backgroundColor: isSelected ? '#f0fdf4' : idx === 0 ? '#fafafa' : colors.bg.primary,
                              borderLeftColor: isSelected ? colors.status.success : idx === 0 ? colors.accent.primary : colors.border,
                              marginLeft: '12px',
                              borderTop: idx > 0 ? `1px solid ${colors.border}` : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{ backgroundColor: colors.bg.secondary, color: colors.text.primary, border: `1px solid ${colors.border}` }}
                              >
                                v{item.version}
                              </span>
                              {idx === 0 && (
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium"
                                  style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}
                                >
                                  Latest
                                </span>
                              )}
                            </div>

                            {item.commit_message && (
                              <div className="text-xs mb-1" style={{ color: colors.text.primary }}>
                                {item.commit_message}
                              </div>
                            )}

                            <div className="text-xs mb-2" style={{ color: colors.text.secondary }}>
                              {formatTimestamp(item.inserted_at)}
                              {full ? ` • ${full.provider}/${full.modelName}` : ''}
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAction('load'); }}
                                disabled={isFetchingThis}
                                className="px-2 py-1 rounded text-xs font-medium transition-colors"
                                style={{ backgroundColor: colors.accent.primary, color: '#ffffff', border: 'none', opacity: isFetchingThis ? 0.6 : 1 }}
                                onMouseEnter={(e) => { if (!isFetchingThis) e.currentTarget.style.opacity = '0.85'; }}
                                onMouseLeave={(e) => { if (!isFetchingThis) e.currentTarget.style.opacity = '1'; }}
                              >
                                {isFetchingThis ? '…' : 'Load'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAction('compare'); }}
                                disabled={isFetchingThis}
                                className="px-2 py-1 rounded text-xs font-medium transition-colors"
                                style={{ backgroundColor: colors.bg.secondary, color: colors.text.secondary, border: `1px solid ${colors.border}`, opacity: isFetchingThis ? 0.6 : 1 }}
                                onMouseEnter={(e) => { if (!isFetchingThis) { e.currentTarget.style.backgroundColor = colors.bg.primary; e.currentTarget.style.color = colors.text.primary; } }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.bg.secondary; e.currentTarget.style.color = colors.text.secondary; }}
                              >
                                Compare
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })() : Object.entries(groupedConfigs).map(([configName, versions]) => {
              const isExpanded = expandedConfigs.has(configName);
              const latestVersion = versions[0];

              return (
                <div
                  key={configName}
                  className="border rounded-lg overflow-hidden"
                  style={{ borderColor: colors.border, transition: 'all 0.15s ease' }}
                >
                  {/* Config Header */}
                  <div
                    onClick={() => toggleExpand(configName)}
                    className="p-3 cursor-pointer"
                    style={{ backgroundColor: colors.bg.secondary, transition: 'all 0.15s ease' }}
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

                  {/* Versions List (already-loaded SavedConfigs) */}
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
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{ backgroundColor: colors.bg.secondary, color: colors.text.primary, border: `1px solid ${colors.border}` }}
                              >
                                v{version.version}
                              </span>
                              {idx === 0 && (
                                <span
                                  className="px-2 py-0.5 rounded text-xs font-medium"
                                  style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}
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
                              onClick={(e) => { e.stopPropagation(); onLoadVersion(version); }}
                              className="px-2 py-1 rounded text-xs font-medium transition-colors"
                              style={{ backgroundColor: colors.accent.primary, color: '#ffffff', border: 'none' }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                              Load
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onSelectVersion(version); }}
                              className="px-2 py-1 rounded text-xs font-medium transition-colors"
                              style={{ backgroundColor: colors.bg.secondary, color: colors.text.secondary, border: `1px solid ${colors.border}` }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.bg.primary; e.currentTarget.style.color = colors.text.primary; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.bg.secondary; e.currentTarget.style.color = colors.text.secondary; }}
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
      )}

      {!collapsed && selectedVersion && (
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
