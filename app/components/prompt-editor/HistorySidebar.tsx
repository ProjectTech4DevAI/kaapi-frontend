import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { colors } from "@/app/lib/colors";
import Loader from "@/app/components/Loader";
import { Button, VersionPill } from "@/app/components";
import { ArrowLeftIcon } from "@/app/components/icons";
import {
  ConfigPublic,
  SavedConfig,
  ConfigVersionItems,
} from "@/app/lib/types/configs";
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
        <VersionPill
          version={item.version}
          tone={isFirst ? "accent" : "default"}
        />
        {isFirst && (
          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border bg-status-success-bg text-status-success-text border-status-success-border">
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
        <Button
          variant="primary"
          size="sm"
          className="text-xs px-2.5 py-1"
          disabled={isFetching}
          onClick={(e) => {
            e.stopPropagation();
            onLoad();
          }}
        >
          {isFetching ? "…" : "Load into Editor"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs px-2.5 py-1"
          disabled={isFetching}
          onClick={(e) => {
            e.stopPropagation();
            onCompare();
          }}
        >
          Compare
        </Button>
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
    <div className="rounded-lg overflow-hidden bg-bg-primary shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow">
      <div
        onClick={onToggle}
        className="p-3 cursor-pointer bg-bg-secondary hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-start gap-2">
          <span className="text-sm text-text-secondary">
            {isExpanded ? "▼" : "▶"}
          </span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-text-primary">
              {configName || "Config"}
            </div>
            <div className="text-xs mt-0.5 text-text-secondary">
              {sortedItems.length} version{sortedItems.length !== 1 ? "s" : ""}{" "}
              • Latest: v{sortedItems[0]?.version}
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-neutral-100">
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
    <div className="rounded-lg overflow-hidden bg-bg-primary shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-shadow">
      <div
        onClick={onToggle}
        className="p-3 cursor-pointer bg-bg-secondary hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-start gap-2">
          <span className="text-sm text-text-secondary">
            {isExpanded ? "▼" : "▶"}
          </span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-text-primary">
              {meta.name}
            </div>
            <div className="text-xs mt-0.5 text-text-secondary">{subtitle}</div>
          </div>
          {isLoadingGroup && (
            <div className="shrink-0 mt-0.5">
              <div className="w-3.5 h-3.5 rounded-full animate-spin border-2 border-border border-t-accent-primary border-b-accent-primary [animation-duration:0.9s]" />
            </div>
          )}
        </div>
      </div>

      {isExpanded && isLoadingGroup && (
        <div className="border-t border-neutral-100 py-3">
          <Loader size="sm" message="Loading versions…" />
        </div>
      )}

      {isExpanded && !isLoadingGroup && items && (
        <div className="border-t border-neutral-100">
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
    <div className="w-80 shrink-0 border-r border-border bg-bg-primary flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-border px-4 flex flex-col justify-center shrink-0">
        <div className="text-sm font-semibold text-text-primary whitespace-nowrap">
          {titleText}
        </div>
        <div className="text-xs text-text-secondary whitespace-nowrap">
          {headerSubtitle}
        </div>
      </div>

      {
        <div className="flex-1 overflow-auto p-3">
          {isLoading ? (
            <div className="p-8">
              <Loader size="md" message="Loading configs..." />
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
      }

      {selectedVersion && (
        <div className="h-16 px-3 flex items-center border-t border-border shrink-0">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={onBackToEditor}
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Editor
          </Button>
        </div>
      )}
    </div>
  );
}
