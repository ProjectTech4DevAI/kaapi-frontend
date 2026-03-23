/**
 * ConfigSelector - Read-only config selector for Evaluations page
 * Allows selecting a saved config with "Edit in Prompt Editor" link
 */

"use client";

import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/app/lib/colors";
import { useConfigs } from "@/app/hooks/useConfigs";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  EditIcon,
  GearIcon,
  CheckIcon,
} from "@/app/components/icons";
import { formatRelativeTime } from "@/app/lib/utils";

interface ConfigSelectorProps {
  selectedConfigId: string;
  selectedVersion: number;
  onConfigSelect: (configId: string, version: number) => void;
  disabled?: boolean;
  /** Compact mode: no outer card, smaller heading — for use inside panels */
  compact?: boolean;
  // Context to preserve when navigating to Prompt Editor
  datasetId?: string;
  experimentName?: string;
}

export default function ConfigSelector({
  selectedConfigId,
  selectedVersion,
  onConfigSelect,
  disabled = false,
  compact = false,
  datasetId,
  experimentName,
}: ConfigSelectorProps) {
  const router = useRouter();
  const {
    configs,
    isLoading,
    error,
    loadVersionsForConfig,
    loadSingleVersion,
    allConfigMeta,
    versionItemsMap,
  } = useConfigs({ pageSize: 0 });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [isPromptOverflowing, setIsPromptOverflowing] = useState(false);
  const promptRef = useRef<HTMLDivElement>(null);
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null); // config group is expanded in the dropdown
  const [loadingVersionsFor, setLoadingVersionsFor] = useState<Set<string>>(
    new Set(),
  ); // State for use which config groups are currently loading their version list
  const [isLoadingPreview, setIsLoadingPreview] = useState(false); // True while full config details are being fetched for the preview pane

  // Reset expanded state and recheck overflow whenever selected config changes.
  useLayoutEffect(() => {
    setPromptExpanded(false);
    const el = promptRef.current;
    if (!el) return;
    // clientHeight is capped by max-h-12; scrollHeight is the full content height.
    // Only show the icon when content actually overflows the collapsed box.
    setIsPromptOverflowing(el.scrollHeight > el.clientHeight);
  }, [selectedConfigId, selectedVersion, configs]);

  // Find currently selected config (only present after loadSingleVersion has completed)
  const selectedConfig = configs.find(
    (c) => c.config_id === selectedConfigId && c.version === selectedVersion,
  );

  // Config name from lightweight metadata
  const selectedConfigName = selectedConfigId
    ? allConfigMeta.find((m) => m.id === selectedConfigId)?.name
    : undefined;

  // Auto-load full config details for the preview pane whenever the selection changes
  // and the full data isn't already in the loaded set.
  useEffect(() => {
    if (!selectedConfigId || !selectedVersion) {
      setIsLoadingPreview(false);
      return;
    }
    const alreadyLoaded = configs.find(
      (c) => c.config_id === selectedConfigId && c.version === selectedVersion,
    );
    if (alreadyLoaded) {
      setIsLoadingPreview(false);
      return;
    }
    setIsLoadingPreview(true);
    loadSingleVersion(selectedConfigId, selectedVersion)
      .then((result) => {
        if (!result) setIsLoadingPreview(false);
      })
      .catch(() => setIsLoadingPreview(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConfigId, selectedVersion, configs]);

  // Dropdown display list: all configs from the lightweight allConfigMeta,
  // filtered by search query. Version details are loaded on-demand per group.
  const filteredDisplayGroups = searchQuery.trim()
    ? allConfigMeta.filter((m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allConfigMeta;

  const handleSelectVersionItem = (config_id: string, version: number) => {
    onConfigSelect(config_id, version);
    setIsDropdownOpen(false);
    setSearchQuery("");
  };

  const handleCloseDropdown = () => {
    setIsDropdownOpen(false);
    setSearchQuery(""); // Clear search on close
  };

  const handleOpenDropdown = () => {
    if (disabled) return;
    if (!isDropdownOpen) {
      const autoExpand = selectedConfigId || null;
      setExpandedConfigId(autoExpand);
      if (
        autoExpand &&
        !versionItemsMap[autoExpand] &&
        !loadingVersionsFor.has(autoExpand)
      ) {
        setLoadingVersionsFor((prev) => new Set(prev).add(autoExpand));
        loadVersionsForConfig(autoExpand).finally(() => {
          setLoadingVersionsFor((prev) => {
            const s = new Set(prev);
            s.delete(autoExpand);
            return s;
          });
        });
      }
    }
    setIsDropdownOpen((prev) => !prev);
  };

  // Toggle a config group’s expansion; load its version list on first expand
  const handleToggleGroup = (config_id: string) => {
    if (expandedConfigId === config_id) {
      setExpandedConfigId(null);
      return;
    }
    setExpandedConfigId(config_id);
    if (!versionItemsMap[config_id] && !loadingVersionsFor.has(config_id)) {
      setLoadingVersionsFor((prev) => new Set(prev).add(config_id));
      loadVersionsForConfig(config_id).finally(() => {
        setLoadingVersionsFor((prev) => {
          const s = new Set(prev);
          s.delete(config_id);
          return s;
        });
      });
    }
  };

  // Build URL params preserving evaluation context
  const buildEditorUrl = (configId?: string, version?: number) => {
    const params = new URLSearchParams();
    if (configId && version) {
      params.set("config", configId);
      params.set("version", version.toString());
    } else {
      params.set("new", "true");
    }
    // Preserve evaluation context
    if (datasetId) params.set("dataset", datasetId);
    if (experimentName) params.set("experiment", experimentName);
    params.set("from", "evaluations"); // Mark that we came from evaluations
    return `/configurations/prompt-editor?${params.toString()}`;
  };

  // Navigate to Prompt Editor to edit
  const handleEditInPromptEditor = () => {
    router.push(buildEditorUrl(selectedConfigId, selectedVersion));
  };

  // Navigate to Config Library
  const handleBrowseLibrary = () => {
    const params = new URLSearchParams();
    if (datasetId) params.set("dataset", datasetId);
    if (experimentName) params.set("experiment", experimentName);
    params.set("from", "evaluations");
    router.push(`/configurations?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div
        className={compact ? "" : "border rounded-lg p-6"}
        style={
          compact
            ? {}
            : { backgroundColor: colors.bg.primary, borderColor: colors.border }
        }
      >
        <div
          className={`flex items-center gap-2 ${compact ? "mb-1.5" : "mb-4"}`}
        >
          <h2
            className={
              compact ? "text-xs font-medium" : "text-lg font-semibold"
            }
            style={{
              color: compact ? colors.text.secondary : colors.text.primary,
            }}
          >
            {compact ? "Configuration *" : "Select Configuration"}
          </h2>
        </div>
        <div
          className="w-full px-4 py-3 rounded-md text-sm"
          style={{
            backgroundColor: colors.bg.secondary,
            color: colors.text.secondary,
          }}
        >
          Loading configurations...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={compact ? "" : "border rounded-lg p-6"}
        style={
          compact
            ? {}
            : { backgroundColor: colors.bg.primary, borderColor: colors.border }
        }
      >
        <div
          className={`flex items-center gap-2 ${compact ? "mb-1.5" : "mb-4"}`}
        >
          <h2
            className={
              compact ? "text-xs font-medium" : "text-lg font-semibold"
            }
            style={{
              color: compact ? colors.text.secondary : colors.text.primary,
            }}
          >
            {compact ? "Configuration *" : "Select Configuration"}
          </h2>
        </div>
        <div className="rounded-lg p-4 text-sm bg-[#fef2f2] border border-[#fecaca] text-[#dc2626]">
          {error}
        </div>
      </div>
    );
  }

  const noConfigsAvailable = () => {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{
          backgroundColor: colors.bg.secondary,
          border: `2px dashed ${colors.border}`,
        }}
      >
        <GearIcon
          className="w-10 h-10 mx-auto mb-2"
          style={{ color: colors.text.secondary }}
        />
        <p
          className="text-sm font-medium"
          style={{ color: colors.text.primary }}
        >
          No configurations found
        </p>
        <p className="text-xs mt-1" style={{ color: colors.text.secondary }}>
          Create a configuration in the Prompt Editor first
        </p>
        <button
          onClick={handleEditInPromptEditor}
          className="mt-3 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            backgroundColor: colors.accent.primary,
            color: colors.bg.primary,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = colors.accent.hover)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = colors.accent.primary)
          }
        >
          Create Configuration
        </button>
      </div>
    );
  };

  return (
    <div
      className={compact ? "" : "border rounded-lg p-6"}
      style={
        compact
          ? {}
          : { backgroundColor: colors.bg.primary, borderColor: colors.border }
      }
    >
      <div
        className={`flex items-center justify-between ${compact ? "mb-1.5" : "mb-4"}`}
      >
        <div className="flex items-center gap-2">
          <h2
            className={
              compact ? "text-xs font-medium" : "text-lg font-semibold"
            }
            style={{
              color: compact ? colors.text.secondary : colors.text.primary,
            }}
          >
            {compact ? "Configuration *" : "Select Configuration"}
          </h2>
          {!compact && (
            <span className="text-xs" style={{ color: colors.text.secondary }}>
              (Required)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBrowseLibrary}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor: colors.bg.primary,
              border: `1px solid ${colors.border}`,
              color: colors.text.primary,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = colors.bg.secondary)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = colors.bg.primary)
            }
          >
            Browse Library
          </button>
          <button
            onClick={handleEditInPromptEditor}
            className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
            style={{
              backgroundColor: colors.bg.primary,
              border: `1px solid ${colors.border}`,
              color: colors.text.primary,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = colors.bg.secondary)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = colors.bg.primary)
            }
          >
            <EditIcon className="w-3.5 h-3.5" />
            {selectedConfig ? "Edit Config" : "Create Config"}
          </button>
        </div>
      </div>

      {allConfigMeta.length === 0 ? (
        noConfigsAvailable()
      ) : (
        <>
          <div className={`relative ${isDropdownOpen ? "z-50" : ""}`}>
            {isDropdownOpen ? (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search configurations..."
                className="w-full px-3 py-2 rounded-md border text-sm focus:outline-none"
                style={{
                  backgroundColor: colors.bg.primary,
                  borderColor: colors.accent.primary,
                  color: colors.text.primary,
                }}
                autoFocus
              />
            ) : (
              /* Button when dropdown is closed */
              <div className="relative">
                <button
                  onClick={handleOpenDropdown}
                  disabled={disabled}
                  className="w-full px-3 py-2 pr-8 rounded-md border text-sm text-left transition-colors cursor-pointer disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: disabled
                      ? colors.bg.secondary
                      : colors.bg.primary,
                    borderColor:
                      selectedConfig || (selectedConfigName && selectedVersion)
                        ? colors.accent.primary
                        : colors.border,
                    color:
                      selectedConfig || (selectedConfigName && selectedVersion)
                        ? colors.text.primary
                        : colors.text.secondary,
                  }}
                >
                  {isLoadingPreview
                    ? "Loading..."
                    : selectedConfig
                      ? `${selectedConfig.name} (v${selectedConfig.version})`
                      : selectedConfigName && selectedVersion
                        ? `${selectedConfigName} (v${selectedVersion})`
                        : "-- Select a configuration --"}
                </button>
                <ChevronDownIcon
                  className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: colors.text.secondary }}
                />
              </div>
            )}

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                className="absolute z-50 w-full mt-1 rounded-md shadow-lg max-h-64 overflow-auto"
                style={{
                  backgroundColor: colors.bg.primary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                {filteredDisplayGroups.length === 0 ? (
                  <div
                    className="px-4 py-6 text-center text-sm"
                    style={{ color: colors.text.secondary }}
                  >
                    {searchQuery
                      ? `No configurations match "${searchQuery}"`
                      : "No configurations available"}
                  </div>
                ) : (
                  filteredDisplayGroups.map((meta) => {
                    const isExpanded = expandedConfigId === meta.id;
                    const isLoadingGroup = loadingVersionsFor.has(meta.id);
                    const versionItems = versionItemsMap[meta.id] ?? [];
                    return (
                      <div key={meta.id}>
                        {/* Config group header — click to expand/collapse */}
                        <button
                          className="w-full px-3 py-2 text-left flex items-center justify-between sticky top-0 transition-colors"
                          style={{
                            backgroundColor: colors.bg.secondary,
                            color: colors.text.secondary,
                          }}
                          onClick={() => handleToggleGroup(meta.id)}
                        >
                          <span className="text-xs font-medium">
                            {meta.name}
                            {versionItems.length > 0 && (
                              <span className="ml-1 font-normal">
                                ({versionItems.length} version
                                {versionItems.length !== 1 ? "s" : ""})
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            {isLoadingGroup && (
                              <svg
                                className="w-3 h-3 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
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
                            {isExpanded ? (
                              <ChevronUpIcon className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDownIcon className="w-3.5 h-3.5" />
                            )}
                          </span>
                        </button>
                        {/* Version items — lightweight list, loaded on first expand */}
                        {isExpanded &&
                          !isLoadingGroup &&
                          versionItems.map((item) => {
                            const isSelected =
                              selectedConfigId === item.config_id &&
                              selectedVersion === item.version;
                            return (
                              <button
                                key={item.id}
                                onClick={() =>
                                  handleSelectVersionItem(
                                    item.config_id,
                                    item.version,
                                  )
                                }
                                className="w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors"
                                style={{
                                  backgroundColor: isSelected
                                    ? colors.bg.secondary
                                    : colors.bg.primary,
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                    colors.bg.secondary)
                                }
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    isSelected
                                      ? colors.bg.secondary
                                      : colors.bg.primary;
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="text-xs px-1.5 py-0.5 rounded"
                                      style={{
                                        backgroundColor: colors.bg.secondary,
                                        color: colors.text.secondary,
                                      }}
                                    >
                                      v{item.version}
                                    </span>
                                    <span
                                      className="text-sm truncate"
                                      style={{ color: colors.text.primary }}
                                    >
                                      {item.commit_message || "No message"}
                                    </span>
                                  </div>
                                  <div
                                    className="text-xs mt-0.5"
                                    style={{ color: colors.text.secondary }}
                                  >
                                    {formatRelativeTime(item.inserted_at)}
                                  </div>
                                </div>
                                {isSelected && (
                                  <CheckIcon
                                    className="w-4 h-4 flex-shrink-0"
                                    style={{ color: colors.status.success }}
                                  />
                                )}
                              </button>
                            );
                          })}
                        {/* Spinner while version list is being fetched */}
                        {isExpanded && isLoadingGroup && (
                          <div
                            className="px-4 py-3 text-xs"
                            style={{ color: colors.text.secondary }}
                          >
                            Loading versions…
                          </div>
                        )}
                        {/* Empty state: expanded but no versions returned */}
                        {isExpanded &&
                          !isLoadingGroup &&
                          versionItems.length === 0 && (
                            <div
                              className="px-4 py-3 text-xs"
                              style={{ color: colors.text.secondary }}
                            >
                              No versions available
                            </div>
                          )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Preview: loading state while full config details are being fetched */}
          {isLoadingPreview && !selectedConfig && (
            <div
              className="mt-4 rounded-md p-4 flex items-center gap-2"
              style={{ backgroundColor: colors.bg.secondary }}
            >
              <svg
                className="w-4 h-4 animate-spin flex-shrink-0"
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
              <span
                className="text-xs"
                style={{ color: colors.text.secondary }}
              >
                Loading configuration details…
              </span>
            </div>
          )}

          {/* Selected Config Preview */}
          {selectedConfig && !isLoadingPreview && (
            <div
              className="mt-4 rounded-md p-4"
              style={{ backgroundColor: colors.bg.secondary }}
            >
              {/* Configuration Details */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div
                    className="text-xs font-medium mb-1"
                    style={{ color: colors.text.secondary }}
                  >
                    Provider & Model
                  </div>
                  <div
                    className="text-sm font-mono"
                    style={{ color: colors.text.primary }}
                  >
                    {selectedConfig.provider}/{selectedConfig.modelName}
                  </div>
                </div>
                <div>
                  <div
                    className="text-xs font-medium mb-1"
                    style={{ color: colors.text.secondary }}
                  >
                    Temperature
                  </div>
                  <div
                    className="text-sm font-mono"
                    style={{ color: colors.text.primary }}
                  >
                    {selectedConfig.temperature.toFixed(2)}
                  </div>
                </div>
                {selectedConfig.tools && selectedConfig.tools.length > 0 && (
                  <>
                    <div className="col-span-2">
                      <div
                        className="text-xs font-medium mb-1"
                        style={{ color: colors.text.secondary }}
                      >
                        Knowledge Base IDs
                      </div>
                      <div
                        className="text-xs font-mono break-all"
                        style={{ color: colors.text.primary }}
                      >
                        {selectedConfig.tools
                          .map((tool) => tool.knowledge_base_ids)
                          .flat()
                          .join(", ") || "None"}
                      </div>
                    </div>
                    <div>
                      <div
                        className="text-xs font-medium mb-1"
                        style={{ color: colors.text.secondary }}
                      >
                        Max Results
                      </div>
                      <div
                        className="text-sm font-mono"
                        style={{ color: colors.text.primary }}
                      >
                        {selectedConfig.tools[0].max_num_results}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Prompt Preview */}
              <div
                className="border-t pt-3"
                style={{ borderColor: colors.border }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="text-xs font-medium"
                    style={{ color: colors.text.secondary }}
                  >
                    Prompt Preview
                  </div>
                  {selectedConfig.instructions && isPromptOverflowing && (
                    <button
                      onClick={() => setPromptExpanded((p) => !p)}
                      className="rounded p-0.5 transition-colors"
                      style={{ color: colors.text.secondary }}
                      title={promptExpanded ? "Collapse" : "Expand"}
                    >
                      {promptExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </button>
                  )}
                </div>
                <div
                  ref={promptRef}
                  className={`text-xs font-mono overflow-y-auto transition-all ${promptExpanded ? "max-h-48" : "max-h-12 line-clamp-3"}`}
                  style={{ color: colors.text.primary }}
                >
                  {selectedConfig.instructions || "No instructions set"}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={handleCloseDropdown} />
      )}
    </div>
  );
}
