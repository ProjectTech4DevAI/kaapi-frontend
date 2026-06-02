import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import {
  AnalyticsChartData,
  AnalyticsChartFilters,
  AnalyticsChartResponse,
  UseAnalyticsChartResult,
} from "@/app/lib/types/analytics";

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

export function useAnalyticsChart(
  filters: AnalyticsChartFilters,
): UseAnalyticsChartResult {
  const { activeKey, isAuthenticated } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const [data, setData] = useState<AnalyticsChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = buildQuery(filters);

  const fetchChart = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFetch<AnalyticsChartResponse>(
        `/api/analytics/monthly/chart?${query}`,
        apiKey,
      );
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error ?? "Failed to load analytics");
        setData(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, isAuthenticated, query]);

  useEffect(() => {
    void fetchChart();
  }, [fetchChart]);

  return { data, isLoading, error, refetch: fetchChart };
}
