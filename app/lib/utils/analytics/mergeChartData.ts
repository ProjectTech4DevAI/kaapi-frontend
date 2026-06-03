import {
  AnalyticsChartData,
  AnalyticsMetric,
  AnalyticsSeriesAggregate,
  AnalyticsSeriesPoint,
} from "@/app/lib/types/analytics";

/**
 * Sums two `AnalyticsChartData` responses into one — labels unioned,
 * series matched by name, values and token totals added per month.
 * Backs the virtual metrics (`cost_all`, `volume`).
 */
export function mergeChartData(
  a: AnalyticsChartData,
  b: AnalyticsChartData,
  outMetric: AnalyticsMetric,
): AnalyticsChartData {
  const labels = Array.from(new Set([...a.labels, ...b.labels])).sort();
  const labelIndex = new Map(labels.map((l, i) => [l, i]));

  const map = new Map<string, AnalyticsSeriesAggregate>();

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
