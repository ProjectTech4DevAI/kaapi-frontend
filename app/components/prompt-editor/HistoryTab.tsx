import React from 'react';
import { colors } from '@/app/lib/colors';
import { Config } from '@/app/configurations/prompt-editor/types';

interface HistoryTabProps {
  configs: Config[];
  selectedConfigId: string;
  onLoadConfig: (configId: string) => void;
}

export default function HistoryTab({
  configs,
  selectedConfigId,
  onLoadConfig,
}: HistoryTabProps) {
  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Sort configs by timestamp (most recent first)
  const sortedConfigs = [...configs].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {sortedConfigs.length === 0 ? (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
            color: colors.text.secondary,
            fontSize: '13px',
          }}
        >
          No configurations saved yet.
        </div>
      ) : (
        sortedConfigs.map((config) => (
          <div
            key={config.id}
            onClick={() => onLoadConfig(config.id)}
            style={{
              padding: '12px',
              border: `2px solid ${
                selectedConfigId === config.id ? colors.accent.primary : colors.border
              }`,
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor:
                selectedConfigId === config.id ? colors.bg.secondary : colors.bg.primary,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (selectedConfigId !== config.id) {
                e.currentTarget.style.borderColor = colors.text.secondary;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedConfigId !== config.id) {
                e.currentTarget.style.borderColor = colors.border;
              }
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: colors.text.primary,
                }}
              >
                {config.name} (v{config.version})
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: colors.text.secondary,
                }}
              >
                {formatTimestamp(config.timestamp)}
              </span>
            </div>
            <div
              style={{
                fontSize: '12px',
                color: colors.text.secondary,
                marginBottom: '6px',
              }}
            >
              {config.config_blob.completion.params.model} • temp:{' '}
              {config.config_blob.completion.params.temperature}
            </div>
            {config.commitMessage && (
              <div
                style={{
                  fontSize: '12px',
                  color: colors.text.secondary,
                  fontStyle: 'italic',
                }}
              >
                {config.commitMessage}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
