/**
 * ScoreDisplay - Shows summary scores from evaluation results
 * Displays average scores from summary_scores array
 */

"use client";

import { ScoreObject, hasSummaryScores } from "./types";

interface ScoreDisplayProps {
  score: ScoreObject | null;
  errorMessage?: string | null;
}

export default function ScoreDisplay({
  score,
  errorMessage,
}: ScoreDisplayProps) {
  // No score available
  if (!score) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-[hsl(0,0%,95%)] border border-[hsl(0,0%,85%)] text-[hsl(330,3%,49%)]">
        <span className="font-medium">Score:</span>
        <span>N/A</span>
        {errorMessage && (
          <span className="text-xs text-[hsl(8,86%,40%)]">(Error)</span>
        )}
      </div>
    );
  }

  // Handle score format with summary_scores (V1, V2, or Basic)
  if (hasSummaryScores(score)) {
    const summaryScores = score.summary_scores || [];

    if (summaryScores.length === 0) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-[hsl(0,0%,95%)] border border-[hsl(0,0%,85%)] text-[hsl(330,3%,49%)]">
          <span className="font-medium">Score:</span>
          <span>No scores available</span>
        </div>
      );
    }

    // Separate numeric and categorical scores
    const numericScores = summaryScores.filter(
      (s) => s.data_type === "NUMERIC",
    );
    const categoricalScores = summaryScores.filter(
      (s) => s.data_type === "CATEGORICAL",
    );

    // If no numeric scores at all, show a message
    if (numericScores.length === 0 && categoricalScores.length === 0) {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-[hsl(0,0%,95%)] border border-[hsl(0,0%,85%)] text-[hsl(330,3%,49%)]">
          <span className="font-medium">Score:</span>
          <span>No numeric scores available</span>
        </div>
      );
    }

    // Display each numeric score in its own subtle chip
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {numericScores.map((summary, idx) => {
          const value =
            summary.avg !== undefined ? summary.avg.toFixed(2) : "N/A";
          const std = summary.std !== undefined ? summary.std.toFixed(2) : null;

          return (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs bg-[#f5f5f5] text-[#737373]"
            >
              <span>{summary.name}:</span>
              <span className="font-semibold text-[#171717]">{value}</span>
              {std !== null && <span>±{std}</span>}
            </span>
          );
        })}
      </div>
    );
  }

  // Fallback for unsupported format
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-[hsl(0,0%,95%)] border border-[hsl(0,0%,85%)] text-[hsl(330,3%,49%)]">
      <span className="font-medium">Score:</span>
      <span>Unsupported format</span>
    </div>
  );
}
