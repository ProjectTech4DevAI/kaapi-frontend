"use client";

import { useState, useRef, useEffect } from "react";
import { colors } from "@/app/lib/colors";
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
        <h2
          className="text-lg font-semibold"
          style={{ color: colors.text.primary }}
        >
          Select Configurations
        </h2>
        <p className="text-sm mt-1" style={{ color: colors.text.secondary }}>
          Choose up to {MAX_CONFIGS} configurations for comparison. Each will
          run as a separate batch.
        </p>
      </div>

      {/* Selected configs as tags */}
      {configs.length > 0 && (
        <div>
          <label
            className="block text-xs font-medium mb-2"
            style={{ color: colors.text.secondary }}
          >
            Selected ({configs.length}/{MAX_CONFIGS})
          </label>
          <div className="flex flex-wrap gap-2">
            {configs.map((config, index) => (
              <div
                key={`${config.config_id}-${config.config_version}`}
                className="inline-flex items-center gap-2 border rounded-full pl-3 pr-1.5 py-1.5"
                style={{
                  borderColor: colors.accent.primary,
                  backgroundColor: "rgba(59, 130, 246, 0.05)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-sm font-medium"
                    style={{ color: colors.text.primary }}
                  >
                    {config.name}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: colors.bg.secondary,
                      color: colors.text.secondary,
                    }}
                  >
                    v{config.config_version}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: colors.text.secondary }}
                  >
                    {config.provider}/{config.model}
                  </span>
                </div>
                <button
                  onClick={() => removeConfig(index)}
                  className="p-0.5 rounded-full transition-colors hover:bg-red-50"
                  style={{ color: colors.text.secondary }}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config selector */}
      {configs.length < MAX_CONFIGS && (
        <div ref={dropdownRef} className="relative">
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: colors.text.secondary }}
          >
            Add Configuration
          </label>

          {isLoading ? (
            <div
              className="text-sm py-4 text-center"
              style={{ color: colors.text.secondary }}
            >
              Loading configurations...
            </div>
          ) : error ? (
            <div
              className="text-sm py-4 text-center"
              style={{ color: colors.status.error }}
            >
              {error}
            </div>
          ) : (
            <div className="relative">
              {/* Trigger / search input */}
              <div
                className="flex items-center border rounded-lg px-3 py-2.5 cursor-text"
                style={{
                  backgroundColor: colors.bg.primary,
                  borderColor: isDropdownOpen
                    ? colors.accent.primary
                    : colors.border,
                  boxShadow: isDropdownOpen
                    ? `0 0 0 1px ${colors.accent.primary}`
                    : "none",
                }}
                onClick={() => {
                  setIsDropdownOpen(true);
                  inputRef.current?.focus();
                }}
              >
                <svg
                  className="w-4 h-4 mr-2 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: colors.text.secondary }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
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
                  className="flex-1 text-sm bg-transparent outline-none"
                  style={{ color: colors.text.primary }}
                />
                {isDropdownOpen && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(false);
                      setSearchQuery("");
                    }}
                    className="p-0.5 rounded"
                    style={{ color: colors.text.secondary }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Dropdown list */}
              {isDropdownOpen && (
                <div
                  className="absolute z-50 w-full mt-1 rounded-lg border shadow-lg overflow-hidden"
                  style={{
                    backgroundColor: colors.bg.primary,
                    borderColor: colors.border,
                  }}
                >
                  <div className="max-h-72 overflow-auto">
                    {filteredGroups.length === 0 ? (
                      <div
                        className="px-4 py-6 text-center text-sm"
                        style={{ color: colors.text.secondary }}
                      >
                        {searchQuery
                          ? `No configs match "${searchQuery}"`
                          : "No configurations available"}
                      </div>
                    ) : (
                      filteredGroups.map((group) => (
                        <div key={group.config_id}>
                          {/* Group header */}
                          <div
                            className="px-3 py-2 text-xs font-semibold uppercase tracking-wide sticky top-0 border-b"
                            style={{
                              backgroundColor: colors.bg.secondary,
                              color: colors.text.secondary,
                              borderColor: colors.border,
                            }}
                          >
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
                                className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-b"
                                style={{
                                  backgroundColor: selected
                                    ? "rgba(59, 130, 246, 0.04)"
                                    : colors.bg.primary,
                                  borderColor: colors.border,
                                }}
                                onMouseEnter={(e) => {
                                  if (!selected)
                                    e.currentTarget.style.backgroundColor =
                                      colors.bg.secondary;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    selected
                                      ? "rgba(59, 130, 246, 0.04)"
                                      : colors.bg.primary;
                                }}
                              >
                                {/* Checkbox */}
                                <div
                                  className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center"
                                  style={{
                                    borderColor: selected
                                      ? colors.accent.primary
                                      : colors.border,
                                    backgroundColor: selected
                                      ? colors.accent.primary
                                      : "transparent",
                                  }}
                                >
                                  {selected && (
                                    <svg
                                      className="w-3 h-3"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="white"
                                      strokeWidth={3}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  )}
                                </div>
                                {/* Version info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
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
                                    className="text-xs mt-0.5 flex items-center gap-1"
                                    style={{ color: colors.text.secondary }}
                                  >
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
        <div
          className="rounded-lg border-2 border-dashed p-8 text-center"
          style={{ borderColor: colors.border }}
        >
          <svg
            className="mx-auto w-10 h-10 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: colors.border }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          <p
            className="text-sm font-medium mb-1"
            style={{ color: colors.text.primary }}
          >
            No configurations selected
          </p>
          <p className="text-xs" style={{ color: colors.text.secondary }}>
            Use the search above to find and select up to {MAX_CONFIGS}{" "}
            configurations
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-lg text-sm font-medium border"
          style={{
            borderColor: colors.border,
            color: colors.text.primary,
            backgroundColor: colors.bg.primary,
          }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={configs.length === 0}
          className="px-6 py-2.5 rounded-lg text-sm font-medium"
          style={{
            backgroundColor:
              configs.length > 0 ? colors.accent.primary : colors.bg.secondary,
            color: configs.length > 0 ? "#fff" : colors.text.secondary,
            cursor: configs.length > 0 ? "pointer" : "not-allowed",
          }}
        >
          Next: Review
        </button>
      </div>
    </div>
  );
}
