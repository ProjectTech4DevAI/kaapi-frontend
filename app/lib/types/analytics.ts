import { APIEnvelope } from "@/app/lib/types/chat";

/**
 * Atomic backend metrics map 1:1 to a single `/analytics/monthly/chart` call.
 * Virtual metrics (`cost_all`, `volume`) are frontend-only: the chart hook
 * fans them out into two atomic calls and sums the responses before plotting.
 *   - `cost_all` = `cost` + `eval_cost` (production + eval spend)
 *   - `volume`   = `requests` + `eval_runs` (production calls + eval batches)
 */
export type AnalyticsMetric =
  | "requests"
  | "cost"
  | "eval_runs"
  | "eval_cost"
  | "cost_all"
  | "volume";

export type AnalyticsGroupBy =
  | "total"
  | "provider"
  | "modality"
  | "modality_provider";

export type AnalyticsModality = "T-FS-T" | "S-FS-S" | "STT" | "TTS" | "OTHER";

export interface AnalyticsSeriesPoint {
  name: string;
  data: string[];
  total_input_tokens?: number;
  total_output_tokens?: number;
  total_tokens?: number;
}

export interface AnalyticsChartData {
  metric: AnalyticsMetric;
  group_by: AnalyticsGroupBy;
  labels: string[];
  series: AnalyticsSeriesPoint[];
}

export interface AnalyticsChartFilters {
  metric: AnalyticsMetric;
  group_by: AnalyticsGroupBy;
  modality?: AnalyticsModality;
  provider?: string;
  project_id?: number;
  from_month?: string;
  to_month?: string;
}

export type AnalyticsChartResponse = APIEnvelope<AnalyticsChartData>;

export interface AnalyticsTooltipEntry {
  dataKey?: string | number;
  value?: number | string;
  color?: string;
}

export interface AnalyticsTooltipRenderProps {
  active?: boolean;
  payload?: AnalyticsTooltipEntry[];
  label?: string | number;
  metric: AnalyticsMetric;
}

export interface AnalyticsTotalsValue {
  value: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}

/** Atomic backend metrics — the ones that map 1:1 to a backend call. */
export type AnalyticsBackendMetric = Exclude<
  AnalyticsMetric,
  "cost_all" | "volume"
>;

export type AnalyticsTotalsMap = Record<
  AnalyticsBackendMetric,
  AnalyticsTotalsValue
>;

export interface UseAnalyticsTotalsResult {
  totals: AnalyticsTotalsMap | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseAnalyticsChartResult {
  data: AnalyticsChartData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface AnalyticsTotalsRowProps {
  totals: AnalyticsTotalsMap | null;
  isLoading: boolean;
  error: string | null;
}

export interface AnalyticsChartRow {
  month: string;
  monthIso: string;
  __total: number;
  __range: [number, number];
  [seriesName: string]: string | number | [number, number];
}
