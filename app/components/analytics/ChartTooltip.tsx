"use client";

import { AnalyticsTooltipRenderProps } from "@/app/lib/types/analytics";
import { formatMetricValue } from "@/app/lib/utils/analytics/formatValue";

export default function ChartTooltip({
  active,
  payload,
  label,
  metric,
}: AnalyticsTooltipRenderProps) {
  if (!active || !payload?.length) return null;
  const totalEntry = payload.find((e) => e.dataKey === "__total");
  const seriesEntries = payload.filter(
    (e) => e.dataKey !== "__total" && e.dataKey !== "__range",
  );
  return (
    <div className="rounded-lg border border-border bg-bg-primary px-3 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.08)] min-w-[180px]">
      <p className="text-xs font-medium text-text-secondary mb-1.5">{label}</p>
      {totalEntry && (
        <div className="flex items-center justify-between gap-3 pb-1.5 mb-1.5 border-b border-border text-[13px]">
          <span className="font-medium text-text-primary">Total</span>
          <span className="font-semibold text-text-primary tabular-nums">
            {formatMetricValue(Number(totalEntry.value ?? 0), metric)}
          </span>
        </div>
      )}
      {seriesEntries.length > 0 && (
        <div className="space-y-1">
          {seriesEntries.map((entry) => (
            <div
              key={String(entry.dataKey)}
              className="flex items-center gap-2 text-[13px]"
            >
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: entry.color }}
              />
              <span className="text-text-secondary flex-1 truncate">
                {String(entry.dataKey)}
              </span>
              <span className="text-text-primary tabular-nums">
                {formatMetricValue(Number(entry.value ?? 0), metric)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
