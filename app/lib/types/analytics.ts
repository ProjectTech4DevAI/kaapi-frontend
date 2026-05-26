import { APIEnvelope } from "@/app/lib/types/chat";

export type AnalyticsMetric = "requests" | "cost" | "eval_runs" | "eval_cost";

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

export type AnalyticsTotalsMap = Record<AnalyticsMetric, AnalyticsTotalsValue>;

export interface UseAnalyticsTotalsResult {
  totals: AnalyticsTotalsMap | null;
  isLoading: boolean;
  error: string | null;
}

export interface AnalyticsTotalsRowProps {
  totals: AnalyticsTotalsMap | null;
  isLoading: boolean;
  error: string | null;
}
