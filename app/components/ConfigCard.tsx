/**
 * ConfigCard - Expandable card for displaying config information
 * Used in Config Library.
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SavedConfig, ConfigPublic } from "@/app/lib/types/configs";
import { formatRelativeTime } from "@/app/lib/utils";
import {
  CheckIcon,
  CopyIcon,
  ChevronDownIcon,
  EditIcon,
  PlayIcon,
} from "@/app/components/icons";
import { Button, Loader } from "@/app/components/ui";
import { VersionPill } from "@/app/components";
import { useToast } from "@/app/hooks/useToast";

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
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [latestVersion, setLatestVersion] = useState<SavedConfig | null>(null);
  const [totalVersions, setTotalVersions] = useState<number>(0);
  const [showTools, setShowTools] = useState(false);
  const [showVectorStores, setShowVectorStores] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedKbId, setCopiedKbId] = useState<string | null>(null);

  const handleCopyKbId = useCallback(
    async (e: React.MouseEvent, kbId: string) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(kbId);
        setCopiedKbId(kbId);
        toast.success("Knowledge Base ID copied to clipboard");
        setTimeout(() => setCopiedKbId(null), 1500);
      } catch {
        toast.error("Failed to copy");
      }
    },
    [toast],
  );

  const handleCopyId = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(config.id);
        setCopiedId(true);
        toast.success("Config ID copied to clipboard");
        setTimeout(() => setCopiedId(false), 2000);
      } catch {
        toast.error("Failed to copy");
      }
    },
    [config.id, toast],
  );

  const handleToggleExpand = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    if (latestVersion) {
      setExpanded(true);
      return;
    }

    setIsLoadingDetails(true);
    setExpanded(true);

    try {
      await onLoadVersions(config.id);

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

  const handleEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    router.push(
      latestVersion
        ? `/configurations/prompt-editor?config=${config.id}&version=${latestVersion.version}`
        : `/configurations/prompt-editor?config=${config.id}`,
    );
  };

  const handleUseInEvaluation = () => {
    const params = new URLSearchParams({
      tab: "evaluations",
      config: config.id,
    });
    if (latestVersion) {
      params.set("version", String(latestVersion.version));
    }
    router.push(`/evaluations?${params.toString()}`);
  };

  return (
    <div
      className={`relative rounded-lg overflow-hidden transition-all min-w-0 bg-bg-primary ${
        expanded
          ? "shadow-[0_2px_12px_rgba(0,0,0,0.06)] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-accent-primary before:rounded-l-lg"
          : "shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
      }`}
    >
      <div className="w-full text-left px-5 py-3 transition-colors hover:bg-neutral-50/60">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={handleToggleExpand}
            className="flex-1 min-w-0 text-left cursor-pointer"
            aria-expanded={expanded}
          >
            <h3 className="text-sm font-semibold text-text-primary truncate">
              {config.name}
            </h3>
            {config.description && (
              <p className="text-sm mt-0.5 text-text-secondary truncate">
                {config.description}
              </p>
            )}
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            {latestVersion && <VersionPill version={latestVersion.version} />}
            <button
              type="button"
              onClick={handleEdit}
              className="p-1.5 rounded-md border border-border bg-bg-primary text-text-secondary hover:text-accent-primary hover:border-accent-primary hover:bg-accent-primary/5 transition-colors cursor-pointer"
              title="Open in Editor"
              aria-label="Open in Editor"
            >
              <EditIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleToggleExpand}
              className="p-1.5 rounded-md text-text-secondary hover:bg-neutral-100 transition-colors cursor-pointer"
              title={expanded ? "Collapse details" : "Expand details"}
              aria-label={expanded ? "Collapse details" : "Expand details"}
            >
              <ChevronDownIcon
                className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleExpand}
          className="flex items-center gap-3 text-xs mt-2 text-text-secondary cursor-pointer w-full"
        >
          <span>Updated {formatRelativeTime(config.updated_at)}</span>
          {totalVersions > 0 && (
            <>
              <span aria-hidden>|</span>
              <span>
                {totalVersions} version{totalVersions !== 1 ? "s" : ""}
              </span>
            </>
          )}
          {evaluationCount > 0 && (
            <>
              <span aria-hidden>|</span>
              <span>
                {evaluationCount} evaluation{evaluationCount !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-neutral-100">
          {isLoadingDetails ? (
            <div className="py-6">
              <Loader size="sm" message="Loading details..." />
            </div>
          ) : latestVersion ? (
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-3 px-2.5 py-1.5 rounded-md bg-bg-secondary">
                <span className="text-xs shrink-0 text-text-secondary">
                  Config ID:
                </span>
                <span
                  className="text-xs font-mono truncate text-text-primary"
                  title={config.id}
                >
                  {config.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="ml-auto p-1 rounded-md transition-colors shrink-0 cursor-pointer hover:bg-neutral-200"
                  title="Copy Config ID"
                  aria-label="Copy Config ID"
                >
                  {copiedId ? (
                    <CheckIcon className="w-3.5 h-3.5 text-status-success" />
                  ) : (
                    <CopyIcon className="w-3.5 h-3.5 text-text-secondary" />
                  )}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <MetaPill label="Provider" value={latestVersion.provider} />
                <MetaPill
                  label="Type"
                  value={
                    latestVersion.type === "text"
                      ? "Text"
                      : latestVersion.type === "stt"
                        ? "STT"
                        : latestVersion.type === "tts"
                          ? "TTS"
                          : (latestVersion.type ?? "")
                  }
                />
                <MetaPill label="Model" value={latestVersion.modelName} />
                {latestVersion.temperature != null && (
                  <MetaPill
                    label="Temp"
                    value={latestVersion.temperature.toFixed(2)}
                  />
                )}
              </div>

              {latestVersion.tools && latestVersion.tools.length > 0 && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowTools(!showTools)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors bg-bg-secondary border border-border hover:bg-neutral-100 cursor-pointer"
                  >
                    <span className="text-text-secondary">
                      Tools ({latestVersion.tools.length})
                    </span>
                    <ChevronDownIcon
                      className={`w-3 h-3 text-text-secondary transition-transform ${showTools ? "rotate-180" : ""}`}
                    />
                  </button>
                  {showTools && (
                    <div className="mt-1 p-2 rounded-md text-xs space-y-2 bg-bg-secondary border border-border">
                      {latestVersion.tools.map((tool, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="text-text-primary font-medium">
                            {tool.type}
                          </div>
                          {tool.knowledge_base_ids &&
                            tool.knowledge_base_ids.length > 0 && (
                              <div className="text-text-secondary">
                                Knowledge Bases:{" "}
                                {tool.knowledge_base_ids.length}
                              </div>
                            )}
                          {tool.max_num_results && (
                            <div className="text-text-secondary">
                              Max Results: {tool.max_num_results}
                            </div>
                          )}
                        </div>
                      ))}

                      {(() => {
                        const allVectorStoreIds = latestVersion
                          .tools!.flatMap(
                            (tool) => tool.knowledge_base_ids || [],
                          )
                          .filter((id) => id);

                        return (
                          allVectorStoreIds.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-border">
                              <button
                                onClick={() =>
                                  setShowVectorStores(!showVectorStores)
                                }
                                className="w-full flex items-center justify-between px-2 py-1 rounded-md transition-colors bg-bg-primary hover:bg-neutral-100 cursor-pointer"
                              >
                                <span className="text-[11px] text-text-secondary">
                                  Knowledge Base IDs ({allVectorStoreIds.length}
                                  )
                                </span>
                                <ChevronDownIcon
                                  className={`w-3 h-3 text-text-secondary transition-transform ${showVectorStores ? "rotate-180" : ""}`}
                                />
                              </button>
                              {showVectorStores && (
                                <div className="mt-1 p-2 rounded-md space-y-1 bg-bg-primary text-text-primary">
                                  {allVectorStoreIds.map((id, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-1.5 group"
                                    >
                                      <span className="break-all font-mono text-[10px] flex-1 min-w-0">
                                        {id}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopyKbId(e, id)}
                                        className="shrink-0 p-1 rounded text-text-secondary hover:text-text-primary hover:bg-neutral-100 transition-colors cursor-pointer"
                                        title={
                                          copiedKbId === id
                                            ? "Copied"
                                            : "Copy Knowledge Base ID"
                                        }
                                        aria-label={
                                          copiedKbId === id
                                            ? "Copied"
                                            : "Copy Knowledge Base ID"
                                        }
                                      >
                                        {copiedKbId === id ? (
                                          <CheckIcon className="w-3 h-3 text-status-success" />
                                        ) : (
                                          <CopyIcon className="w-3 h-3" />
                                        )}
                                      </button>
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

              <div className="rounded-md p-3 mb-4 text-xs font-mono overflow-y-auto overflow-x-hidden bg-bg-secondary max-h-[200px]">
                <p className="whitespace-pre-wrap wrap-break-word text-text-secondary">
                  {latestVersion.instructions || "No instructions set"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleEdit}
                  className="flex-1"
                >
                  <EditIcon className="w-4 h-4" />
                  Open in Editor
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleUseInEvaluation}
                  className="flex-1"
                >
                  <PlayIcon className="w-4 h-4" />
                  Run Evaluation
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-text-secondary">
                No version details available
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2.5 py-1 rounded-md text-xs bg-bg-secondary">
      <span className="text-text-secondary">{label}: </span>
      <span className="text-text-primary font-medium">{value}</span>
    </div>
  );
}
