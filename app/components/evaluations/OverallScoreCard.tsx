"use client";

import type { OverallScore } from "@/app/lib/types/evaluation";
import { getVerdictColor } from "@/app/lib/utils/evaluation";

interface OverallScoreCardProps {
  overall: OverallScore;
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const color = getVerdictColor(verdict);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border ${color.bg} ${color.border} ${color.text}`}
    >
      {verdict}
    </span>
  );
}

export default function OverallScoreCard({ overall }: OverallScoreCardProps) {
  return (
    <div className="rounded-lg bg-bg-primary shadow-sm p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-secondary">
            Overall Score
          </h3>
          <div className="text-3xl font-bold text-text-primary mt-1 tabular-nums">
            {overall.overall_score.toFixed(3)}
          </div>
        </div>
        <VerdictBadge verdict={overall.verdict} />
      </div>

      {overall.breakdown.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {overall.breakdown.map((item) => (
            <div
              key={item.name}
              className="rounded-lg px-4 py-3 bg-bg-secondary"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-medium text-text-primary truncate">
                  {item.name}
                </span>
                <VerdictBadge verdict={item.verdict} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-text-primary tabular-nums">
                  {item.score.toFixed(3)}
                </span>
                <span className="text-xs text-text-secondary">
                  weight {item.weight.toFixed(2)}
                </span>
              </div>
              {typeof item.delta === "number" && (
                <div
                  className={`text-xs mt-1 tabular-nums ${
                    item.delta >= 0
                      ? "text-status-success-text"
                      : "text-status-error-text"
                  }`}
                >
                  {item.delta >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(item.delta).toFixed(3)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
