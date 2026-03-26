import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { colors } from "@/app/lib/colors";
import { SavedConfig, ConfigVersionItems } from "@/app/lib/types/configs";
import { ConfigPublic } from "@/app/lib/configTypes";
import { timeAgo } from "@/app/lib/utils";

interface VersionRowProps {
  item: ConfigVersionItems;
  isFirst: boolean;
  isSelected: boolean;
  isFetching: boolean;
  fullConfig?: SavedConfig;
  onLoad: () => void;
  onCompare: () => void;
}

function VersionRow({
  item,
  isFirst,
  isSelected,
  isFetching,
  fullConfig,
  onLoad,
  onCompare,
}: VersionRowProps) {
  return (
    <div
      className="p-3 border-l-2"
      style={{
        backgroundColor: isSelected
          ? "#f0fdf4"
          : isFirst
            ? "#fafafa"
            : colors.bg.primary,
        borderLeftColor: isSelected
          ? colors.status.success
          : isFirst
            ? colors.accent.primary
            : colors.border,
        marginLeft: "12px",
        borderTop: isFirst ? "none" : `1px solid ${colors.border}`,
        transition: "all 0.15s ease",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="px-2 py-0.5 rounded text-xs font-medium"
          style={{
            backgroundColor: colors.bg.secondary,
            color: colors.text.primary,
            border: `1px solid ${colors.border}`,
          }}
        >
          v{item.version}
        </span>
        {isFirst && (
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor: "#dcfce7",
              color: "#15803d",
              border: "1px solid #86efac",
            }}
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
        {timeAgo(item.inserted_at)}
        {fullConfig ? ` • ${fullConfig.provider}/${fullConfig.modelName}` : ""}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLoad();
          }}
          disabled={isFetching}
          className="px-2 py-1 rounded text-xs font-medium transition-colors"
          style={{
            backgroundColor: colors.accent.primary,
            color: "#ffffff",
            border: "none",
            opacity: isFetching ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isFetching) e.currentTarget.style.opacity = "0.85";
          }}
          onMouseLeave={(e) => {
            if (!isFetching) e.currentTarget.style.opacity = "1";
          }}
        >
          {isFetching ? "…" : "Load"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCompare();
          }}
          disabled={isFetching}
          className="px-2 py-1 rounded text-xs font-medium transition-colors"
          style={{
            backgroundColor: colors.bg.secondary,
            color: colors.text.secondary,
            border: `1px solid ${colors.border}`,
            opacity: isFetching ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isFetching) {
              e.currentTarget.style.backgroundColor = colors.bg.primary;
              e.currentTarget.style.color = colors.text.primary;
            }
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
  );
}

// Single-config version history (when a config is loaded in the editor)
interface SingleConfigHistoryProps {
  configId: string;
  configName: string;
  sortedItems: ConfigVersionItems[];
  savedConfigs: SavedConfig[];
  selectedVersion: SavedConfig | null;
  isExpanded: boolean;
  onToggle: () => void;
  onLoadVersion: (config: SavedConfig) => void;
  onSelectVersion: (config: SavedConfig) => void;
  onFetchVersionDetail?: (version: number) => Promise<SavedConfig | null>;
}

function SingleConfigHistory({
  configId,
  configName,
  sortedItems,
  savedConfigs,
  selectedVersion,
  isExpanded,
  onToggle,
  onLoadVersion,
  onSelectVersion,
  onFetchVersionDetail,
}: SingleConfigHistoryProps) {
  const [fetchingVersion, setFetchingVersion] = useState<number | null>(null);

  const handleAction = useCallback(
    async (item: ConfigVersionItems, action: "load" | "compare") => {
      let detail = savedConfigs.find(
        (c) => c.config_id === configId && c.version === item.version,
      );
      if (!detail && onFetchVersionDetail) {
        setFetchingVersion(item.version);
        detail = (await onFetchVersionDetail(item.version)) ?? undefined;
        setFetchingVersion(null);
      }
      if (!detail) return;
      if (action === "load") onLoadVersion(detail);
      else onSelectVersion(detail);
    },
    [
      configId,
      savedConfigs,
      onFetchVersionDetail,
      onLoadVersion,
      onSelectVersion,
    ],
  );

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{ borderColor: colors.border, transition: "all 0.15s ease" }}
    >
      <div
        onClick={onToggle}
        className="p-3 cursor-pointer"
        style={{
          backgroundColor: colors.bg.secondary,
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#f5f5f5")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = colors.bg.secondary)
        }
      >
        <div className="flex items-start gap-2">
          <span className="text-sm" style={{ color: colors.text.secondary }}>
            {isExpanded ? "▼" : "▶"}
          </span>
          <div className="flex-1">
            <div
              className="text-sm font-semibold"
              style={{ color: colors.text.primary }}
            >
              {configName || "Config"}
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: colors.text.secondary }}
            >
              {sortedItems.length} version{sortedItems.length !== 1 ? "s" : ""}{" "}
              • Latest: v{sortedItems[0]?.version}
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t" style={{ borderColor: colors.border }}>
          {sortedItems.map((item, idx) => (
            <VersionRow
              key={item.id}
              item={item}
              isFirst={idx === 0}
              isSelected={
                selectedVersion?.config_id === configId &&
                selectedVersion?.version === item.version
              }
              isFetching={fetchingVersion === item.version}
              fullConfig={savedConfigs.find(
                (c) => c.config_id === configId && c.version === item.version,
              )}
              onLoad={() => handleAction(item, "load")}
              onCompare={() => handleAction(item, "compare")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// One config group in "All Configurations" mode
interface AllConfigsGroupProps {
  meta: ConfigPublic;
  isExpanded: boolean;
  isLoadingGroup: boolean;
  items: ConfigVersionItems[] | null;
  savedConfigs: SavedConfig[];
  selectedVersion: SavedConfig | null;
  onToggle: () => void;
  onLoadVersion: (config: SavedConfig) => void;
  onSelectVersion: (config: SavedConfig) => void;
  loadSingleVersionForConfig?: (
    config_id: string,
    version: number,
  ) => Promise<SavedConfig | null>;
}

function AllConfigsGroup({
  meta,
  isExpanded,
  isLoadingGroup,
  items,
  savedConfigs,
  selectedVersion,
  onToggle,
  onLoadVersion,
  onSelectVersion,
  loadSingleVersionForConfig,
}: AllConfigsGroupProps) {
  const [loadingVersionKey, setLoadingVersionKey] = useState<string | null>(
    null,
  );

  const handleAction = useCallback(
    async (item: ConfigVersionItems, action: "load" | "compare") => {
      let detail =
        savedConfigs.find(
          (c) => c.config_id === meta.id && c.version === item.version,
        ) ?? null;
      if (!detail && loadSingleVersionForConfig) {
        const key = `${meta.id}:${item.version}`;
        setLoadingVersionKey(key);
        detail = await loadSingleVersionForConfig(meta.id, item.version);
        setLoadingVersionKey(null);
      }
      if (!detail) return;
      if (action === "load") onLoadVersion(detail);
      else onSelectVersion(detail);
    },
    [
      meta.id,
      savedConfigs,
      loadSingleVersionForConfig,
      onLoadVersion,
      onSelectVersion,
    ],
  );

  const subtitle = items
    ? `${items.length} version${items.length !== 1 ? "s" : ""} • Latest: v${items[0]?.version}`
    : timeAgo(meta.updated_at);

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{ borderColor: colors.border, transition: "all 0.15s ease" }}
    >
      <div
        onClick={onToggle}
        className="p-3 cursor-pointer"
        style={{
          backgroundColor: colors.bg.secondary,
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#f5f5f5")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = colors.bg.secondary)
        }
      >
        <div className="flex items-start gap-2">
          <span className="text-sm" style={{ color: colors.text.secondary }}>
            {isExpanded ? "▼" : "▶"}
          </span>
          <div className="flex-1">
            <div
              className="text-sm font-semibold"
              style={{ color: colors.text.primary }}
            >
              {meta.name}
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: colors.text.secondary }}
            >
              {subtitle}
            </div>
          </div>
          {isLoadingGroup && (
            <svg
              className="w-3.5 h-3.5 animate-spin flex-shrink-0 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: colors.text.secondary }}
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
        </div>
      </div>

      {isExpanded && isLoadingGroup && (
        <div
          className="border-t px-4 py-3 text-xs"
          style={{ borderColor: colors.border, color: colors.text.secondary }}
        >
          Loading versions…
        </div>
      )}

      {isExpanded && !isLoadingGroup && items && (
        <div className="border-t" style={{ borderColor: colors.border }}>
          {items.map((item, idx) => (
            <VersionRow
              key={item.id}
              item={item}
              isFirst={idx === 0}
              isSelected={
                selectedVersion?.config_id === meta.id &&
                selectedVersion?.version === item.version
              }
              isFetching={loadingVersionKey === `${meta.id}:${item.version}`}
              fullConfig={savedConfigs.find(
                (c) => c.config_id === meta.id && c.version === item.version,
              )}
              onLoad={() => handleAction(item, "load")}
              onCompare={() => handleAction(item, "compare")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface HistorySidebarProps {
  savedConfigs: SavedConfig[];
  selectedVersion: SavedConfig | null;
  onSelectVersion: (version: SavedConfig) => void;
  onLoadVersion: (version: SavedConfig) => void;
  onBackToEditor: () => void;
  onToggle: () => void;
  collapsed: boolean;
  isLoading?: boolean;
  currentConfigId?: string;
  versionItems?: ConfigVersionItems[];
  onFetchVersionDetail?: (version: number) => Promise<SavedConfig | null>;
  // All-configs lazy-loading props (used when currentConfigId is not set)
  allConfigMeta?: ConfigPublic[];
  fullVersionItemsMap?: Record<string, ConfigVersionItems[]>;
  loadVersionsForConfig?: (config_id: string) => Promise<void>;
  loadSingleVersionForConfig?: (
    config_id: string,
    version: number,
  ) => Promise<SavedConfig | null>;
  expandedConfigs: Set<string>;
  setExpandedConfigs: Dispatch<SetStateAction<Set<string>>>;
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
  allConfigMeta,
  fullVersionItemsMap = {},
  loadVersionsForConfig,
  loadSingleVersionForConfig,
  expandedConfigs,
  setExpandedConfigs,
}: HistorySidebarProps) {
  const [loadingAllConfigIds, setLoadingAllConfigIds] = useState<Set<string>>(
    new Set(),
  );

  const toggleExpand = useCallback(
    (configKey: string) => {
      setExpandedConfigs((prev: Set<string>) => {
        const next = new Set<string>(prev);
        if (next.has(configKey)) next.delete(configKey);
        else next.add(configKey);
        return next;
      });
    },
    [setExpandedConfigs],
  );

  const handleExpandAllConfig = useCallback(
    (meta: ConfigPublic) => {
      const isExpanded = expandedConfigs.has(meta.id);
      toggleExpand(meta.id);
      if (
        !isExpanded &&
        !fullVersionItemsMap[meta.id] &&
        loadVersionsForConfig
      ) {
        setLoadingAllConfigIds((prev) => new Set(prev).add(meta.id));
        loadVersionsForConfig(meta.id).finally(() => {
          setLoadingAllConfigIds((prev) => {
            const next = new Set(prev);
            next.delete(meta.id);
            return next;
          });
        });
      }
    },
    [expandedConfigs, fullVersionItemsMap, loadVersionsForConfig, toggleExpand],
  );

  const sortedVersionItems = versionItems
    ? [...versionItems].sort((a, b) => b.version - a.version)
    : null;

  const titleText = currentConfigId ? "Version History" : "All Configurations";

  const headerSubtitle = currentConfigId
    ? `${sortedVersionItems?.length ?? 0} version${sortedVersionItems?.length !== 1 ? "s" : ""}`
    : `${allConfigMeta?.length ?? 0} config${allConfigMeta?.length !== 1 ? "s" : ""}`;

  const isEmpty =
    !isLoading &&
    (currentConfigId ? !sortedVersionItems?.length : !allConfigMeta?.length);

  return (
    <div
      className="border-r flex flex-col flex-shrink-0"
      style={{
        width: collapsed ? "40px" : "320px",
        backgroundColor: colors.bg.primary,
        borderColor: colors.border,
        transition: "width 0.2s ease-in-out",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        className="border-b flex items-center flex-shrink-0"
        style={{
          borderColor: colors.border,
          padding: collapsed ? "0" : "12px 16px",
          justifyContent: collapsed ? "center" : "space-between",
          height: collapsed ? "40px" : "auto",
          transition: "padding 0.2s ease-in-out",
        }}
      >
        {!collapsed && (
          <div className="flex-1 overflow-hidden mr-2">
            <div
              className="text-sm font-semibold mb-0.5 whitespace-nowrap"
              style={{ color: colors.text.primary }}
            >
              {titleText}
            </div>
            <div
              className="text-xs whitespace-nowrap"
              style={{ color: colors.text.secondary }}
            >
              {headerSubtitle}
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="rounded flex-shrink-0 flex items-center justify-center"
          style={{
            width: "28px",
            height: "28px",
            borderWidth: "1px",
            borderColor: colors.border,
            backgroundColor: colors.bg.primary,
            color: colors.text.secondary,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.bg.secondary;
            e.currentTarget.style.color = colors.text.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = colors.bg.primary;
            e.currentTarget.style.color = colors.text.secondary;
          }}
          title={collapsed ? "Show version history" : "Hide version history"}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{
              transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease-in-out",
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Vertical label when collapsed */}
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
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
            }}
          >
            {titleText}
          </span>
        </div>
      )}

      {/* Content */}
      {!collapsed && (
        <div className="flex-1 overflow-auto p-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8">
              <div
                className="animate-spin rounded-full border-4 border-solid mb-3"
                style={{
                  width: "40px",
                  height: "40px",
                  borderColor: colors.bg.secondary,
                  borderTopColor: colors.accent.primary,
                }}
              />
              <p
                className="text-sm font-medium"
                style={{ color: colors.text.primary }}
              >
                Loading configs...
              </p>
            </div>
          ) : isEmpty ? (
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center"
              style={{ borderColor: colors.border }}
            >
              <p className="text-sm" style={{ color: colors.text.secondary }}>
                No saved configurations yet
              </p>
              <p
                className="text-xs mt-2"
                style={{ color: colors.text.secondary }}
              >
                Create and save your first config to see version history
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentConfigId && sortedVersionItems && (
                <SingleConfigHistory
                  configId={currentConfigId}
                  configName={
                    savedConfigs.find((c) => c.config_id === currentConfigId)
                      ?.name ?? ""
                  }
                  sortedItems={sortedVersionItems}
                  savedConfigs={savedConfigs}
                  selectedVersion={selectedVersion}
                  isExpanded={expandedConfigs.has(currentConfigId)}
                  onToggle={() => toggleExpand(currentConfigId)}
                  onLoadVersion={onLoadVersion}
                  onSelectVersion={onSelectVersion}
                  onFetchVersionDetail={onFetchVersionDetail}
                />
              )}

              {/* All Configurations mode */}
              {!currentConfigId &&
                allConfigMeta?.map((meta) => (
                  <AllConfigsGroup
                    key={meta.id}
                    meta={meta}
                    isExpanded={expandedConfigs.has(meta.id)}
                    isLoadingGroup={loadingAllConfigIds.has(meta.id)}
                    items={
                      fullVersionItemsMap[meta.id]
                        ? [...fullVersionItemsMap[meta.id]].sort(
                            (a, b) => b.version - a.version,
                          )
                        : null
                    }
                    savedConfigs={savedConfigs}
                    selectedVersion={selectedVersion}
                    onToggle={() => handleExpandAllConfig(meta)}
                    onLoadVersion={onLoadVersion}
                    onSelectVersion={onSelectVersion}
                    loadSingleVersionForConfig={loadSingleVersionForConfig}
                  />
                ))}
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
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            ← Back to Editor
          </button>
        </div>
      )}
    </div>
  );
}
