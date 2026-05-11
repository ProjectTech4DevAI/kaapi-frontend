"use client";

import { useState } from "react";
import { VersionPill } from "@/app/components";
import {
  ChevronDownIcon,
  CheckIcon,
  PlusIcon,
  SpinnerIcon,
} from "@/app/components/icons";
import {
  ConfigPublic,
  SavedConfig,
  ConfigVersionItems,
} from "@/app/lib/types/configs";
import { formatRelativeTime } from "@/app/lib/utils";

interface LoadConfigDropdownProps {
  selectedConfig?: SavedConfig;
  selectedConfigId: string;
  savedConfigs: SavedConfig[];
  allConfigMeta: ConfigPublic[];
  versionItemsMap: Record<string, ConfigVersionItems[]>;
  loadVersionsForConfig?: (config_id: string) => Promise<void>;
  loadSingleVersion?: (
    config_id: string,
    version: number,
  ) => Promise<SavedConfig | null>;
  onLoadConfig: (config: SavedConfig | null) => void;
}

export default function LoadConfigDropdown({
  selectedConfig,
  selectedConfigId,
  savedConfigs,
  allConfigMeta,
  versionItemsMap,
  loadVersionsForConfig,
  loadSingleVersion,
  onLoadConfig,
}: LoadConfigDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);
  const [loadingVersionsFor, setLoadingVersionsFor] = useState<Set<string>>(
    new Set(),
  );

  const ensureVersionsLoaded = (configId: string) => {
    if (
      !versionItemsMap[configId] &&
      !loadingVersionsFor.has(configId) &&
      loadVersionsForConfig
    ) {
      setLoadingVersionsFor((prev) => new Set(prev).add(configId));
      loadVersionsForConfig(configId).finally(() => {
        setLoadingVersionsFor((prev) => {
          const s = new Set(prev);
          s.delete(configId);
          return s;
        });
      });
    }
  };

  const handleOpen = () => {
    if (!isOpen && selectedConfig) {
      setExpandedConfigId(selectedConfig.config_id);
      ensureVersionsLoaded(selectedConfig.config_id);
    }
    setIsOpen((prev) => !prev);
  };

  const handleToggleGroup = (config_id: string) => {
    if (expandedConfigId === config_id) {
      setExpandedConfigId(null);
      return;
    }
    setExpandedConfigId(config_id);
    ensureVersionsLoaded(config_id);
  };

  const handleSelectVersion = async (item: ConfigVersionItems) => {
    const full = savedConfigs.find(
      (c) => c.config_id === item.config_id && c.version === item.version,
    );
    const config =
      full ??
      (loadSingleVersion
        ? await loadSingleVersion(item.config_id, item.version)
        : null);
    if (config) {
      onLoadConfig(config);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <label className="block text-xs font-semibold mb-2 text-text-primary">
        Load Configuration
      </label>
      <button
        onClick={handleOpen}
        className={`w-full px-3 py-2.5 rounded-md text-left flex items-center justify-between transition-colors bg-bg-primary text-text-primary border ${
          selectedConfig ? "border-accent-primary" : "border-border"
        }`}
      >
        {selectedConfig ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="font-medium text-sm truncate"
                title={selectedConfig.name}
              >
                {selectedConfig.name}
              </span>
              <VersionPill
                version={selectedConfig.version}
                size="sm"
                className="shrink-0"
              />
            </div>
            <div className="text-xs mt-0.5 text-text-secondary truncate">
              {selectedConfig.provider}/{selectedConfig.modelName} •{" "}
              {selectedConfig.type}
            </div>
          </div>
        ) : (
          <span className="text-sm text-text-secondary whitespace-nowrap truncate">
            + New Configuration
          </span>
        )}
        <ChevronDownIcon
          className={`w-4 h-4 shrink-0 ml-2 transition-transform text-text-secondary ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 rounded-md shadow-lg max-h-64 overflow-auto bg-bg-primary border border-border">
          <button
            onClick={() => {
              onLoadConfig(null);
              setIsOpen(false);
            }}
            className={`w-full px-3 py-2.5 text-left flex items-center gap-2 transition-colors border-b border-border ${
              !selectedConfigId
                ? "bg-bg-secondary"
                : "bg-bg-primary hover:bg-bg-secondary"
            }`}
          >
            <PlusIcon className="w-4 h-4 text-accent-primary" />
            <span className="text-sm font-medium text-text-primary">
              New Configuration
            </span>
          </button>

          {allConfigMeta.map((meta) => {
            const isExpanded = expandedConfigId === meta.id;
            const isLoadingGroup = loadingVersionsFor.has(meta.id);
            const items = versionItemsMap[meta.id] ?? [];
            return (
              <div key={meta.id}>
                <button
                  className="w-full px-3 py-2 text-left flex items-center justify-between sticky top-0 transition-colors bg-bg-secondary text-text-secondary"
                  onClick={() => handleToggleGroup(meta.id)}
                >
                  <span className="text-xs font-medium">
                    {meta.name}
                    {items.length > 0 && (
                      <span className="ml-1 font-normal">({items.length})</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    {isLoadingGroup && <SpinnerIcon className="w-3 h-3" />}
                    <ChevronDownIcon
                      className={`w-3.5 h-3.5 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </span>
                </button>
                {isExpanded &&
                  !isLoadingGroup &&
                  items.map((item) => {
                    const isSelected =
                      selectedConfig?.config_id === meta.id &&
                      selectedConfig?.version === item.version;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectVersion(item)}
                        className={`w-full px-4 py-2 text-left flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-bg-secondary"
                            : "bg-bg-primary hover:bg-bg-secondary"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <VersionPill version={item.version} size="sm" />
                            <span className="text-sm truncate text-text-primary">
                              {item.commit_message || "No message"}
                            </span>
                          </div>
                          <div className="text-xs mt-0.5 text-text-secondary">
                            {formatRelativeTime(item.inserted_at)}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckIcon className="w-4 h-4 shrink-0 text-status-success" />
                        )}
                      </button>
                    );
                  })}
                {isExpanded && isLoadingGroup && (
                  <div className="px-4 py-3 text-xs text-text-secondary">
                    Loading versions…
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
