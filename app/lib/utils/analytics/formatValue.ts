import { AnalyticsMetric } from "@/app/lib/types/analytics";

export const CURRENCY_METRICS: AnalyticsMetric[] = [
  "cost",
  "eval_cost",
  "cost_all",
];

export function formatMetricValue(
  value: number,
  metric: AnalyticsMetric,
): string {
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

export function formatCompactMetric(
  value: number,
  metric: AnalyticsMetric,
): string {
  const abs = Math.abs(value);
  const compact =
    abs >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)}M`
      : abs >= 1_000
        ? `${(value / 1_000).toFixed(1)}k`
        : value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return CURRENCY_METRICS.includes(metric) ? `$${compact}` : compact;
}

export function formatTokens(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function formatMonthLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
