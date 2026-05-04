import { Button } from "@/app/components";
import Loader from "@/app/components/Loader";
import { ChevronDownIcon } from "@/app/components/icons";
import { buildInitialAssessmentVersionState } from "@/app/lib/assessment/config";
import type {
  SavedConfigCardProps,
  SavedConfigsProps,
  VersionPanelProps,
  VersionSummaryProps,
} from "@/app/lib/types/assessment";
import { formatRelativeTime } from "@/app/lib/utils";

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

function SavedConfigCard({
  config,
  versions,
  expanded,
  loadingSelectionKeys,
  isSelected,
  onLoadVersions,
  onToggleExpansion,
  onToggleVersionSelection,
}: SavedConfigCardProps) {
  const latestVersion =
    versions.items.reduce<number>(
      (maxVersion, item) =>
        item.version > maxVersion ? item.version : maxVersion,
      0,
    ) || 1;
  const defaultSelected = isSelected(config.id, latestVersion);
  const defaultLoading = loadingSelectionKeys[`${config.id}:${latestVersion}`];
  const knownVersionCount = versions.items.length;
  const hasVersionsPanel =
    knownVersionCount > 0 ||
    versions.hasMore ||
    versions.isLoading ||
    Boolean(versions.error);
  const previewVersions = versions.items.slice(0, 3);
  const versionCountLabel =
    knownVersionCount > 0
      ? `${knownVersionCount}${versions.hasMore ? "+" : ""}`
      : "Check";

  const cardBorder =
    expanded || defaultSelected ? "border-accent-primary" : "border-border";

  return (
    <div
      className={`flex flex-col rounded-[24px] border bg-bg-primary p-3.5 ${cardBorder}`}
      style={{
        boxShadow: expanded
          ? "0 10px 22px rgba(15, 23, 42, 0.06)"
          : "0 4px 14px rgba(15, 23, 42, 0.035)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-text-primary">
            {config.name}
          </div>
          <div className="mt-1 text-xs text-text-secondary">
            {config.updated_at
              ? formatRelativeTime(config.updated_at)
              : "Saved behavior"}
          </div>
          {config.description && (
            <div className="mt-1.5 text-xs leading-5 text-text-secondary">
              {config.description}
            </div>
          )}
        </div>
        {defaultSelected && (
          <span className="shrink-0 rounded-full border border-border bg-bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-text-primary">
            Added
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant={defaultSelected ? "outline" : "primary"}
          size="sm"
          onClick={() => void onToggleVersionSelection(config, latestVersion)}
          disabled={Boolean(defaultLoading)}
          className={`!min-w-[126px] !rounded-full !px-3.5 !py-2 !text-[12px] ${
            defaultLoading ? "cursor-progress" : ""
          } ${defaultSelected ? "!bg-bg-secondary" : ""}`}
        >
          {defaultLoading
            ? "Working..."
            : defaultSelected
              ? "Added"
              : "Use this behavior"}
        </Button>

        {hasVersionsPanel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onToggleExpansion(config.id)}
            aria-label={
              expanded ? "Hide saved versions" : "View saved versions"
            }
            className={`!min-w-[146px] !rounded-full !px-3.5 !py-2 !text-[12px] ${
              expanded
                ? "!border-accent-primary !bg-bg-secondary"
                : "!bg-bg-primary"
            }`}
          >
            <span className="font-semibold">
              {expanded ? "Hide versions" : "Show versions"}
            </span>
            <span className="rounded-full bg-bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
              {versionCountLabel}
            </span>
            <ChevronDownIcon
              className={`h-3 w-3 transition-transform duration-300 ease-in-out ${
                expanded ? "rotate-180" : "rotate-0"
              }`}
            />
          </Button>
        )}
      </div>

      {hasVersionsPanel && (
        <VersionSummary
          previewVersions={previewVersions}
          knownVersionCount={knownVersionCount}
        />
      )}

      {hasVersionsPanel && (
        <VersionPanel
          config={config}
          versions={versions}
          expanded={expanded}
          loadingSelectionKeys={loadingSelectionKeys}
          isSelected={isSelected}
          onLoadVersions={onLoadVersions}
          onToggleVersionSelection={onToggleVersionSelection}
        />
      )}
    </div>
  );
}

function VersionSummary({
  previewVersions,
  knownVersionCount,
}: VersionSummaryProps) {
  return (
    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-secondary">
      <span className="inline-flex items-center rounded-full border border-border bg-bg-secondary px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
        {previewVersions.length > 0
          ? previewVersions.map((version) => `v${version.version}`).join(", ")
          : "Versions"}
      </span>
      <span>
        {previewVersions.length > 0
          ? `${knownVersionCount} saved version${
              knownVersionCount === 1 ? "" : "s"
            }`
          : 'Use "Show versions" to view history'}
      </span>
    </div>
  );
}

function VersionPanel({
  config,
  versions,
  expanded,
  loadingSelectionKeys,
  isSelected,
  onLoadVersions,
  onToggleVersionSelection,
}: VersionPanelProps) {
  return (
    <div
      className={`mt-2 overflow-hidden transition-all duration-300 ease-in-out ${
        expanded ? "max-h-[22rem] opacity-100" : "max-h-0 opacity-0"
      }`}
      style={{ pointerEvents: expanded ? "auto" : "none" }}
    >
      <div className="rounded-[20px] border border-border bg-bg-secondary p-2.5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-text-primary">
              Saved versions
            </div>
            <div className="mt-0.5 text-xs text-text-secondary">
              Pick a specific version to reuse.
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-bg-primary px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
            {versions.items.length}
          </span>
        </div>
        {versions.isLoading && versions.items.length === 0 ? (
          <div className="py-2 text-center text-xs text-text-secondary">
            Loading versions...
          </div>
        ) : (
          <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {versions.items.map((version) => {
              const selected = isSelected(config.id, version.version);
              const loading =
                loadingSelectionKeys[`${config.id}:${version.version}`];

              return (
                <div
                  key={version.id}
                  className={`flex items-center justify-between gap-2.5 rounded-[18px] border bg-bg-primary px-2.5 py-2 ${
                    selected ? "border-accent-primary" : "border-border"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-border bg-bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary">
                        v{version.version}
                      </span>
                      <div className="text-xs font-semibold text-text-primary">
                        Version {version.version}
                      </div>
                    </div>
                    {version.commit_message && (
                      <div className="mt-1 truncate text-[11px] text-text-secondary">
                        {version.commit_message}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant={selected ? "outline" : "primary"}
                    size="sm"
                    onClick={() =>
                      void onToggleVersionSelection(config, version.version)
                    }
                    disabled={Boolean(loading)}
                    className={`!rounded-full !px-3 !py-1.5 !text-[11px] ${
                      selected ? "!bg-bg-secondary" : ""
                    }`}
                  >
                    {loading ? "..." : selected ? "Added" : "Use"}
                  </Button>
                </div>
              );
            })}
            {versions.hasMore && !versions.isLoading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => onLoadVersions(config.id, versions.nextSkip)}
                className="!py-1.5 !text-xs !text-accent-primary"
              >
                Load more
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
