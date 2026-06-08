"use client";

import { useState } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AnalyticsGroupBy, AnalyticsMetric } from "@/app/lib/types/analytics";
import {
  formatCompactMetric,
  formatMetricValue,
  formatTokens,
} from "@/app/lib/utils/analytics/formatValue";

export interface BreakdownEntry {
  name: string;
  total: number;
  color: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  sharePct: number;
}

const GROUP_BY_HEADER: Record<AnalyticsGroupBy, string> = {
  total: "Series",
  provider: "Provider",
  modality: "Request type",
  modality_provider: "Request type · Provider",
};

interface SegmentLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}

function renderSegmentLabel(props: SegmentLabelProps) {
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    percent = 0,
  } = props;
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos((-midAngle * Math.PI) / 180);
  const y = cy + r * Math.sin((-midAngle * Math.PI) / 180);
  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

interface PieTooltipPayload {
  payload?: { name?: string; value?: number; fill?: string };
}

interface PieTooltipProps {
  active?: boolean;
  payload?: PieTooltipPayload[];
  metric: AnalyticsMetric;
  grandTotal: number;
}

function PieTooltip({ active, payload, metric, grandTotal }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  const share = grandTotal > 0 ? ((item.value ?? 0) / grandTotal) * 100 : 0;
  return (
    <div className="rounded-lg border border-border bg-bg-primary px-3 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.08)] min-w-40">
      <div className="flex items-center gap-2 text-[13px] mb-1">
        <span
          className="inline-block w-3 h-2.5 rounded-xs shrink-0"
          style={{ background: item.fill }}
        />
        <span className="font-medium text-text-primary truncate">
          {item.name}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="text-text-secondary">Total</span>
        <span className="font-semibold text-text-primary tabular-nums">
          {formatMetricValue(item.value ?? 0, metric)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-[12px] text-text-secondary mt-0.5">
        <span>Share</span>
        <span className="tabular-nums">{share.toFixed(1)}%</span>
      </div>
    </div>
  );
}

interface BreakdownPanelProps {
  totals: BreakdownEntry[];
  metric: AnalyticsMetric;
  metricLabel: string;
  groupBy: AnalyticsGroupBy;
}

export default function BreakdownPanel({
  totals,
  metric,
  metricLabel,
  groupBy,
}: BreakdownPanelProps) {
  const [isSliceHovered, setIsSliceHovered] = useState(false);
  const hasAnyTokens = totals.some(
    (t) =>
      (t.totalTokens ?? 0) > 0 ||
      (t.inputTokens ?? 0) > 0 ||
      (t.outputTokens ?? 0) > 0,
  );
  const grandTotal = totals.reduce((acc, t) => acc + t.total, 0);
  const donutData = totals
    .filter((t) => t.total > 0)
    .map((t) => ({ name: t.name, value: t.total, fill: t.color }));
  const groupHeader = GROUP_BY_HEADER[groupBy];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <section className="rounded-xl border border-border bg-bg-primary overflow-hidden flex flex-col shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <header className="px-4 py-3 border-b border-border bg-bg-primary text-center">
          <h4 className="text-sm font-semibold text-accent-primary tracking-tight">
            {groupHeader}-wise {metricLabel}
          </h4>
        </header>
        <div className="flex-1 min-h-0 max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-accent-primary/10 backdrop-blur-3xl">
              <tr className="text-[11px] uppercase tracking-wide text-black">
                <th className="text-left py-2.5 px-4 font-semibold">
                  {groupHeader}
                </th>
                <th className="text-right py-2.5 px-4 font-semibold">
                  {metricLabel}
                </th>
                <th className="text-right py-2.5 px-4 font-semibold">Share</th>
                {hasAnyTokens && (
                  <th className="text-right py-2.5 px-4 font-semibold">
                    Tokens
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {totals.map((t, i) => {
                const isEmpty = t.total === 0;
                return (
                  <tr
                    key={t.name}
                    className={`transition-colors hover:bg-accent-primary/5 ${
                      i % 2 === 0 ? "bg-bg-primary" : "bg-bg-secondary/30"
                    } ${isEmpty ? "opacity-60" : ""}`}
                  >
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <span
                          className="w-3.5 h-2.5 rounded-xs shrink-0"
                          style={{ background: t.color }}
                        />
                        <span className="truncate font-medium text-text-primary">
                          {t.name}
                        </span>
                      </span>
                    </td>
                    <td className="text-right py-2.5 px-4 tabular-nums font-semibold text-text-primary">
                      {formatMetricValue(t.total, metric)}
                    </td>
                    <td className="text-right py-2.5 px-4 tabular-nums text-text-secondary">
                      {!isEmpty ? `${t.sharePct.toFixed(1)}%` : "—"}
                    </td>
                    {hasAnyTokens && (
                      <td className="text-right py-2.5 px-4 tabular-nums text-text-secondary">
                        {(t.totalTokens ?? 0) > 0
                          ? formatTokens(t.totalTokens ?? 0)
                          : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-bg-primary overflow-hidden flex flex-col shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <header className="px-4 py-3 border-b border-border bg-bg-primary text-center">
          <h4 className="text-sm font-semibold text-accent-primary tracking-tight">
            Share of {metricLabel}
          </h4>
        </header>
        <div className="flex-1 flex flex-col items-center justify-between p-4">
          <div className="relative w-full h-60">
            {donutData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="58%"
                      outerRadius="90%"
                      paddingAngle={1.5}
                      strokeWidth={0}
                      isAnimationActive={false}
                      label={renderSegmentLabel}
                      labelLine={false}
                      onMouseEnter={() => setIsSliceHovered(true)}
                      onMouseLeave={() => setIsSliceHovered(false)}
                    />
                    <Tooltip
                      content={
                        <PieTooltip metric={metric} grandTotal={grandTotal} />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                {!isSliceHovered && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xl font-semibold text-text-primary tabular-nums tracking-tight leading-none">
                      {formatCompactMetric(grandTotal, metric)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-text-secondary mt-1">
                      Total
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-text-secondary">
                No data
              </div>
            )}
          </div>
          {donutData.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-border w-full">
              {donutData.map((d) => (
                <span
                  key={d.name}
                  className="inline-flex items-center gap-1.5 text-[12px] text-text-secondary"
                >
                  <span
                    className="inline-block w-4 h-2.5 rounded-xs shrink-0"
                    style={{ background: d.fill }}
                  />
                  <span className="truncate max-w-32">{d.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
