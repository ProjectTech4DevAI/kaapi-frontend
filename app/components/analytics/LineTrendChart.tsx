"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader } from "@/app/components/ui";
import {
  AnalyticsChartData,
  AnalyticsChartRow,
} from "@/app/lib/types/analytics";
import { formatCompactMetric } from "@/app/lib/utils/analytics/formatValue";
import ChartTooltip from "./ChartTooltip";

interface LineTrendChartProps {
  rows: AnalyticsChartRow[];
  activeData: AnalyticsChartData | null;
  hasSeries: boolean;
  hasInitialData: boolean;
  isLoading: boolean;
  error: string | null;
  seriesColors: string[];
}

export default function LineTrendChart({
  rows,
  activeData,
  hasSeries,
  hasInitialData,
  isLoading,
  error,
  seriesColors,
}: LineTrendChartProps) {
  return (
    <>
      <div className="h-[460px]">
        {isLoading && !hasInitialData ? (
          <div className="h-full flex items-center justify-center">
            <Loader size="md" message="Loading chart…" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center px-6 text-center">
            <p className="text-sm text-status-error-text">{error}</p>
          </div>
        ) : !hasSeries || !activeData ? (
          <div className="h-full flex items-center justify-center px-6 text-center">
            <p className="text-sm text-text-secondary">
              No data for the selected filters yet.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={rows}
              margin={{ top: 12, right: 24, left: 4, bottom: 8 }}
            >
              <CartesianGrid
                stroke="#f1f1f1"
                strokeDasharray="0"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#737373" }}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                padding={{ left: 12, right: 12 }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#737373" }}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                width={56}
                tickFormatter={(v) =>
                  formatCompactMetric(Number(v), activeData.metric)
                }
              />
              <Tooltip
                content={<ChartTooltip metric={activeData.metric} />}
                cursor={{
                  stroke: "#a3a3a3",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
              />
              {activeData.series.length > 1 && (
                <Line
                  type="monotone"
                  dataKey="__total"
                  stroke="#737373"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                  dot={false}
                  activeDot={false}
                  legendType="none"
                />
              )}
              {activeData.series.map((s, i) => {
                const color = seriesColors[i % seriesColors.length];
                return (
                  <Line
                    key={s.name}
                    type="monotone"
                    dataKey={s.name}
                    stroke={color}
                    strokeWidth={2.25}
                    dot={false}
                    activeDot={{
                      r: 5,
                      strokeWidth: 2,
                      stroke: "#fff",
                      fill: color,
                    }}
                  />
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      {hasSeries && activeData && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-2 px-2">
          {activeData.series.map((s, i) => (
            <span
              key={s.name}
              className="inline-flex items-center gap-1.5 text-[12px] text-text-secondary"
            >
              <span
                className="inline-block w-4 h-2.5 rounded-xs shrink-0"
                style={{ background: seriesColors[i % seriesColors.length] }}
              />
              <span className="truncate max-w-40">{s.name}</span>
            </span>
          ))}
          {activeData.series.length > 1 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary/80">
              <span
                aria-hidden="true"
                className="inline-block w-4 border-t border-dashed border-text-secondary/70"
              />
              <span>Total</span>
            </span>
          )}
        </div>
      )}
    </>
  );
}
