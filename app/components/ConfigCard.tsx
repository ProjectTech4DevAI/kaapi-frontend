/**
 * ConfigCard - Reusable card component for displaying config information
 * Used in Config Library - simplified to show config overview with navigation to Prompt Editor
 * Version management happens in Prompt Editor, not here
 */

"use client"
import React from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@/app/lib/colors';
import { ConfigGroup, SavedConfig, formatRelativeTime } from '@/app/lib/useConfigs';

interface ConfigCardProps {
  configGroup: ConfigGroup;
  evaluationCount?: number;
  onUseInEvaluation?: (config: SavedConfig) => void;
}

export default function ConfigCard({
  configGroup,
  evaluationCount = 0,
  onUseInEvaluation
}: ConfigCardProps) {
  const router = useRouter();
  const { latestVersion, totalVersions } = configGroup;

  const handleEdit = () => {
    router.push(`/configurations/prompt-editor?config=${latestVersion.config_id}&version=${latestVersion.version}`);
  };

  const handleUseInEvaluation = () => {
    if (onUseInEvaluation) {
      onUseInEvaluation(latestVersion);
    } else {
      router.push(`/evaluations?config=${latestVersion.config_id}&version=${latestVersion.version}`);
    }
  };

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{
        backgroundColor: colors.bg.primary,
        borderColor: colors.border,
      }}
    >
      {/* Main Card Content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3
              className="text-base font-semibold truncate"
              style={{ color: colors.text.primary }}
            >
              {configGroup.name}
            </h3>
            {configGroup.description && (
              <p
                className="text-sm mt-0.5 truncate"
                style={{ color: colors.text.secondary }}
              >
                {configGroup.description}
              </p>
            )}
          </div>
          <div
            className="px-2 py-0.5 rounded text-xs font-medium ml-3 flex-shrink-0"
            style={{
              backgroundColor: colors.bg.secondary,
              color: colors.text.secondary,
              border: `1px solid ${colors.border}`
            }}
          >
            v{latestVersion.version}
          </div>
        </div>

        {/* Config Details */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div
            className="px-2.5 py-1 rounded-md text-xs"
            style={{ backgroundColor: colors.bg.secondary }}
          >
            <span style={{ color: colors.text.secondary }}>Provider: </span>
            <span style={{ color: colors.text.primary, fontWeight: 500 }}>{latestVersion.provider}</span>
          </div>
          <div
            className="px-2.5 py-1 rounded-md text-xs"
            style={{ backgroundColor: colors.bg.secondary }}
          >
            <span style={{ color: colors.text.secondary }}>Model: </span>
            <span style={{ color: colors.text.primary, fontWeight: 500 }}>{latestVersion.modelName}</span>
          </div>
          <div
            className="px-2.5 py-1 rounded-md text-xs"
            style={{ backgroundColor: colors.bg.secondary }}
          >
            <span style={{ color: colors.text.secondary }}>Temp: </span>
            <span style={{ color: colors.text.primary, fontWeight: 500 }}>{latestVersion.temperature.toFixed(2)}</span>
          </div>
        </div>

        {/* Prompt Preview */}
        <div
          className="rounded-md p-3 mb-4 text-xs font-mono overflow-hidden"
          style={{
            backgroundColor: colors.bg.secondary,
            maxHeight: '60px',
          }}
        >
          <p
            className="line-clamp-2"
            style={{ color: colors.text.secondary }}
          >
            {latestVersion.instructions || 'No instructions set'}
          </p>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs mb-4" style={{ color: colors.text.secondary }}>
          <span>Updated {formatRelativeTime(latestVersion.timestamp)}</span>
          <span>|</span>
          <span>{totalVersions} version{totalVersions !== 1 ? 's' : ''}</span>
          {evaluationCount > 0 && (
            <>
              <span>|</span>
              <span>{evaluationCount} evaluation{evaluationCount !== 1 ? 's' : ''}</span>
            </>
          )}
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
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bg.secondary}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg.primary}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Open in Editor
          </button>
          <button
            onClick={handleUseInEvaluation}
            className="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              backgroundColor: colors.accent.primary,
              color: colors.bg.primary,
              border: 'none',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.accent.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent.primary}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Run Evaluation
          </button>
        </div>
      </div>
    </div>
  );
}
