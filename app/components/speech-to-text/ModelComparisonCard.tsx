"use client";

import React, { useState, useEffect } from "react";
import { colors } from "@/app/lib/colors";
import { ChevronDownIcon, ChevronRightIcon } from "@/app/components/icons";

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
  status: "success" | "error" | "pending";
  error?: string;
  strictMetrics?: WerMetrics;
  lenientMetrics?: WerMetrics;
  isBest?: boolean;
  isWorst?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

const getWerColor = (wer: number) => {
  if (wer < 5) return colors.status.success;
  if (wer < 10) return "#ca8a04";
  if (wer < 20) return colors.status.warning;
  return colors.status.error;
};

const getWerLabel = (wer: number) => {
  if (wer < 5) return "Excellent";
  if (wer < 10) return "Good";
  if (wer < 20) return "Fair";
  return "Poor";
};

export default function ModelComparisonCard({
  modelId,
  modelName,
  transcript,
  status,
  error,
  strictMetrics,
  lenientMetrics,
  isBest = false,
  isWorst = false,
  onClick,
}: ModelComparisonCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const detailsId = `model-card-details-${modelId}`;
  const werPercent = strictMetrics ? strictMetrics.wer * 100 : null;
  const lenientWerPercent = lenientMetrics ? lenientMetrics.wer * 100 : null;

  useEffect(() => {
    setIsExpanded(false);
  }, [modelId]);

  useEffect(() => {
    if (status === "pending") {
      setIsExpanded(false);
    }
  }, [status]);

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  const hasExpandedContent =
    status === "success" && (transcript || strictMetrics);

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: isBest
          ? colors.status.success
          : isWorst
            ? colors.status.error
            : colors.border,
        backgroundColor: isBest ? "rgba(22, 163, 74, 0.02)" : colors.bg.primary,
        borderWidth: isBest ? "2px" : "1px",
      }}
    >
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-sm font-medium truncate"
              style={{ color: colors.text.primary }}
            >
              {modelName}
            </span>

            {isBest && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 bg-[#dcfce7] text-[#15803d]">
                Best
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {status === "pending" && (
              <div
                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                style={{
                  borderColor: colors.text.secondary,
                  borderTopColor: "transparent",
                }}
              />
            )}

            {status === "error" && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-[#fee2e2] text-[#dc2626]">
                Error
              </span>
            )}

            {status === "success" && werPercent !== null && (
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: getWerColor(werPercent) }}
              >
                {werPercent.toFixed(1)}%
              </span>
            )}

            {hasExpandedContent && (
              <button
                type="button"
                onClick={handleExpandToggle}
                className="p-1 rounded hover:bg-gray-100"
                style={{ color: colors.text.secondary }}
                aria-label={isExpanded ? "Collapse details" : "Expand details"}
                aria-expanded={isExpanded}
                aria-controls={detailsId}
              >
                <ChevronDownIcon
                  className="w-4 h-4"
                  style={{
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </button>
            )}
          </div>
        </div>

        {status === "error" && (
          <div
            className="text-xs mt-2 truncate"
            style={{ color: colors.status.error }}
          >
            {error || "Transcription failed"}
          </div>
        )}
      </div>

      {isExpanded && hasExpandedContent && (
        <div
          id={detailsId}
          className="border-t px-3 pb-3 pt-2 space-y-3"
          style={{
            borderColor: colors.border,
            backgroundColor: colors.bg.secondary,
          }}
        >
          {werPercent !== null && lenientWerPercent !== null ? (
            <div className="grid grid-cols-2 gap-3">
              <div
                className="p-2 rounded"
                style={{ backgroundColor: colors.bg.primary }}
              >
                <div
                  className="text-xs mb-0.5"
                  style={{ color: colors.text.secondary }}
                >
                  Strict WER
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-lg font-bold"
                    style={{ color: getWerColor(werPercent) }}
                  >
                    {werPercent.toFixed(1)}%
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: getWerColor(werPercent) }}
                  >
                    {getWerLabel(werPercent)}
                  </span>
                </div>
              </div>
              <div
                className="p-2 rounded"
                style={{ backgroundColor: colors.bg.primary }}
              >
                <div
                  className="text-xs mb-0.5"
                  style={{ color: colors.text.secondary }}
                >
                  Lenient WER
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-lg font-bold"
                    style={{ color: getWerColor(lenientWerPercent) }}
                  >
                    {lenientWerPercent.toFixed(1)}%
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: getWerColor(lenientWerPercent) }}
                  >
                    {getWerLabel(lenientWerPercent)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-2">
              <div
                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-2"
                style={{
                  borderColor: colors.text.secondary,
                  borderTopColor: "transparent",
                }}
              />
              <span
                className="text-xs"
                style={{ color: colors.text.secondary }}
              >
                Computing WER...
              </span>
            </div>
          )}

          {strictMetrics && (
            <div className="grid grid-cols-4 gap-2 text-center">
              <div
                className="p-1.5 rounded"
                style={{ backgroundColor: colors.bg.primary }}
              >
                <div
                  className="text-xs"
                  style={{ color: colors.text.secondary }}
                >
                  Sub
                </div>
                <div
                  className="text-sm font-medium"
                  style={{ color: colors.status.warning }}
                >
                  {strictMetrics.substitutions}
                </div>
              </div>
              <div
                className="p-1.5 rounded"
                style={{ backgroundColor: colors.bg.primary }}
              >
                <div
                  className="text-xs"
                  style={{ color: colors.text.secondary }}
                >
                  Del
                </div>
                <div
                  className="text-sm font-medium"
                  style={{ color: colors.status.error }}
                >
                  {strictMetrics.deletions}
                </div>
              </div>
              <div
                className="p-1.5 rounded"
                style={{ backgroundColor: colors.bg.primary }}
              >
                <div
                  className="text-xs"
                  style={{ color: colors.text.secondary }}
                >
                  Ins
                </div>
                <div
                  className="text-sm font-medium"
                  style={{ color: colors.accent.primary }}
                >
                  {strictMetrics.insertions}
                </div>
              </div>
              <div
                className="p-1.5 rounded"
                style={{ backgroundColor: colors.bg.primary }}
              >
                <div
                  className="text-xs"
                  style={{ color: colors.text.secondary }}
                >
                  Words
                </div>
                <div
                  className="text-sm font-medium"
                  style={{ color: colors.text.primary }}
                >
                  {strictMetrics.reference_word_count}
                </div>
              </div>
            </div>
          )}

          {transcript && (
            <div>
              <div
                className="text-xs font-medium mb-1"
                style={{ color: colors.text.secondary }}
              >
                Transcription
              </div>
              <div
                className="text-xs p-2 rounded leading-relaxed max-h-24 overflow-auto"
                style={{
                  backgroundColor: colors.bg.primary,
                  color: colors.text.primary,
                }}
              >
                {transcript}
              </div>
            </div>
          )}

          {onClick && (
            <button
              type="button"
              onClick={onClick}
              className="w-full py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1"
              style={{
                backgroundColor: colors.bg.primary,
                color: colors.text.secondary,
                border: `1px solid ${colors.border}`,
              }}
            >
              <ChevronRightIcon className="w-3 h-3" />
              View Diff Comparison
            </button>
          )}
        </div>
      )}
    </div>
  );
}
