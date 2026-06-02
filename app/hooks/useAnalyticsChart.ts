import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import {
  AnalyticsChartData,
  AnalyticsChartFilters,
  AnalyticsChartResponse,
  AnalyticsMetric,
  UseAnalyticsChartResult,
} from "@/app/lib/types/analytics";
import { mergeChartData } from "@/app/lib/utils/analytics/mergeChartData";

/**
 * Virtual metrics live in the frontend only — the backend doesn't know about
 * them. The hook expands each into the atomic metrics shown here, fires one
 * request per atom in parallel, and merges the responses before returning.
 */
const VIRTUAL_METRICS: Partial<Record<AnalyticsMetric, AnalyticsMetric[]>> = {
  cost_all: ["cost", "eval_cost"],
  volume: ["requests", "eval_runs"],
};

function buildQuery(filters: AnalyticsChartFilters): string {
  const params = new URLSearchParams();
  params.set("metric", filters.metric);
  params.set("group_by", filters.group_by);
  if (filters.modality) params.set("modality", filters.modality);
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.project_id !== undefined)
    params.set("project_id", String(filters.project_id));
  if (filters.from_month) params.set("from_month", filters.from_month);
  if (filters.to_month) params.set("to_month", filters.to_month);
  return params.toString();
}

async function fetchSingleChart(
  filters: AnalyticsChartFilters,
  apiKey: string,
): Promise<AnalyticsChartData> {
  const result = await apiFetch<AnalyticsChartResponse>(
    `/api/analytics/monthly/chart?${buildQuery(filters)}`,
    apiKey,
  );
  if (!result.success || !result.data) {
    throw new Error(result.error ?? "Failed to load analytics");
  }
  return result.data;
}

export function useAnalyticsChart(
  filters: AnalyticsChartFilters,
): UseAnalyticsChartResult {
  const { activeKey, isAuthenticated } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const [data, setData] = useState<AnalyticsChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  const fetchChart = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const parts = VIRTUAL_METRICS[filters.metric];
      if (parts) {
        const [first, second] = await Promise.all(
          parts.map((m) => fetchSingleChart({ ...filters, metric: m }, apiKey)),
        );
        setData(mergeChartData(first, second, filters.metric));
      } else {
        setData(await fetchSingleChart(filters, apiKey));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      setData(null);
    } finally {
      setIsLoading(false);
    }
     
  }, [apiKey, isAuthenticated, filtersKey]);

  useEffect(() => {
    void fetchChart();
  }, [fetchChart]);

  return { data, isLoading, error, refetch: fetchChart };
}
