import { Button } from "@/app/components";
import Loader from "@/app/components/Loader";
import type { ConfigPublic } from "@/app/lib/types/configs";
import type { ValueSetter, VersionListState } from "@/app/lib/types/assessment";
import SavedConfigCard from "./SavedConfigCard";

const INITIAL_VERSION_STATE: VersionListState = {
  items: [],
  isLoading: false,
  error: null,
  hasMore: true,
  nextSkip: 0,
};

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
  onLoadMoreConfigs: (skip: number) => void;
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
        <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
          {configCards.map((config) => (
            <SavedConfigCard
              key={config.id}
              config={config}
              versions={
                versionStateByConfig[config.id] ?? INITIAL_VERSION_STATE
              }
              expanded={expandedConfigId === config.id}
              loadingSelectionKeys={loadingSelectionKeys}
              isSelected={isSelected}
              onLoadVersions={onLoadVersions}
              onToggleExpansion={onToggleConfigExpansion}
              onToggleVersionSelection={onToggleVersionSelection}
            />
          ))}
          {hasMoreConfigs && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => onLoadMoreConfigs(nextConfigSkip)}
              className="!rounded-xl !py-2 !text-xs"
            >
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
