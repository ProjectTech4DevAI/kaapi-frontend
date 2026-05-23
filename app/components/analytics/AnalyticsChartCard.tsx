"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader } from "@/app/components/ui";
import { AnalyticsChartData, AnalyticsMetric } from "@/app/lib/types/analytics";

const SERIES_COLORS = [
  "#1f4496",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#8b5cf6",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#475569",
];

const CURRENCY_METRICS: AnalyticsMetric[] = ["cost", "eval_cost"];

function formatMonthLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatValue(value: number, metric: AnalyticsMetric): string {
  if (CURRENCY_METRICS.includes(metric)) {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatTokens(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatAxisValue(value: number, metric: AnalyticsMetric): string {
  const abs = Math.abs(value);
  const compact =
    abs >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)}M`
      : abs >= 1_000
        ? `${(value / 1_000).toFixed(1)}k`
        : value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return CURRENCY_METRICS.includes(metric) ? `$${compact}` : compact;
}

interface ChartRow {
  month: string;
  monthIso: string;
  __total: number;
  __range: [number, number];
  [seriesName: string]: string | number | [number, number];
}

function buildRows(chart: AnalyticsChartData): ChartRow[] {
  return chart.labels.map((label, i) => {
    const values = chart.series.map((s) => {
      const raw = s.data[i];
      const num = raw === undefined || raw === null ? 0 : Number(raw);
      return Number.isFinite(num) ? num : 0;
    });
    const total = values.reduce((acc, v) => acc + v, 0);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    const row: ChartRow = {
      month: formatMonthLabel(label),
      monthIso: label,
      __total: total,
      __range: [min, max],
    };
    chart.series.forEach((s, idx) => {
      row[s.name] = values[idx];
    });
    return row;
  });
}

interface TooltipEntry {
  dataKey?: string | number;
  value?: number | string;
  color?: string;
}

interface TooltipRenderProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  metric: AnalyticsMetric;
}

function ChartTooltip({ active, payload, label, metric }: TooltipRenderProps) {
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
            {formatValue(Number(totalEntry.value ?? 0), metric)}
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
                {formatValue(Number(entry.value ?? 0), metric)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AnalyticsChartCardProps {
  data: AnalyticsChartData | null;
  isLoading: boolean;
  error: string | null;
  metricLabel: string;
}

export default function AnalyticsChartCard({
  data,
  isLoading,
  error,
  metricLabel,
}: AnalyticsChartCardProps) {
  const activeData = useMemo(() => {
    if (!data) return null;
    const filtered = data.series.filter((s) => {
      const dataSum = s.data.reduce((acc, v) => acc + (Number(v) || 0), 0);
      const tokenSum =
        (s.total_input_tokens ?? 0) +
        (s.total_output_tokens ?? 0) +
        (s.total_tokens ?? 0);
      return dataSum > 0 || tokenSum > 0;
    });
    return { ...data, series: filtered };
  }, [data]);

  const rows = useMemo(
    () => (activeData ? buildRows(activeData) : []),
    [activeData],
  );
  const hasSeries = !!activeData && activeData.series.length > 0;

  const totals = useMemo(() => {
    if (!activeData) return [];
    return activeData.series.map((s, i) => {
      const sum = s.data.reduce((acc, v) => acc + (Number(v) || 0), 0);
      return {
        name: s.name,
        total: sum,
        color: SERIES_COLORS[i % SERIES_COLORS.length],
        inputTokens: s.total_input_tokens,
        outputTokens: s.total_output_tokens,
        totalTokens: s.total_tokens,
      };
    });
  }, [activeData]);

  const tokenSummary = useMemo(() => {
    if (!activeData) return null;
    let inputSum = 0;
    let outputSum = 0;
    let totalSum = 0;
    let anyDefined = false;
    for (const s of activeData.series) {
      if (
        s.total_input_tokens !== undefined ||
        s.total_output_tokens !== undefined ||
        s.total_tokens !== undefined
      ) {
        anyDefined = true;
      }
      inputSum += s.total_input_tokens ?? 0;
      outputSum += s.total_output_tokens ?? 0;
      totalSum += s.total_tokens ?? 0;
    }
    if (!anyDefined) return null;
    return { inputSum, outputSum, totalSum };
  }, [activeData]);

  return (
    <div className="bg-bg-primary overflow-hidden space-y-6">
      <div className="pt-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-text-primary tracking-tight">
            {metricLabel}
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Monthly trend
            {activeData ? ` · grouped by ${activeData.group_by}` : ""}
          </p>
        </div>
        {totals.length > 0 && (
          <div className="hidden sm:flex flex-wrap items-center justify-end gap-x-5 gap-y-1.5 max-w-[55%]">
            {totals.map((t) => (
              <div
                key={t.name}
                className="flex items-center gap-2 text-[13px] text-text-secondary"
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: t.color }}
                />
                <span className="truncate max-w-48">{t.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {totals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {totals.map((t) => {
            const hasTokens =
              t.inputTokens !== undefined ||
              t.outputTokens !== undefined ||
              t.totalTokens !== undefined;
            return (
              <div
                key={t.name}
                className="min-w-0 rounded-xl bg-bg-secondary/40 p-4"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: t.color }}
                  />
                  <span className="text-xs font-medium text-text-secondary truncate">
                    {t.name}
                  </span>
                </div>
                <p className="text-3xl font-semibold text-text-primary tabular-nums tracking-tight">
                  {formatValue(t.total, activeData!.metric)}
                </p>
                {hasTokens && (
                  <p className="text-xs text-text-secondary mt-2 tabular-nums">
                    <span className="font-semibold text-text-primary">
                      {formatTokens(t.totalTokens ?? 0)}
                    </span>{" "}
                    tokens
                    <span className="text-text-secondary/80">
                      {" "}
                      · in {formatTokens(t.inputTokens ?? 0)} · out{" "}
                      {formatTokens(t.outputTokens ?? 0)}
                    </span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="h-[480px]">
        {isLoading && !data ? (
          <div className="h-full flex items-center justify-center">
            <Loader size="md" message="Loading chart…" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center px-6 text-center">
            <p className="text-sm text-status-error-text">{error}</p>
          </div>
        ) : !hasSeries ? (
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
              <defs>
                <linearGradient id="range-band" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1f4496" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#1f4496" stopOpacity={0.02} />
                </linearGradient>
              </defs>
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
                  formatAxisValue(Number(v), activeData!.metric)
                }
              />
              <Tooltip
                content={<ChartTooltip metric={activeData!.metric} />}
                cursor={{
                  stroke: "#a3a3a3",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
              />
              {activeData!.series.length > 1 && (
                <Area
                  type="monotone"
                  dataKey="__range"
                  stroke="none"
                  fill="url(#range-band)"
                  isAnimationActive={false}
                  activeDot={false}
                  legendType="none"
                />
              )}
              {activeData!.series.map((s, i) => (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth={1.25}
                  strokeOpacity={0.45}
                  dot={false}
                  activeDot={false}
                />
              ))}
              <Line
                type="monotone"
                dataKey="__total"
                stroke="#1f4496"
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 2, stroke: "#fff", fill: "#1f4496" }}
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: "#fff",
                  fill: "#1f4496",
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {tokenSummary && (
        <div className="pt-6 mt-2 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TokenStat label="Total tokens" value={tokenSummary.totalSum} />
          <TokenStat label="Input tokens" value={tokenSummary.inputSum} />
          <TokenStat label="Output tokens" value={tokenSummary.outputSum} />
        </div>
      )}
    </div>
  );
}

function TokenStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-bg-secondary/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-2">
        {label}
      </p>
      <p className="text-3xl font-semibold text-text-primary tabular-nums tracking-tight">
        {formatTokens(value)}
      </p>
      <p className="text-xs text-text-secondary mt-1 tabular-nums">
        {value.toLocaleString("en-US")} exact
      </p>
    </div>
  );
}
