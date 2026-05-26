import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import {
  AnalyticsChartFilters,
  AnalyticsChartResponse,
  AnalyticsMetric,
  AnalyticsTotalsMap,
  AnalyticsTotalsValue,
  UseAnalyticsTotalsResult,
} from "@/app/lib/types/analytics";

const TOTAL_METRICS: AnalyticsMetric[] = [
  "requests",
  "cost",
  "eval_runs",
  "eval_cost",
];

function buildQuery(
  metric: AnalyticsMetric,
  filters: Omit<AnalyticsChartFilters, "metric" | "group_by">,
) {
  const params = new URLSearchParams();
  params.set("metric", metric);
  params.set("group_by", "total");
  if (filters.modality) params.set("modality", filters.modality);
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.project_id !== undefined)
    params.set("project_id", String(filters.project_id));
  if (filters.from_month) params.set("from_month", filters.from_month);
  if (filters.to_month) params.set("to_month", filters.to_month);
  return params.toString();
}

function emptyValue(): AnalyticsTotalsValue {
  return { value: 0, totalTokens: 0, inputTokens: 0, outputTokens: 0 };
}

export function useAnalyticsTotals(
  filters: Omit<AnalyticsChartFilters, "metric" | "group_by">,
): UseAnalyticsTotalsResult {
  const { activeKey, isAuthenticated } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const [totals, setTotals] = useState<AnalyticsTotalsMap | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify({
    modality: filters.modality,
    provider: filters.provider,
    project_id: filters.project_id,
    from_month: filters.from_month,
    to_month: filters.to_month,
  });

  const fetchTotals = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        TOTAL_METRICS.map(async (metric) => {
          const query = buildQuery(metric, filters);
          const res = await apiFetch<AnalyticsChartResponse>(
            `/api/analytics/monthly/chart?${query}`,
            apiKey,
          );
          if (!res.success || !res.data) return { metric, value: emptyValue() };
          let sum = 0;
          let totalTokens = 0;
          let inputTokens = 0;
          let outputTokens = 0;
          for (const s of res.data.series) {
            sum += s.data.reduce((a, v) => a + (Number(v) || 0), 0);
            totalTokens += s.total_tokens ?? 0;
            inputTokens += s.total_input_tokens ?? 0;
            outputTokens += s.total_output_tokens ?? 0;
          }
          return {
            metric,
            value: { value: sum, totalTokens, inputTokens, outputTokens },
          };
        }),
      );
      const map: AnalyticsTotalsMap = {
        requests: emptyValue(),
        cost: emptyValue(),
        eval_runs: emptyValue(),
        eval_cost: emptyValue(),
      };
      for (const { metric, value } of results) map[metric] = value;
      setTotals(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load totals");
      setTotals(null);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, isAuthenticated, filtersKey]);

  useEffect(() => {
    void fetchTotals();
  }, [fetchTotals]);

  return { totals, isLoading, error };
}
