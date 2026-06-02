import {
  AnalyticsChartData,
  AnalyticsMetric,
  AnalyticsSeriesPoint,
} from "@/app/lib/types/analytics";

interface SeriesAggregate {
  data: number[];
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  hasTokens: boolean;
}

/**
 * Sums two `AnalyticsChartData` responses into one synthetic series set.
 *
 * Used to back the "virtual" metrics (`cost_all`, `volume`) — we fire one
 * backend call per atomic metric and combine the responses here, aligning
 * series by name and label by month.
 *
 * - Labels are the union of both responses' labels, sorted lexicographically
 *   (which sorts correctly because they are `YYYY-MM-DD` strings).
 * - Series are matched by `name`. If a series appears in only one response,
 *   its values are kept and the other response contributes 0 for those months.
 * - Token totals are summed across both responses.
 */
export function mergeChartData(
  a: AnalyticsChartData,
  b: AnalyticsChartData,
  outMetric: AnalyticsMetric,
): AnalyticsChartData {
  const labels = Array.from(new Set([...a.labels, ...b.labels])).sort();
  const labelIndex = new Map(labels.map((l, i) => [l, i]));

  const map = new Map<string, SeriesAggregate>();

  const ingest = (src: AnalyticsChartData) => {
    for (const s of src.series) {
      const agg = map.get(s.name) ?? {
        data: new Array(labels.length).fill(0),
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        hasTokens: false,
      };
      src.labels.forEach((label, i) => {
        const idx = labelIndex.get(label);
        if (idx == null) return;
        const v = Number(s.data[i] ?? 0);
        agg.data[idx] += Number.isFinite(v) ? v : 0;
      });
      if (
        s.total_input_tokens !== undefined ||
        s.total_output_tokens !== undefined ||
        s.total_tokens !== undefined
      ) {
        agg.hasTokens = true;
      }
      agg.totalTokens += s.total_tokens ?? 0;
      agg.inputTokens += s.total_input_tokens ?? 0;
      agg.outputTokens += s.total_output_tokens ?? 0;
      map.set(s.name, agg);
    }
  };

  ingest(a);
  ingest(b);

  const series: AnalyticsSeriesPoint[] = Array.from(map.entries()).map(
    ([name, agg]) => ({
      name,
      data: agg.data.map((n) => String(n)),
      ...(agg.hasTokens
        ? {
            total_tokens: agg.totalTokens,
            total_input_tokens: agg.inputTokens,
            total_output_tokens: agg.outputTokens,
          }
        : {}),
    }),
  );

  return {
    metric: outMetric,
    group_by: a.group_by,
    labels,
    series,
  };
}
