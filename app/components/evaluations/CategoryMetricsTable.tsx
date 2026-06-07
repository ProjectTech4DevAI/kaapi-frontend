"use client";

import { CategoryMetric } from "@/app/lib/types/evaluation";

interface CategoryMetricsTableProps {
  categoryMetrics: CategoryMetric[];
}

function formatScore(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(3);
}

export default function CategoryMetricsTable({
  categoryMetrics,
}: CategoryMetricsTableProps) {
  if (!categoryMetrics || categoryMetrics.length === 0) return null;

  return (
    <div className="rounded-lg bg-bg-primary shadow-sm">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">
          Metrics by Category
        </h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Per-category breakdown across all evaluated items
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-bg-secondary border-b border-border">
              <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                Category
              </th>
              <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                Total Evals
              </th>
              <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                Avg Cosine
              </th>
              <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                Avg Correctness
              </th>
            </tr>
          </thead>
          <tbody>
            {categoryMetrics.map((row) => (
              <tr
                key={row.category}
                className="border-b border-border last:border-b-0 hover:bg-bg-secondary/40"
              >
                <td className="px-5 py-2.5 text-sm font-medium text-text-primary">
                  {row.category}
                </td>
                <td className="px-5 py-2.5 text-sm text-right tabular-nums text-text-primary">
                  {row.total_evals}
                </td>
                <td className="px-5 py-2.5 text-sm text-right tabular-nums text-text-primary">
                  {formatScore(row.avg_cosine)}
                </td>
                <td className="px-5 py-2.5 text-sm text-right tabular-nums text-text-primary">
                  {formatScore(row.avg_correctness)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
