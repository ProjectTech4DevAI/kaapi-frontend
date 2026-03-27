/**
 * ConfigCard - Expandable card for displaying config information
 * Used in Config Library.
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/app/lib/colors";
import { SavedConfig, ConfigPublic } from "@/app/lib/types/configs";
import { formatRelativeTime } from "@/app/lib/utils";

interface ConfigCardProps {
  config: ConfigPublic;
  evaluationCount?: number;
  onLoadVersions: (configId: string) => Promise<void>;
  onLoadSingleVersion: (
    configId: string,
    version: number,
  ) => Promise<SavedConfig | null>;
}

export default function ConfigCard({
  config,
  evaluationCount = 0,
  onLoadVersions,
  onLoadSingleVersion,
}: ConfigCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [latestVersion, setLatestVersion] = useState<SavedConfig | null>(null);
  const [totalVersions, setTotalVersions] = useState<number>(0);
  const [showTools, setShowTools] = useState(false);
  const [showVectorStores, setShowVectorStores] = useState(false);

  const handleToggleExpand = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    // If we already loaded the details, just expand
    if (latestVersion) {
      setExpanded(true);
      return;
    }

    setIsLoadingDetails(true);
    setExpanded(true);

    try {
      // 1. Fetch the version list for this config
      await onLoadVersions(config.id);

      // 2. Read the cached version items to find the latest version number
      //    (onLoadVersions populates configState.versionItemsCache)
      const { configState } = await import("@/app/lib/store/configStore");
      const versionItems = configState.versionItemsCache[config.id];
      if (!versionItems || versionItems.length === 0) {
        setIsLoadingDetails(false);
        return;
      }

      setTotalVersions(versionItems.length);

      const latestItem = versionItems.reduce((a, b) =>
        b.version > a.version ? b : a,
      );

      // 3. Fetch the full details for the latest version
      const detail = await onLoadSingleVersion(config.id, latestItem.version);
      if (detail) {
        setLatestVersion(detail);
      }
    } catch (e) {
      console.error(`Failed to load details for config ${config.id}:`, e);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [expanded, latestVersion, config.id, onLoadVersions, onLoadSingleVersion]);

  const handleEdit = () => {
    router.push(
      latestVersion
        ? `/configurations/prompt-editor?config=${config.id}&version=${latestVersion.version}`
        : `/configurations/prompt-editor?config=${config.id}`,
    );
  };

  const handleUseInEvaluation = () => {
    router.push(
      latestVersion
        ? `/evaluations?config=${config.id}&version=${latestVersion.version}`
        : `/evaluations?config=${config.id}`,
    );
  };

  return (
    <div
      className="border rounded-lg overflow-hidden transition-all"
      style={{
        backgroundColor: colors.bg.primary,
        borderColor: expanded ? colors.accent.primary : colors.border,
      }}
    >
      {/* Clickable Header */}
      <button
        onClick={handleToggleExpand}
        className="w-full text-left p-5 transition-colors"
        style={{ backgroundColor: colors.bg.primary }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = colors.bg.secondary)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = colors.bg.primary)
        }
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3
              className="text-base font-semibold truncate"
              style={{ color: colors.text.primary }}
            >
              {config.name}
            </h3>
            {config.description && (
              <p
                className="text-sm mt-0.5 truncate"
                style={{ color: colors.text.secondary }}
              >
                {config.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            {latestVersion && (
              <div
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.secondary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                v{latestVersion.version}
              </div>
            )}
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              style={{ color: colors.text.secondary }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {/* Collapsed meta row */}
        <div
          className="flex items-center gap-4 text-xs mt-2"
          style={{ color: colors.text.secondary }}
        >
          <span>Updated {formatRelativeTime(config.updated_at)}</span>
          {totalVersions > 0 && (
            <>
              <span>|</span>
              <span>
                {totalVersions} version{totalVersions !== 1 ? "s" : ""}
              </span>
            </>
          )}
          {evaluationCount > 0 && (
            <>
              <span>|</span>
              <span>
                {evaluationCount} evaluation{evaluationCount !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div
          className="px-5 pb-5"
          style={{ borderTop: `1px solid ${colors.border}` }}
        >
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-6 gap-2">
              <svg
                className="w-4 h-4 animate-spin"
                style={{ color: colors.text.secondary }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span
                className="text-sm"
                style={{ color: colors.text.secondary }}
              >
                Loading details...
              </span>
            </div>
          ) : latestVersion ? (
            <div className="pt-4">
              {/* Config Details */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div
                  className="px-2.5 py-1 rounded-md text-xs"
                  style={{ backgroundColor: colors.bg.secondary }}
                >
                  <span style={{ color: colors.text.secondary }}>
                    Provider:{" "}
                  </span>
                  <span style={{ color: colors.text.primary, fontWeight: 500 }}>
                    {latestVersion.provider}
                  </span>
                </div>
                <div
                  className="px-2.5 py-1 rounded-md text-xs"
                  style={{ backgroundColor: colors.bg.secondary }}
                >
                  <span style={{ color: colors.text.secondary }}>Type: </span>
                  <span style={{ color: colors.text.primary, fontWeight: 500 }}>
                    {latestVersion.type === "text" && "Text"}
                    {latestVersion.type === "stt" && "STT"}
                    {latestVersion.type === "tts" && "TTS"}
                  </span>
                </div>
                <div
                  className="px-2.5 py-1 rounded-md text-xs"
                  style={{ backgroundColor: colors.bg.secondary }}
                >
                  <span style={{ color: colors.text.secondary }}>Model: </span>
                  <span style={{ color: colors.text.primary, fontWeight: 500 }}>
                    {latestVersion.modelName}
                  </span>
                </div>
                <div
                  className="px-2.5 py-1 rounded-md text-xs"
                  style={{ backgroundColor: colors.bg.secondary }}
                >
                  <span style={{ color: colors.text.secondary }}>Temp: </span>
                  <span style={{ color: colors.text.primary, fontWeight: 500 }}>
                    {latestVersion.temperature.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Tools Dropdown */}
              {latestVersion.tools && latestVersion.tools.length > 0 && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowTools(!showTools)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors"
                    style={{
                      backgroundColor: colors.bg.secondary,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <span style={{ color: colors.text.secondary }}>
                      Tools ({latestVersion.tools.length})
                    </span>
                    <svg
                      className={`w-3 h-3 transition-transform ${showTools ? "rotate-180" : ""}`}
                      style={{ color: colors.text.secondary }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {showTools && (
                    <div
                      className="mt-1 p-2 rounded-md text-xs space-y-2"
                      style={{
                        backgroundColor: colors.bg.secondary,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {latestVersion.tools.map((tool, idx) => (
                        <div key={idx} className="space-y-1">
                          <div
                            style={{
                              color: colors.text.primary,
                              fontWeight: 500,
                            }}
                          >
                            {tool.type}
                          </div>
                          {tool.knowledge_base_ids &&
                            tool.knowledge_base_ids.length > 0 && (
                              <div style={{ color: colors.text.secondary }}>
                                Knowledge Bases:{" "}
                                {tool.knowledge_base_ids.length}
                              </div>
                            )}
                          {tool.max_num_results && (
                            <div style={{ color: colors.text.secondary }}>
                              Max Results: {tool.max_num_results}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Vector Stores Section inside Tools */}
                      {(() => {
                        const allVectorStoreIds = latestVersion
                          .tools!.flatMap(
                            (tool) => tool.knowledge_base_ids || [],
                          )
                          .filter((id) => id);

                        return (
                          allVectorStoreIds.length > 0 && (
                            <div
                              className="mt-3 pt-2"
                              style={{
                                borderTop: `1px solid ${colors.border}`,
                              }}
                            >
                              <button
                                onClick={() =>
                                  setShowVectorStores(!showVectorStores)
                                }
                                className="w-full flex items-center justify-between px-2 py-1 rounded-md transition-colors"
                                style={{
                                  backgroundColor: colors.bg.primary,
                                }}
                              >
                                <span
                                  style={{
                                    color: colors.text.secondary,
                                    fontSize: "11px",
                                  }}
                                >
                                  Knowledge Base IDs ({allVectorStoreIds.length}
                                  )
                                </span>
                                <svg
                                  className={`w-3 h-3 transition-transform ${showVectorStores ? "rotate-180" : ""}`}
                                  style={{ color: colors.text.secondary }}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>
                              {showVectorStores && (
                                <div
                                  className="mt-1 p-2 rounded-md space-y-1"
                                  style={{
                                    backgroundColor: colors.bg.primary,
                                    color: colors.text.primary,
                                  }}
                                >
                                  {allVectorStoreIds.map((id, idx) => (
                                    <div
                                      key={idx}
                                      className="break-all"
                                      style={{
                                        fontFamily: "monospace",
                                        fontSize: "10px",
                                      }}
                                    >
                                      {id}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Prompt */}
              <div
                className="rounded-md p-3 mb-4 text-xs font-mono overflow-auto"
                style={{
                  backgroundColor: colors.bg.secondary,
                  maxHeight: "200px",
                }}
              >
                <p
                  className="whitespace-pre-wrap"
                  style={{ color: colors.text.secondary }}
                >
                  {latestVersion.instructions || "No instructions set"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEdit}
                  className="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: colors.bg.primary,
                    border: `1px solid ${colors.border}`,
                    color: colors.text.primary,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      colors.bg.secondary)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = colors.bg.primary)
                  }
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Open in Editor
                </button>
                <button
                  onClick={handleUseInEvaluation}
                  className="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: colors.accent.primary,
                    color: colors.bg.primary,
                    border: "none",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      colors.accent.hover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      colors.accent.primary)
                  }
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Run Evaluation
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm" style={{ color: colors.text.secondary }}>
                No version details available
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
