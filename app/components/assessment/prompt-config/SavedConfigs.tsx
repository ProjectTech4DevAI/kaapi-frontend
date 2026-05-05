import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/components";
import Loader from "@/app/components/Loader";
import type { ConfigPublic } from "@/app/lib/types/configs";
import type { ValueSetter, VersionListState } from "@/app/lib/types/assessment";
import { buildInitialAssessmentVersionState } from "@/app/lib/utils/assessmentFetcher";
import SavedConfigCard from "./SavedConfigCard";

const CONFIGS_VISIBLE_BATCH_SIZE = 2;

interface SavedConfigsProps {
  configCards: ConfigPublic[];
  searchQuery: string;
  setSearchQuery: ValueSetter<string>;
  isLoadingConfigs: boolean;
  hasMoreConfigs: boolean;
  nextConfigSkip: number;
  expandedConfigId: string | null;
  versionStateByConfig: Record<string, VersionListState>;
  loadingSelectionKeys: Record<string, boolean>;
  isSelected: (configId: string, version: number) => boolean;
  onLoadMoreConfigs: (skip: number) => void | Promise<void>;
  onLoadVersions: (configId: string, skip: number) => void;
  onToggleConfigExpansion: ValueSetter<string>;
  onToggleVersionSelection: (
    config: ConfigPublic,
    version: number,
  ) => void | Promise<void>;
}

export default function SavedConfigs({
  configCards,
  searchQuery,
  setSearchQuery,
  isLoadingConfigs,
  hasMoreConfigs,
  nextConfigSkip,
  expandedConfigId,
  versionStateByConfig,
  loadingSelectionKeys,
  isSelected,
  onLoadMoreConfigs,
  onLoadVersions,
  onToggleConfigExpansion,
  onToggleVersionSelection,
}: SavedConfigsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [visibleConfigCount, setVisibleConfigCount] = useState(
    CONFIGS_VISIBLE_BATCH_SIZE,
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const visibleConfigCards = configCards.slice(0, visibleConfigCount);
  const hasHiddenLoadedConfigs = visibleConfigCount < configCards.length;
  const canViewMoreConfigs = hasHiddenLoadedConfigs || hasMoreConfigs;

  useEffect(() => {
    setVisibleConfigCount(CONFIGS_VISIBLE_BATCH_SIZE);
  }, [searchQuery]);

  const scrollToListEnd = () => {
    requestAnimationFrame(() => {
      const listElement = listRef.current;
      if (!listElement) return;
      listElement.scrollTo({
        top: listElement.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  const handleViewMore = async () => {
    if (isLoadingMore) return;
    if (hasHiddenLoadedConfigs) {
      setVisibleConfigCount((prev) =>
        Math.min(prev + CONFIGS_VISIBLE_BATCH_SIZE, configCards.length),
      );
      scrollToListEnd();
      return;
    }
    if (!hasMoreConfigs) return;

    setIsLoadingMore(true);
    try {
      await onLoadMoreConfigs(nextConfigSkip);
      setVisibleConfigCount((prev) => prev + CONFIGS_VISIBLE_BATCH_SIZE);
      scrollToListEnd();
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div>
      <div className="mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search behaviors..."
          className="w-full rounded-xl border border-border bg-bg-secondary px-4 py-2.5 text-sm text-text-primary outline-none"
        />
      </div>

      {isLoadingConfigs ? (
        <div className="py-8">
          <Loader size="sm" message="Loading behaviors..." />
        </div>
      ) : configCards.length === 0 ? (
        <div className="py-8 text-center text-sm text-text-secondary">
          {searchQuery
            ? "No behaviors match your search."
            : "No saved behaviors found."}
        </div>
      ) : (
        <div
          ref={listRef}
          className="max-h-[560px] space-y-3 overflow-y-auto pr-1"
        >
          {visibleConfigCards.map((config) => (
            <SavedConfigCard
              key={config.id}
              config={config}
              versions={
                versionStateByConfig[config.id] ??
                buildInitialAssessmentVersionState()
              }
              expanded={expandedConfigId === config.id}
              loadingSelectionKeys={loadingSelectionKeys}
              isSelected={isSelected}
              onLoadVersions={onLoadVersions}
              onToggleExpansion={onToggleConfigExpansion}
              onToggleVersionSelection={onToggleVersionSelection}
            />
          ))}
          {canViewMoreConfigs && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => void handleViewMore()}
              disabled={isLoadingMore}
              className="!rounded-xl !py-2 !text-xs"
            >
              {isLoadingMore ? "Loading..." : "View more"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
