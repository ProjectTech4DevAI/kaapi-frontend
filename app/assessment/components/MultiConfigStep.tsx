"use client";

import { useState, useRef, useEffect } from "react";
import {
  CheckIcon,
  ChevronUpIcon,
  CloseIcon,
  SearchIcon,
  SlidersIcon,
} from "@/app/components/icons";
import { useConfigs } from "@/app/hooks/useConfigs";
import { SavedConfig } from "@/app/lib/types/configs";
import { formatRelativeTime } from "@/app/lib/utils";
import { ConfigSelection, MAX_CONFIGS } from "../types";

interface MultiConfigStepProps {
  configs: ConfigSelection[];
  setConfigs: (configs: ConfigSelection[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function MultiConfigStep({
  configs,
  setConfigs,
  onNext,
  onBack,
}: MultiConfigStepProps) {
  const { configGroups, isLoading, error } = useConfigs();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredGroups = searchQuery.trim()
    ? configGroups.filter((g) =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : configGroups;

  const isSelected = (configId: string, version: number) =>
    configs.some(
      (c) => c.config_id === configId && c.config_version === version,
    );

  const handleSelect = (config: SavedConfig) => {
    if (isSelected(config.config_id, config.version)) {
      setConfigs(
        configs.filter(
          (c) =>
            !(
              c.config_id === config.config_id &&
              c.config_version === config.version
            ),
        ),
      );
    } else if (configs.length < MAX_CONFIGS) {
      setConfigs([
        ...configs,
        {
          config_id: config.config_id,
          config_version: config.version,
          name: config.name,
          provider: config.provider,
          model: config.modelName,
        },
      ]);
    }
    setSearchQuery("");
  };

  const removeConfig = (index: number) => {
    setConfigs(configs.filter((_, i) => i !== index));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
        setSearchQuery("");
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [isDropdownOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isDropdownOpen]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          Select Configurations
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Choose up to {MAX_CONFIGS} configurations for comparison. Each will
          run as a separate batch.
        </p>
      </div>

      {/* Selected configs as tags */}
      {configs.length > 0 && (
        <div>
          <label className="mb-2 block text-xs font-medium text-neutral-500">
            Selected ({configs.length}/{MAX_CONFIGS})
          </label>
          <div className="flex flex-wrap gap-2">
            {configs.map((config, index) => (
              <div
                key={`${config.config_id}-${config.config_version}`}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-900 bg-blue-500/[0.05] pl-3 pr-1.5 py-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-neutral-900">
                    {config.name}
                  </span>
                  <span className="rounded-full bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                    v{config.config_version}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {config.provider}/{config.model}
                  </span>
                </div>
                <button
                  onClick={() => removeConfig(index)}
                  className="rounded-full p-0.5 text-neutral-500 transition-colors hover:bg-red-50"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config selector */}
      {configs.length < MAX_CONFIGS && (
        <div ref={dropdownRef} className="relative">
          <label className="mb-1.5 block text-xs font-medium text-neutral-500">
            Add Configuration
          </label>

          {isLoading ? (
            <div className="py-4 text-center text-sm text-neutral-500">
              Loading configurations...
            </div>
          ) : error ? (
            <div className="py-4 text-center text-sm text-red-600">{error}</div>
          ) : (
            <div className="relative">
              {/* Trigger / search input */}
              <div
                className={`flex cursor-text items-center rounded-lg border bg-white px-3 py-2.5 ${
                  isDropdownOpen
                    ? "border-neutral-900 ring-1 ring-neutral-900"
                    : "border-neutral-200"
                }`}
                onClick={() => {
                  setIsDropdownOpen(true);
                  inputRef.current?.focus();
                }}
              >
                <SearchIcon className="mr-2 h-4 w-4 flex-shrink-0 text-neutral-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!isDropdownOpen) setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder={`Search configurations... (${MAX_CONFIGS - configs.length} remaining)`}
                  className="flex-1 bg-transparent text-sm text-neutral-900 outline-none"
                />
                {isDropdownOpen && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(false);
                      setSearchQuery("");
                    }}
                    className="rounded p-0.5 text-neutral-500"
                  >
                    <ChevronUpIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown list */}
              {isDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
                  <div className="max-h-72 overflow-auto">
                    {filteredGroups.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-neutral-500">
                        {searchQuery
                          ? `No configs match "${searchQuery}"`
                          : "No configurations available"}
                      </div>
                    ) : (
                      filteredGroups.map((group) => (
                        <div key={group.config_id}>
                          {/* Group header */}
                          <div className="sticky top-0 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            {group.name}
                            <span className="font-normal ml-1 normal-case">
                              ({group.totalVersions} version
                              {group.totalVersions !== 1 ? "s" : ""})
                            </span>
                          </div>
                          {/* Versions */}
                          {group.versions.map((version) => {
                            const selected = isSelected(
                              version.config_id,
                              version.version,
                            );
                            return (
                              <button
                                key={version.id}
                                onClick={() => handleSelect(version)}
                                className={`flex w-full items-center gap-3 border-b border-neutral-200 px-4 py-3 text-left transition-colors ${
                                  selected
                                    ? "bg-blue-500/[0.04]"
                                    : "bg-white hover:bg-neutral-50"
                                }`}
                              >
                                {/* Checkbox */}
                                <div
                                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                                    selected
                                      ? "border-neutral-900 bg-neutral-900"
                                      : "border-neutral-200 bg-transparent"
                                  }`}
                                >
                                  {selected && (
                                    <CheckIcon className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                {/* Version info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                                      v{version.version}
                                    </span>
                                    <span className="truncate text-sm text-neutral-900">
                                      {version.commit_message || "No message"}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                                    <span>
                                      {version.provider}/{version.modelName}
                                    </span>
                                    <span>·</span>
                                    <span>
                                      T:{version.temperature.toFixed(2)}
                                    </span>
                                    <span>·</span>
                                    <span>
                                      {formatRelativeTime(version.timestamp)}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {configs.length === 0 && !isLoading && !error && (
        <div className="rounded-lg border-2 border-dashed border-neutral-200 p-8 text-center">
          <SlidersIcon className="mx-auto mb-3 h-10 w-10 text-neutral-200" />
          <p className="mb-1 text-sm font-medium text-neutral-900">
            No configurations selected
          </p>
          <p className="text-xs text-neutral-500">
            Use the search above to find and select up to {MAX_CONFIGS}{" "}
            configurations
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="rounded-lg border border-neutral-200 bg-white px-6 py-2.5 text-sm font-medium text-neutral-900"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={configs.length === 0}
          className={`rounded-lg px-6 py-2.5 text-sm font-medium ${
            configs.length > 0
              ? "cursor-pointer bg-neutral-900 text-white"
              : "cursor-not-allowed bg-neutral-50 text-neutral-500"
          }`}
        >
          Next: Review
        </button>
      </div>
    </div>
  );
}
