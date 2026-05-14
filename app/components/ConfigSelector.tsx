/**
 * ConfigSelector - Read-only config selector for Evaluations page
 * Allows selecting a saved config with "Edit in Prompt Editor" link
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConfigs } from "@/app/hooks";
import { Button, VersionPill, Loader } from "@/app/components";
import SelectedConfigPreview from "@/app/components/configurations/SelectedConfigPreview";
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
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);
  const [loadingVersionsFor, setLoadingVersionsFor] = useState<Set<string>>(
    new Set(),
  );
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    if (!expandedConfigId) return;
    const items = versionItemsMap[expandedConfigId];
    if (!items || items.length === 0) return;
    items.forEach((item) => {
      loadSingleVersion(item.config_id, item.version);
    });
  }, [expandedConfigId, versionItemsMap]);

  const selectedConfig = configs.find(
    (c) => c.config_id === selectedConfigId && c.version === selectedVersion,
  );

  const selectedConfigName = selectedConfigId
    ? allConfigMeta.find((m) => m.id === selectedConfigId)?.name
    : undefined;

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
  }, [selectedConfigId, selectedVersion, configs]);

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
    setSearchQuery("");
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

  const buildEditorUrl = (configId?: string, version?: number) => {
    const params = new URLSearchParams();
    if (configId && version) {
      params.set("config", configId);
      params.set("version", version.toString());
    } else {
      params.set("new", "true");
    }
    if (datasetId) params.set("dataset", datasetId);
    if (experimentName) params.set("experiment", experimentName);
    params.set("from", "evaluations");
    return `/configurations/prompt-editor?${params.toString()}`;
  };

  const handleEditInPromptEditor = () => {
    router.push(buildEditorUrl(selectedConfigId, selectedVersion));
  };

  const handleBrowseLibrary = () => {
    const params = new URLSearchParams();
    if (datasetId) params.set("dataset", datasetId);
    if (experimentName) params.set("experiment", experimentName);
    params.set("from", "evaluations");
    router.push(`/configurations?${params.toString()}`);
  };

  const cardClass = compact
    ? ""
    : "rounded-lg p-6 bg-bg-primary border border-border";

  const headingClass = compact
    ? "text-xs font-medium text-text-secondary"
    : "text-lg font-semibold text-text-primary";

  const headingText = compact ? "Configuration *" : "Select Configuration";

  if (isLoading) {
    return (
      <div className={cardClass}>
        <div
          className={`flex items-center gap-2 ${compact ? "mb-1.5" : "mb-4"}`}
        >
          <h2 className={headingClass}>{headingText}</h2>
        </div>
        <div className="w-full px-4 py-3 rounded-md text-sm bg-bg-secondary text-text-secondary">
          Loading configurations...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cardClass}>
        <div
          className={`flex items-center gap-2 ${compact ? "mb-1.5" : "mb-4"}`}
        >
          <h2 className={headingClass}>{headingText}</h2>
        </div>
        <div className="rounded-lg p-4 text-sm bg-status-error-bg border border-status-error-border text-status-error-text">
          {error}
        </div>
      </div>
    );
  }

  const noConfigsAvailable = (
    <div className="rounded-lg p-6 text-center bg-bg-secondary border-2 border-dashed border-border">
      <GearIcon className="w-10 h-10 mx-auto mb-2 text-text-secondary" />
      <p className="text-sm font-medium text-text-primary">
        No configurations found
      </p>
      <p className="text-xs mt-1 text-text-secondary">
        Create a configuration in the Prompt Editor first
      </p>
      <div className="mt-3 flex justify-center">
        <Button variant="primary" size="sm" onClick={handleEditInPromptEditor}>
          Create Configuration
        </Button>
      </div>
    </div>
  );

  const renderModelMetaLine = (item: {
    config_id: string;
    version: number;
    inserted_at: string;
  }) => {
    const full = configs.find(
      (c) => c.config_id === item.config_id && c.version === item.version,
    );
    return (
      <div className="text-xs mt-0.5 font-mono text-text-secondary">
        {full
          ? `${full.provider}/${full.modelName} ${full.temperature !== undefined ? `• T:${full.temperature.toFixed(2)}` : ""} • ${formatRelativeTime(item.inserted_at)}`
          : formatRelativeTime(item.inserted_at)}
      </div>
    );
  };

  const triggerBorder =
    selectedConfig || (selectedConfigName && selectedVersion)
      ? "border-accent-primary"
      : "border-border";
  const triggerText =
    selectedConfig || (selectedConfigName && selectedVersion)
      ? "text-text-primary"
      : "text-text-secondary";
  const triggerBg = disabled ? "bg-bg-secondary" : "bg-bg-primary";

  return (
    <div className={cardClass}>
      <div
        className={`flex items-center justify-between ${compact ? "mb-1.5" : "mb-4"}`}
      >
        <div className="flex items-center gap-2">
          <h2 className={headingClass}>{headingText}</h2>
          {!compact && (
            <span className="text-xs text-text-secondary">(Required)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBrowseLibrary}>
            Browse Library
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEditInPromptEditor}
          >
            <EditIcon className="w-3.5 h-3.5" />
            {selectedConfig ? "Edit Config" : "Create Config"}
          </Button>
        </div>
      </div>

      {allConfigMeta.length === 0 ? (
        noConfigsAvailable
      ) : (
        <>
          <div className={`relative ${isDropdownOpen ? "z-50" : ""}`}>
            {isDropdownOpen ? (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search configurations..."
                autoFocus
                className="w-full px-3 py-2 rounded-md border border-accent-primary bg-bg-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
              />
            ) : (
              <div className="relative">
                <button
                  onClick={handleOpenDropdown}
                  disabled={disabled}
                  className={`w-full px-3 py-2 pr-8 rounded-md border text-sm text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${triggerBg} ${triggerBorder} ${triggerText}`}
                >
                  {isLoadingPreview
                    ? "Loading..."
                    : selectedConfig
                      ? `${selectedConfig.name} (v${selectedConfig.version})`
                      : selectedConfigName && selectedVersion
                        ? `${selectedConfigName} (v${selectedVersion})`
                        : "-- Select a configuration --"}
                </button>
                <ChevronDownIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary" />
              </div>
            )}

            {isDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 rounded-md shadow-lg max-h-64 overflow-auto bg-bg-primary border border-border">
                {filteredDisplayGroups.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-text-secondary">
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
                        <button
                          className="w-full px-3 py-2 text-left flex items-center justify-between sticky top-0 transition-colors bg-bg-secondary text-text-secondary hover:bg-neutral-100"
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
                              <div className="w-3 h-3 rounded-full animate-spin border-2 border-border border-t-accent-primary border-b-accent-primary [animation-duration:0.9s]" />
                            )}
                            {isExpanded ? (
                              <ChevronUpIcon className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDownIcon className="w-3.5 h-3.5" />
                            )}
                          </span>
                        </button>

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
                                className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors ${
                                  isSelected
                                    ? "bg-bg-secondary"
                                    : "bg-bg-primary hover:bg-bg-secondary"
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <VersionPill
                                      version={item.version}
                                      size="sm"
                                    />
                                    <span className="text-sm truncate text-text-primary">
                                      {item.commit_message || "No message"}
                                    </span>
                                  </div>
                                  {renderModelMetaLine(item)}
                                </div>
                                {isSelected && (
                                  <CheckIcon className="w-4 h-4 shrink-0 text-status-success" />
                                )}
                              </button>
                            );
                          })}

                        {isExpanded && isLoadingGroup && (
                          <div className="py-3">
                            <Loader size="sm" message="Loading versions…" />
                          </div>
                        )}

                        {isExpanded &&
                          !isLoadingGroup &&
                          versionItems.length === 0 && (
                            <div className="px-4 py-3 text-xs text-text-secondary">
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

          {isLoadingPreview && !selectedConfig && (
            <div className="mt-4 rounded-md p-4 bg-bg-secondary">
              <Loader size="sm" message="Loading configuration details…" />
            </div>
          )}

          {selectedConfig && !isLoadingPreview && (
            <SelectedConfigPreview config={selectedConfig} />
          )}
        </>
      )}

      {isDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={handleCloseDropdown} />
      )}
    </div>
  );
}
