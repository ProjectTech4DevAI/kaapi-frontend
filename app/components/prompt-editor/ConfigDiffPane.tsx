import { VersionPill } from "@/app/components";
import { SavedConfig } from "@/app/lib/types/configs";

interface ConfigDiffPaneProps {
  selectedCommit: SavedConfig;
  compareWith: SavedConfig;
}

interface ConfigDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changed: boolean;
}

export default function ConfigDiffPane({
  selectedCommit,
  compareWith,
}: ConfigDiffPaneProps) {
  const configDiffs: ConfigDiff[] = [];

  if (compareWith.provider !== selectedCommit.provider) {
    configDiffs.push({
      field: "Provider",
      oldValue: compareWith.provider,
      newValue: selectedCommit.provider,
      changed: true,
    });
  }

  if (compareWith.modelName !== selectedCommit.modelName) {
    configDiffs.push({
      field: "Model",
      oldValue: compareWith.modelName,
      newValue: selectedCommit.modelName,
      changed: true,
    });
  }

  if (compareWith.temperature !== selectedCommit.temperature) {
    configDiffs.push({
      field: "Temperature",
      oldValue: compareWith.temperature,
      newValue: selectedCommit.temperature,
      changed: true,
    });
  }

  const oldTools = compareWith.tools || [];
  const newTools = selectedCommit.tools || [];
  if (JSON.stringify(oldTools) !== JSON.stringify(newTools)) {
    configDiffs.push({
      field: "Tools",
      oldValue: oldTools,
      newValue: newTools,
      changed: true,
    });
  }

  const hasChanges = configDiffs.length > 0;

  const renderValue = (value: unknown): string => {
    if (Array.isArray(value)) {
      if (value.length === 0) return "[]";
      return value
        .map((tool) => {
          if (tool && typeof tool === "object" && tool.type === "file_search") {
            return `File Search (${tool.knowledge_base_ids?.[0] || "no store"})`;
          }
          return JSON.stringify(tool);
        })
        .join(", ");
    }
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-bg-primary">
        <h3 className="text-sm font-semibold text-text-primary">
          Configuration Changes
        </h3>
        <div className="text-xs mt-1 text-text-secondary inline-flex items-center gap-1.5">
          Comparing <VersionPill version={compareWith.version} size="sm" /> →
          <VersionPill
            version={selectedCommit.version}
            size="sm"
            tone="accent"
          />
        </div>
      </div>
      <div className="flex-1 p-4 overflow-auto bg-bg-secondary">
        {!hasChanges ? (
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-bg-primary">
            <p className="text-sm text-text-secondary">
              No configuration changes
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {configDiffs.map((diff, idx) => (
              <div
                key={idx}
                className="rounded-lg p-3 bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <div className="text-xs font-semibold mb-2 text-text-secondary">
                  {diff.field}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs mb-1 text-text-secondary">
                      Before (v{compareWith.version})
                    </div>
                    <div className="p-2 rounded text-sm font-mono break-all bg-status-error-bg text-status-error-text">
                      {renderValue(diff.oldValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs mb-1 text-text-secondary">
                      After (v{selectedCommit.version})
                    </div>
                    <div className="p-2 rounded text-sm font-mono break-all bg-status-success-bg text-status-success-text">
                      {renderValue(diff.newValue)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
