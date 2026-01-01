import React from 'react';
import { colors } from '@/app/lib/colors';
import { ConfigBlob } from '@/app/configurations/prompt-editor/types';
import { SavedConfig } from '@/app/lib/useConfigs';

interface ConfigDiffPaneProps {
  selectedCommit: SavedConfig;
  compareWith: SavedConfig;
}

interface ConfigDiff {
  field: string;
  oldValue: any;
  newValue: any;
  changed: boolean;
}

export default function ConfigDiffPane({
  selectedCommit,
  compareWith,
}: ConfigDiffPaneProps) {
  // Build config diffs
  const configDiffs: ConfigDiff[] = [];

  // Compare provider
  if (compareWith.provider !== selectedCommit.provider) {
    configDiffs.push({
      field: 'Provider',
      oldValue: compareWith.provider,
      newValue: selectedCommit.provider,
      changed: true,
    });
  }

  // Compare model
  if (compareWith.modelName !== selectedCommit.modelName) {
    configDiffs.push({
      field: 'Model',
      oldValue: compareWith.modelName,
      newValue: selectedCommit.modelName,
      changed: true,
    });
  }

  // Compare temperature
  if (compareWith.temperature !== selectedCommit.temperature) {
    configDiffs.push({
      field: 'Temperature',
      oldValue: compareWith.temperature,
      newValue: selectedCommit.temperature,
      changed: true,
    });
  }

  // Compare tools
  const oldTools = compareWith.tools || [];
  const newTools = selectedCommit.tools || [];
  if (JSON.stringify(oldTools) !== JSON.stringify(newTools)) {
    configDiffs.push({
      field: 'Tools',
      oldValue: oldTools,
      newValue: newTools,
      changed: true,
    });
  }

  const hasChanges = configDiffs.length > 0;

  const renderValue = (value: any): string => {
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      return value.map((tool, idx) => {
        if (tool.type === 'file_search') {
          return `File Search (${tool.vector_store_ids?.[0] || 'no store'})`;
        }
        return JSON.stringify(tool);
      }).join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="px-4 py-3 border-b"
        style={{
          backgroundColor: colors.bg.primary,
          borderColor: colors.border,
        }}
      >
        <h3 className="text-sm font-semibold" style={{ color: colors.text.primary }}>
          Configuration Changes
        </h3>
        <div className="text-xs mt-1" style={{ color: colors.text.secondary }}>
          Comparing v{compareWith.version} → v{selectedCommit.version}
        </div>
      </div>
      <div
        className="flex-1 p-4 overflow-auto"
        style={{
          backgroundColor: colors.bg.secondary,
        }}
      >
        {!hasChanges ? (
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center"
            style={{ borderColor: colors.border, backgroundColor: colors.bg.primary }}
          >
            <p className="text-sm" style={{ color: colors.text.secondary }}>
              No configuration changes
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {configDiffs.map((diff, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-3"
                style={{
                  backgroundColor: colors.bg.primary,
                  borderColor: colors.border,
                }}
              >
                <div
                  className="text-xs font-semibold mb-2"
                  style={{ color: colors.text.secondary }}
                >
                  {diff.field}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div
                      className="text-xs mb-1"
                      style={{ color: colors.text.secondary }}
                    >
                      Before (v{compareWith.version})
                    </div>
                    <div
                      className="p-2 rounded text-sm font-mono"
                      style={{
                        backgroundColor: '#fee2e2',
                        color: colors.status.error,
                      }}
                    >
                      {renderValue(diff.oldValue)}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xs mb-1"
                      style={{ color: colors.text.secondary }}
                    >
                      After (v{selectedCommit.version})
                    </div>
                    <div
                      className="p-2 rounded text-sm font-mono"
                      style={{
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                      }}
                    >
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
