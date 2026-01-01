/**
 * ModelComparisonCard Component
 *
 * Minimal card design showing just the essentials:
 * - Model name + WER score
 * - Expandable for full details
 */

import React, { useState, useEffect } from 'react';
import { colors } from '@/app/lib/colors';

interface WerMetrics {
  wer: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  semantic_errors: number;
  reference_word_count: number;
  hypothesis_word_count: number;
}

interface ModelComparisonCardProps {
  modelId: string;
  modelName: string;
  provider: string;
  transcript: string;
  status: 'success' | 'error' | 'pending';
  error?: string;
  strictMetrics?: WerMetrics;
  lenientMetrics?: WerMetrics;
  isBest?: boolean;
  isWorst?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

// Get WER color based on value
const getWerColor = (wer: number) => {
  if (wer < 5) return colors.status.success;
  if (wer < 10) return '#ca8a04'; // yellow-600
  if (wer < 20) return colors.status.warning;
  return colors.status.error;
};

// Get WER label
const getWerLabel = (wer: number) => {
  if (wer < 5) return 'Excellent';
  if (wer < 10) return 'Good';
  if (wer < 20) return 'Fair';
  return 'Poor';
};

export default function ModelComparisonCard({
  modelId,
  modelName,
  provider,
  transcript,
  status,
  error,
  strictMetrics,
  lenientMetrics,
  isBest = false,
  isWorst = false,
  isSelected = false,
  onClick,
  compact = false,
}: ModelComparisonCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const werPercent = strictMetrics ? strictMetrics.wer * 100 : null;
  const lenientWerPercent = lenientMetrics ? lenientMetrics.wer * 100 : null;

  // Reset expanded state when status changes to pending
  // Also reset when modelId changes (new model added)
  useEffect(() => {
    if (status === 'pending') {
      setIsExpanded(false);
    }
  }, [status, modelId]);

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Check if we have enough data to show expanded content
  const hasExpandedContent = status === 'success' && (transcript || strictMetrics);

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: isBest
          ? colors.status.success
          : isWorst
          ? colors.status.error
          : colors.border,
        backgroundColor: isBest
          ? 'rgba(22, 163, 74, 0.02)'
          : colors.bg.primary,
        borderWidth: isBest ? '2px' : '1px',
      }}
    >
      {/* Minimal Header - Always Visible */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {/* Model Name */}
            <span
              className="text-sm font-medium truncate"
              style={{ color: colors.text.primary }}
            >
              {modelName}
            </span>

            {/* Best Badge - small */}
            {isBest && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
              >
                Best
              </span>
            )}
          </div>

          {/* Right side: Status/WER + Expand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {status === 'pending' && (
              <div
                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: colors.text.secondary, borderTopColor: 'transparent' }}
              />
            )}

            {status === 'error' && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                Error
              </span>
            )}

            {status === 'success' && werPercent !== null && (
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: getWerColor(werPercent) }}
              >
                {werPercent.toFixed(1)}%
              </span>
            )}

            {/* Expand Button - only show if there's content to expand */}
            {hasExpandedContent && (
              <button
                onClick={handleExpandToggle}
                className="p-1 rounded hover:bg-gray-100"
                style={{ color: colors.text.secondary }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {status === 'error' && (
          <div className="text-xs mt-2 truncate" style={{ color: colors.status.error }}>
            {error || 'Transcription failed'}
          </div>
        )}
      </div>

      {/* Expanded Details - only render if expanded AND has content */}
      {isExpanded && hasExpandedContent && (
        <div
          className="border-t px-3 pb-3 pt-2 space-y-3"
          style={{ borderColor: colors.border, backgroundColor: colors.bg.secondary }}
        >
          {/* WER Comparison */}
          {werPercent !== null && lenientWerPercent !== null ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                <div className="text-xs mb-0.5" style={{ color: colors.text.secondary }}>
                  Strict WER
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold" style={{ color: getWerColor(werPercent) }}>
                    {werPercent.toFixed(1)}%
                  </span>
                  <span className="text-xs" style={{ color: getWerColor(werPercent) }}>
                    {getWerLabel(werPercent)}
                  </span>
                </div>
              </div>
              <div className="p-2 rounded" style={{ backgroundColor: colors.bg.primary }}>
                <div className="text-xs mb-0.5" style={{ color: colors.text.secondary }}>
                  Lenient WER
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold" style={{ color: getWerColor(lenientWerPercent) }}>
                    {lenientWerPercent.toFixed(1)}%
                  </span>
                  <span className="text-xs" style={{ color: getWerColor(lenientWerPercent) }}>
                    {getWerLabel(lenientWerPercent)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            // Show loading state for WER if not available yet
            <div className="flex items-center justify-center py-2">
              <div
                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2"
                style={{ borderColor: colors.text.secondary, borderTopColor: 'transparent' }}
              />
              <span className="text-xs" style={{ color: colors.text.secondary }}>
                Computing WER...
              </span>
            </div>
          )}

          {/* Error Breakdown */}
          {strictMetrics && (
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-1.5 rounded" style={{ backgroundColor: colors.bg.primary }}>
                <div className="text-xs" style={{ color: colors.text.secondary }}>Sub</div>
                <div className="text-sm font-medium" style={{ color: colors.status.warning }}>
                  {strictMetrics.substitutions}
                </div>
              </div>
              <div className="p-1.5 rounded" style={{ backgroundColor: colors.bg.primary }}>
                <div className="text-xs" style={{ color: colors.text.secondary }}>Del</div>
                <div className="text-sm font-medium" style={{ color: colors.status.error }}>
                  {strictMetrics.deletions}
                </div>
              </div>
              <div className="p-1.5 rounded" style={{ backgroundColor: colors.bg.primary }}>
                <div className="text-xs" style={{ color: colors.text.secondary }}>Ins</div>
                <div className="text-sm font-medium" style={{ color: colors.accent.primary }}>
                  {strictMetrics.insertions}
                </div>
              </div>
              <div className="p-1.5 rounded" style={{ backgroundColor: colors.bg.primary }}>
                <div className="text-xs" style={{ color: colors.text.secondary }}>Words</div>
                <div className="text-sm font-medium" style={{ color: colors.text.primary }}>
                  {strictMetrics.reference_word_count}
                </div>
              </div>
            </div>
          )}

          {/* Transcription */}
          {transcript && (
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: colors.text.secondary }}>
                Transcription
              </div>
              <div
                className="text-xs p-2 rounded leading-relaxed max-h-24 overflow-auto"
                style={{ backgroundColor: colors.bg.primary, color: colors.text.primary }}
              >
                {transcript}
              </div>
            </div>
          )}

          {/* View Diff Button */}
          {onClick && (
            <button
              onClick={onClick}
              className="w-full py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1"
              style={{
                backgroundColor: colors.bg.primary,
                color: colors.text.secondary,
                border: `1px solid ${colors.border}`,
              }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              View Diff Comparison
            </button>
          )}
        </div>
      )}
    </div>
  );
}
