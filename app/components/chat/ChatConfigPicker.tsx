/**
 * ChatConfigPicker - Compact dropdown to choose which configuration drives
 * the chat assistant. Defaults to the latest version of the most recently
 * updated config when nothing is selected.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfigs } from "@/app/hooks";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GearIcon,
  SpinnerIcon,
} from "@/app/components/icons";

interface ChatConfigPickerProps {
  configId: string;
  version: number;
  onSelect: (configId: string, version: number) => void;
  disabled?: boolean;
  /** Open the dropdown above the trigger (default: below). */
  openUp?: boolean;
  /** Anchor the dropdown to the trigger's left edge (default: right edge). */
  alignLeft?: boolean;
}

export default function ChatConfigPicker({
  configId,
  version,
  onSelect,
  disabled = false,
  openUp = false,
  alignLeft = false,
}: ChatConfigPickerProps) {
  const router = useRouter();
  const {
    configs,
    isLoading,
    allConfigMeta,
    versionItemsMap,
    loadVersionsForConfig,
  } = useConfigs({ pageSize: 0 });

  const [open, setOpen] = useState(false);
  const [expandedConfigId, setExpandedConfigId] = useState<string | null>(null);
  const [loadingVersions, setLoadingVersions] = useState<Set<string>>(
    new Set(),
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const selectedName = useMemo(() => {
    if (!configId) return undefined;
    const meta = allConfigMeta.find((m) => m.id === configId);
    if (meta) return meta.name;
    const cached = configs.find(
      (c) => c.config_id === configId && c.version === version,
    );
    return cached?.name;
  }, [configId, version, allConfigMeta, configs]);

  const toggleGroup = async (id: string) => {
    if (expandedConfigId === id) {
      setExpandedConfigId(null);
      return;
    }
    setExpandedConfigId(id);
    if (!versionItemsMap[id] && !loadingVersions.has(id)) {
      setLoadingVersions((prev) => new Set(prev).add(id));
      try {
        await loadVersionsForConfig(id);
      } finally {
        setLoadingVersions((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }
  };

  const handlePick = (cId: string, v: number) => {
    onSelect(cId, v);
    setOpen(false);
  };

  const label = isLoading
    ? "Loading…"
    : selectedName
      ? `${selectedName}${version ? ` (v${version})` : ""}`
      : allConfigMeta.length === 0
        ? "No configurations"
        : "Select a configuration";

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled || isLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-bg-primary text-[13px] font-medium text-text-primary hover:bg-neutral-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        <GearIcon className="w-3.5 h-3.5 text-text-secondary" />
        <span className="max-w-[220px] truncate">{label}</span>
        <ChevronDownIcon className="w-3.5 h-3.5 text-text-secondary" />
      </button>

      {open && (
        <div
          className={`absolute ${alignLeft ? "left-0" : "right-0"} ${openUp ? "bottom-full mb-2" : "top-full mt-2"} w-[320px] rounded-lg border border-border bg-bg-primary shadow-lg z-50 max-h-80 overflow-y-auto`}
        >
          {allConfigMeta.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-medium text-text-primary">
                No configurations yet
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Create one in the Prompt Editor to start chatting.
              </p>
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/configurations/prompt-editor?new=true");
                }}
                className="mt-3 px-3 py-1.5 rounded-md text-xs font-medium bg-accent-primary text-white hover:bg-accent-hover cursor-pointer"
              >
                Create Config
              </button>
            </div>
          ) : (
            allConfigMeta.map((meta) => {
              const isExpanded = expandedConfigId === meta.id;
              const isLoadingGroup = loadingVersions.has(meta.id);
              const items = versionItemsMap[meta.id] ?? [];
              return (
                <div
                  key={meta.id}
                  className="border-b border-border last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(meta.id)}
                    className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-neutral-50 cursor-pointer"
                  >
                    <span className="text-sm font-medium text-text-primary truncate">
                      {meta.name}
                      {items.length > 0 && (
                        <span className="ml-2 text-xs font-normal text-text-secondary">
                          {items.length} version{items.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-text-secondary shrink-0">
                      {isLoadingGroup && <SpinnerIcon />}
                      {isExpanded ? (
                        <ChevronUpIcon className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDownIcon className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="bg-bg-secondary">
                      {isLoadingGroup ? (
                        <div className="px-4 py-3 text-xs text-text-secondary">
                          Loading versions…
                        </div>
                      ) : items.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-text-secondary">
                          No versions available
                        </div>
                      ) : (
                        items.map((item) => {
                          const isSelected =
                            configId === item.config_id &&
                            version === item.version;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() =>
                                handlePick(item.config_id, item.version)
                              }
                              className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-neutral-100 transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <span className="text-xs px-1.5 py-0.5 rounded bg-bg-primary text-text-secondary border border-border">
                                  v{item.version}
                                </span>
                                <span className="text-sm text-text-primary truncate">
                                  {item.commit_message || "No message"}
                                </span>
                              </span>
                              {isSelected && (
                                <CheckIcon className="w-4 h-4 text-status-success shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
