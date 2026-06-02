"use client";

import { useMemo } from "react";
import { InfoTooltip } from "@/app/components/ui";
import {
  AnalyticsChartData,
  AnalyticsChartRow,
} from "@/app/lib/types/analytics";
import { normalizeAndMergeSeries } from "@/app/lib/utils/analytics/normalizeSeries";
import {
  formatMonthLabel,
  formatTokens,
} from "@/app/lib/utils/analytics/formatValue";
import BreakdownPanel from "./BreakdownPanel";
import LineTrendChart from "./LineTrendChart";

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

function buildRows(chart: AnalyticsChartData): AnalyticsChartRow[] {
  return chart.labels.map((label, i) => {
    const values = chart.series.map((s) => {
      const raw = s.data[i];
      const num = raw === undefined || raw === null ? 0 : Number(raw);
      return Number.isFinite(num) ? num : 0;
    });
    const total = values.reduce((acc, v) => acc + v, 0);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    const row: AnalyticsChartRow = {
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
    const merged = normalizeAndMergeSeries(data.series);
    const filtered = merged.filter((s) => {
      const dataSum = s.data.reduce((acc, v) => acc + (Number(v) || 0), 0);
      const tokenSum =
        (s.total_input_tokens ?? 0) +
        (s.total_output_tokens ?? 0) +
        (s.total_tokens ?? 0);
      return dataSum > 0 || tokenSum > 0;
    });
    return { ...data, series: filtered };
  }, [data]);

  const rows = useMemo(() => {
    if (!activeData) return [];
    const all = buildRows(activeData);
    // Auto-trim leading + trailing months where every series is zero
    let start = 0;
    let end = all.length - 1;
    const isEmpty = (r: AnalyticsChartRow) => r.__total === 0;
    while (start <= end && isEmpty(all[start])) start++;
    while (end >= start && isEmpty(all[end])) end--;
    return all.slice(start, end + 1);
  }, [activeData]);
  const hasSeries = !!activeData && activeData.series.length > 0;

  const totals = useMemo(() => {
    if (!activeData) return [];
    const raw = activeData.series.map((s, i) => {
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
    const grandTotal = raw.reduce((acc, t) => acc + t.total, 0);
    return raw
      .map((t) => ({
        ...t,
        sharePct: grandTotal > 0 ? (t.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
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
          <h2 className="text-xl font-semibold text-text-primary tracking-tight inline-flex items-center">
            {metricLabel}
            <InfoTooltip
              text={
                <>
                  Chart values are the selected metric (
                  <strong>{metricLabel}</strong>) summed per month and broken
                  out by the chosen <strong>Group by</strong>. The thick line is
                  the total across all groups; the band is the spread between
                  the lowest and highest group at each month.
                </>
              }
            />
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Monthly trend
            {activeData ? ` · grouped by ${activeData.group_by}` : ""}
          </p>
        </div>
      </div>

      {totals.length > 0 && (
        <BreakdownPanel
          totals={totals}
          metric={activeData!.metric}
          metricLabel={metricLabel}
          groupBy={activeData!.group_by}
        />
      )}

      <LineTrendChart
        rows={rows}
        activeData={activeData}
        hasSeries={hasSeries}
        hasInitialData={!!data}
        isLoading={isLoading}
        error={error}
        seriesColors={SERIES_COLORS}
      />

      {tokenSummary && (
        <div className="pt-5 mt-2 border-t border-border">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-text-primary inline-flex items-center">
                Tokens for this chart
                <InfoTooltip
                  text={
                    <>
                      Tokens reported by the response for{" "}
                      <strong>{metricLabel}</strong> with the current filters.
                      Only models that actually consumed tokens contribute to
                      this sum. Use this to gauge how much volume produced the
                      numbers above.
                      <br />
                      <br />
                      This is <strong>not</strong> a global total —{" "}
                      <em>production</em> and <em>eval</em> tokens are shown
                      separately in the &quot;All-time totals&quot; row at the
                      bottom of the page.
                    </>
                  }
                />
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Aggregated across the groups shown in the chart above
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TokenStat
              label="Total tokens"
              value={tokenSummary.totalSum}
              tooltip="Input + output tokens charged for the calls that produced the values in this chart."
            />
            <TokenStat
              label="Input tokens"
              value={tokenSummary.inputSum}
              tooltip="Prompt tokens sent to the model — what you paid for on the input side."
            />
            <TokenStat
              label="Output tokens"
              value={tokenSummary.outputSum}
              tooltip="Completion tokens returned by the model — what you paid for on the output side."
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TokenStat({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: number;
  tooltip: string;
}) {
  return (
    <div className="rounded-xl bg-bg-secondary/40 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary mb-2 inline-flex items-center">
        {label}
        <InfoTooltip text={tooltip} />
      </p>
      <p className="text-2xl font-semibold text-text-primary tabular-nums tracking-tight">
        {formatTokens(value)}
      </p>
      <p className="text-[11px] text-text-secondary mt-1 tabular-nums">
        {value.toLocaleString("en-US")} exact
      </p>
    </div>
  );
}
