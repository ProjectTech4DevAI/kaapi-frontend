import { useMemo, useState } from "react";
import PromptDiffPane from "./PromptDiffPane";
import ConfigDiffPane from "./ConfigDiffPane";
import { Button, VersionPill } from "@/app/components";
import Select, { SelectOption } from "@/app/components/Select";
import { ArrowLeftIcon, ChevronRightIcon } from "@/app/components/icons";
import { SavedConfig, ConfigVersionItems } from "@/app/lib/types/configs";
import { formatRelativeTime } from "@/app/lib/utils";

interface DiffViewProps {
  selectedCommit: SavedConfig;
  compareWith: SavedConfig | null;
  commits: SavedConfig[];
  onCompareChange: (commit: SavedConfig | null) => void;
  onLoadVersion: (config: SavedConfig) => void;
  loadVersionsForConfig?: (config_id: string) => Promise<void>;
  versionItemsMap?: Record<string, ConfigVersionItems[]>;
  onFetchVersionDetail?: (
    config_id: string,
    version: number,
  ) => Promise<SavedConfig | null>;
}

interface ConfigGroupForCompare {
  config_id: string;
  name: string;
  items: ConfigVersionItems[];
}

const encodeValue = (config_id: string, version: number) =>
  `${config_id}:${version}`;
const decodeValue = (
  val: string,
): { config_id: string; version: number } | null => {
  const idx = val.lastIndexOf(":");
  if (idx === -1) return null;
  return {
    config_id: val.slice(0, idx),
    version: parseInt(val.slice(idx + 1), 10),
  };
};

export default function DiffView({
  selectedCommit,
  compareWith,
  commits,
  onCompareChange,
  onLoadVersion,
  loadVersionsForConfig,
  versionItemsMap,
  onFetchVersionDetail,
}: DiffViewProps) {
  const [isLoadingCompare, setIsLoadingCompare] = useState(false);

  const configGroups = useMemo((): ConfigGroupForCompare[] => {
    if (versionItemsMap && Object.keys(versionItemsMap).length > 0) {
      return Object.entries(versionItemsMap).map(([config_id, items]) => {
        const nameFallback =
          commits.find((c) => c.config_id === config_id)?.name ?? config_id;
        const sorted = [...items].sort((a, b) => b.version - a.version);
        return { config_id, name: nameFallback, items: sorted };
      });
    }
    const grouped = new Map<string, SavedConfig[]>();
    commits.forEach((config) => {
      const existing = grouped.get(config.config_id) || [];
      existing.push(config);
      grouped.set(config.config_id, existing);
    });
    return Array.from(grouped.entries()).map(([config_id, versions]) => {
      const sorted = versions.sort((a, b) => b.version - a.version);
      return {
        config_id,
        name: sorted[0].name,
        items: sorted.map((v) => ({
          id: v.id,
          config_id: v.config_id,
          version: v.version,
          commit_message: v.commit_message ?? null,
          inserted_at: v.timestamp,
          updated_at: v.timestamp,
        })),
      };
    });
  }, [commits, versionItemsMap]);

  const selectOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [];
    configGroups.forEach((group) => {
      group.items
        .filter(
          (v) =>
            !(
              v.config_id === selectedCommit.config_id &&
              v.version === selectedCommit.version
            ),
        )
        .forEach((item) => {
          opts.push({
            value: encodeValue(item.config_id, item.version),
            label: `${group.name} • v${item.version} — ${item.commit_message || "No message"} (${formatRelativeTime(item.inserted_at)})`,
          });
        });
    });
    return opts;
  }, [configGroups, selectedCommit]);

  const currentValue = compareWith
    ? encodeValue(compareWith.config_id, compareWith.version)
    : "";

  const handleCompareSelect = async (rawValue: string) => {
    if (!rawValue) {
      onCompareChange(null);
      return;
    }
    const decoded = decodeValue(rawValue);
    if (!decoded) return;
    const { config_id, version } = decoded;

    let detail = commits.find(
      (c) => c.config_id === config_id && c.version === version,
    );
    if (detail) {
      onCompareChange(detail);
      return;
    }

    if (onFetchVersionDetail) {
      setIsLoadingCompare(true);
      detail = (await onFetchVersionDetail(config_id, version)) ?? undefined;
      setIsLoadingCompare(false);
    }
    onCompareChange(detail ?? null);
  };

  const sameConfig = compareWith?.name === selectedCommit.name;
  const compareLabelLeft = compareWith
    ? sameConfig
      ? `Load v${compareWith.version}`
      : `Load ${compareWith.name} v${compareWith.version}`
    : "";
  const compareLabelRight = compareWith
    ? sameConfig
      ? `Load v${selectedCommit.version}`
      : `Load ${selectedCommit.name} v${selectedCommit.version}`
    : "";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-secondary">
      <div className="px-6 py-4 border-b border-border bg-bg-primary">
        <div className="mb-3">
          <div className="flex items-baseline gap-2 mb-1 min-w-0">
            <h2
              className="text-lg font-semibold text-text-primary truncate min-w-0 max-w-md"
              title={selectedCommit.name}
            >
              {selectedCommit.name}
            </h2>
            <VersionPill
              version={selectedCommit.version}
              className="shrink-0"
            />
          </div>
          <div className="text-xs text-text-secondary truncate">
            {formatRelativeTime(selectedCommit.timestamp)} •{" "}
            {selectedCommit.provider}/{selectedCommit.modelName}
            {selectedCommit.commit_message &&
              ` • ${selectedCommit.commit_message}`}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[260px] max-w-md">
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Compare with
            </label>
            <Select
              value={currentValue}
              disabled={isLoadingCompare}
              placeholder={
                isLoadingCompare ? "Loading…" : "Select a version to compare…"
              }
              options={selectOptions}
              onFocus={() => {
                if (loadVersionsForConfig) {
                  configGroups.forEach((g) =>
                    loadVersionsForConfig(g.config_id),
                  );
                }
              }}
              onChange={(e) => handleCompareSelect(e.target.value)}
            />
          </div>

          {compareWith && (
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onLoadVersion(compareWith)}
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                {compareLabelLeft}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onLoadVersion(selectedCommit)}
              >
                {compareLabelRight}
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {compareWith && (
          <div className="mt-3 inline-flex items-center gap-2 text-xs text-text-secondary">
            {sameConfig ? (
              <VersionPill version={compareWith.version} />
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border bg-bg-secondary text-text-secondary border-border">
                <span className="font-medium text-text-primary truncate max-w-40">
                  {compareWith.name}
                </span>
                <VersionPill version={compareWith.version} size="sm" />
              </span>
            )}
            <ChevronRightIcon className="w-3.5 h-3.5" />
            {sameConfig ? (
              <VersionPill version={selectedCommit.version} tone="accent" />
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border bg-accent-primary/10 text-accent-primary border-accent-primary/30">
                <span className="font-medium truncate max-w-40">
                  {selectedCommit.name}
                </span>
                <VersionPill
                  version={selectedCommit.version}
                  tone="accent"
                  size="sm"
                />
              </span>
            )}
          </div>
        )}
      </div>

      {compareWith ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex border-r border-border min-w-0">
            <PromptDiffPane
              selectedCommit={selectedCommit}
              compareWith={compareWith}
            />
          </div>
          <div className="flex-1 flex min-w-0">
            <ConfigDiffPane
              selectedCommit={selectedCommit}
              compareWith={compareWith}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden border-r border-border min-w-0">
            <div className="px-4 py-3 border-b border-border bg-bg-primary shrink-0">
              <h3 className="text-sm font-semibold text-text-primary">
                Prompt
              </h3>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono text-text-primary">
                {selectedCommit.promptContent}
              </pre>
            </div>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <div className="px-4 py-3 border-b border-border bg-bg-primary shrink-0">
              <h3 className="text-sm font-semibold text-text-primary">
                Configuration
              </h3>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <div className="space-y-3">
                <ReadOnlyField
                  label="Provider"
                  value={selectedCommit.provider}
                />
                <ReadOnlyField label="Model" value={selectedCommit.modelName} />
                {selectedCommit.temperature != null && (
                  <ReadOnlyField
                    label="Temperature"
                    value={String(selectedCommit.temperature)}
                  />
                )}
                {selectedCommit.tools && selectedCommit.tools.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold mb-1.5 text-text-secondary">
                      Tools
                    </div>
                    <div className="space-y-2">
                      {selectedCommit.tools.map((tool, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-md bg-bg-secondary border border-border"
                        >
                          <div className="text-xs font-semibold text-text-primary">
                            {tool.type}
                          </div>
                          {tool.knowledge_base_ids && (
                            <div className="text-xs mt-1 text-text-secondary truncate">
                              Knowledge Base: {tool.knowledge_base_ids[0]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold mb-1 text-text-secondary">
        {label}
      </div>
      <div className="text-sm text-text-primary">{value}</div>
    </div>
  );
}
