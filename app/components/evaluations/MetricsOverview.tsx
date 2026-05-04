"use client";

import type { EvalJob, SummaryScore } from "@/app/lib/types/evaluation";
import { Button } from "@/app/components";
import { RefreshIcon, WarningTriangleIcon } from "@/app/components/icons";

interface MetricsOverviewProps {
  job: EvalJob;
  summaryScores: SummaryScore[];
  isJobInProgress: boolean;
  isResyncing: boolean;
  onResync: () => void;
}

export default function MetricsOverview({
  job,
  summaryScores,
  isJobInProgress,
  isResyncing,
  onResync,
}: MetricsOverviewProps) {
  const showPartialNotice =
    summaryScores.some(
      (s) => job.total_items && s.total_pairs < job.total_items,
    ) && isJobInProgress;

  return (
    <div>
      {showPartialNotice && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3 text-xs bg-amber-500/10 border border-amber-500/30 text-status-warning">
          <WarningTriangleIcon className="shrink-0" />
          Some traces are still being scored. Scores shown are partial and may
          change - click <strong className="font-semibold">Resync</strong> to
          get the latest.
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-secondary">
          Metrics Overview
        </h3>
        <Button
          variant="primary"
          size="sm"
          onClick={onResync}
          disabled={isResyncing}
        >
          <RefreshIcon className={isResyncing ? "animate-spin" : ""} />
          {isResyncing ? "Resyncing..." : "Resync"}
        </Button>
      </div>
      {summaryScores.length > 0 ? (
        <div className="flex gap-4 flex-wrap">
          {summaryScores
            .filter((s) => s.data_type === "NUMERIC")
            .map((summary) => (
              <div
                key={summary.name}
                className="rounded-lg px-6 py-5 text-center flex-1 min-w-[180px] relative bg-bg-primary shadow-sm"
              >
                <div className="text-xs font-medium mb-2 text-text-secondary">
                  {summary.name}
                </div>
                <div className="text-2xl font-bold text-text-primary">
                  {summary.avg !== undefined ? summary.avg.toFixed(3) : "N/A"}
                </div>
                <div className="text-xs mt-1 text-text-secondary">
                  {summary.std !== undefined && `±${summary.std.toFixed(3)} · `}
                  <span>
                    {summary.total_pairs}
                    {job.total_items &&
                      summary.total_pairs < job.total_items &&
                      `/${job.total_items}`}{" "}
                    pairs
                  </span>
                </div>
              </div>
            ))}
          {summaryScores
            .filter((s) => s.data_type === "CATEGORICAL")
            .map((summary) => (
              <div
                key={summary.name}
                className="rounded-lg px-6 py-5 flex-1 min-w-[180px] relative bg-bg-primary shadow-sm"
              >
                <div className="text-xs font-medium mb-3 text-center text-text-secondary">
                  {summary.name}
                </div>
                <div className="space-y-1">
                  {summary.distribution &&
                    Object.entries(summary.distribution).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between items-center px-3 py-1 rounded bg-bg-secondary"
                      >
                        <span className="text-xs font-medium text-text-primary">
                          {key}
                        </span>
                        <span className="text-xs font-bold text-text-primary">
                          {value}
                        </span>
                      </div>
                    ))}
                </div>
                <div className="text-xs mt-2 text-center text-text-secondary">
                  <span>
                    {summary.total_pairs}
                    {job.total_items &&
                      summary.total_pairs < job.total_items &&
                      `/${job.total_items}`}{" "}
                    pairs
                  </span>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="rounded-lg p-8 text-center bg-bg-primary shadow-sm">
          <p className="text-sm text-text-secondary">
            No summary scores available
          </p>
        </div>
      )}
    </div>
  );
}
