/**
 * ConfigSelector - Read-only config selector for Evaluations page
 * Allows selecting a saved config with "Edit in Prompt Editor" link
 */

"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/app/lib/colors";
import {
  useConfigs,
  SavedConfig,
  formatRelativeTime,
} from "@/app/lib/useConfigs";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  EditIcon,
  GearIcon,
  CheckIcon,
} from "@/app/components/icons";

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
  const { configs, configGroups, isLoading, error } = useConfigs();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [isPromptOverflowing, setIsPromptOverflowing] = useState(false);
  const promptRef = useRef<HTMLDivElement>(null);

  // Reset expanded state and recheck overflow whenever selected config changes.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPromptExpanded(false);
    const el = promptRef.current;
    if (!el) return;
    // clientHeight is capped by max-h-12; scrollHeight is the full content height.
    // Only show the icon when content actually overflows the collapsed box.
    setIsPromptOverflowing(el.scrollHeight > el.clientHeight);
  }, [selectedConfigId, selectedVersion, configs]);

  // Find currently selected config
  const selectedConfig = configs.find(
    (c) => c.config_id === selectedConfigId && c.version === selectedVersion,
  );

  // Filter config groups based on search query
  const filteredConfigGroups = searchQuery.trim()
    ? configGroups.filter((group) =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : configGroups;

  // Handle config selection
  const handleSelect = (config: SavedConfig) => {
    onConfigSelect(config.config_id, config.version);
    setIsDropdownOpen(false);
    setSearchQuery(""); // Clear search on selection
  };

  // Handle dropdown close
  const handleCloseDropdown = () => {
    setIsDropdownOpen(false);
    setSearchQuery(""); // Clear search on close
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

  return (
    <div
      className={compact ? "" : "border rounded-lg p-6"}
      style={
        compact
          ? {}
          : { backgroundColor: colors.bg.primary, borderColor: colors.border }
      }
    >
      {/* Header */}
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

      {/* No configs available */}
      {configGroups.length === 0 ? (
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
      ) : (
        <>
          {/* Dropdown Selector */}
          <div className={`relative ${isDropdownOpen ? "z-50" : ""}`}>
            {isDropdownOpen ? (
              /* Search Input when dropdown is open */
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
                  onClick={() =>
                    !disabled && setIsDropdownOpen(!isDropdownOpen)
                  }
                  disabled={disabled}
                  className="w-full px-3 py-2 pr-8 rounded-md border text-sm text-left transition-colors cursor-pointer disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: disabled
                      ? colors.bg.secondary
                      : colors.bg.primary,
                    borderColor: selectedConfig
                      ? colors.accent.primary
                      : colors.border,
                    color: selectedConfig
                      ? colors.text.primary
                      : colors.text.secondary,
                  }}
                >
                  {selectedConfig
                    ? `${selectedConfig.name} (v${selectedConfig.version})`
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
                {filteredConfigGroups.length === 0 ? (
                  <div
                    className="px-4 py-6 text-center text-sm"
                    style={{ color: colors.text.secondary }}
                  >
                    {searchQuery
                      ? `No configurations match "${searchQuery}"`
                      : "No configurations available"}
                  </div>
                ) : (
                  filteredConfigGroups.map((group) => (
                    <div key={group.config_id}>
                      {/* Config group header */}
                      <div
                        className="px-3 py-2 text-xs font-medium sticky top-0"
                        style={{
                          backgroundColor: colors.bg.secondary,
                          color: colors.text.secondary,
                        }}
                      >
                        {group.name} ({group.totalVersions} version
                        {group.totalVersions !== 1 ? "s" : ""})
                      </div>
                      {/* Versions */}
                      {group.versions.map((version) => (
                        <button
                          key={version.id}
                          onClick={() => handleSelect(version)}
                          className="w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors"
                          style={{
                            backgroundColor:
                              selectedConfig?.id === version.id
                                ? colors.bg.secondary
                                : colors.bg.primary,
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              colors.bg.secondary)
                          }
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              selectedConfig?.id === version.id
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
                                v{version.version}
                              </span>
                              <span
                                className="text-sm truncate"
                                style={{ color: colors.text.primary }}
                              >
                                {version.commit_message || "No message"}
                              </span>
                            </div>
                            <div
                              className="text-xs mt-0.5"
                              style={{ color: colors.text.secondary }}
                            >
                              {version.provider}/{version.modelName}
                              {version.temperature !== undefined && ` • T: ${version.temperature.toFixed(2)}`}
                              {version.tools && version.tools.length > 0 && (
                                <>
                                  {" "}
                                  •{" "}
                                  {
                                    version.tools
                                      .map((t) => t.knowledge_base_ids)
                                      .flat().length
                                  }{" "}
                                  KB
                                </>
                              )}
                              {" • "}
                              {formatRelativeTime(version.timestamp)}
                            </div>
                          </div>
                          {selectedConfig?.id === version.id && (
                            <CheckIcon
                              className="w-4 h-4 flex-shrink-0"
                              style={{ color: colors.status.success }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected Config Preview */}
          {selectedConfig && (
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
                {selectedConfig.temperature !== undefined && (
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
                )}
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
