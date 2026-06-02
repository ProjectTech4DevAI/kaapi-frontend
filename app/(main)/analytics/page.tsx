"use client";

import { useMemo, useState } from "react";
import { PageHeader, Sidebar } from "@/app/components";
import { Select } from "@/app/components/ui";
import { toSelectOptions } from "@/app/lib/utils/selectOptions";
import { useApp } from "@/app/lib/context/AppContext";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useAnalyticsChart } from "@/app/hooks/useAnalyticsChart";
import { useAnalyticsTotals } from "@/app/hooks/useAnalyticsTotals";
import {
  AnalyticsChartCard,
  AnalyticsTotalsRow,
  MonthYearPicker,
} from "@/app/components/analytics";
import {
  ANALYTICS_GROUP_BY_OPTIONS,
  ANALYTICS_METRIC_OPTIONS,
  ANALYTICS_MODALITY_OPTIONS,
  PROVIDES_OPTIONS,
} from "@/app/lib/constants";
import {
  AnalyticsChartFilters,
  AnalyticsGroupBy,
  AnalyticsMetric,
  AnalyticsModality,
} from "@/app/lib/types/analytics";

function FilterField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-[12px] font-medium mb-1 text-text-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const { sidebarCollapsed } = useApp();
  const { isAuthenticated, isHydrated } = useAuth();
  const [metric, setMetric] = useState<AnalyticsMetric>("cost_all");
  const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>("provider");
  const [modality, setModality] = useState<AnalyticsModality | "">("");
  const [provider, setProvider] = useState("");
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");

  const filters: AnalyticsChartFilters = useMemo(
    () => ({
      metric,
      group_by: groupBy,
      modality: modality || undefined,
      provider: provider || undefined,
      from_month: fromMonth || undefined,
      to_month: toMonth || undefined,
    }),
    [metric, groupBy, modality, provider, fromMonth, toMonth],
  );

  const { data, isLoading, error } = useAnalyticsChart(filters);

  const totalsFilters = useMemo(
    () => ({
      modality: modality || undefined,
      provider: provider || undefined,
      from_month: fromMonth || undefined,
      to_month: toMonth || undefined,
    }),
    [modality, provider, fromMonth, toMonth],
  );
  const {
    totals,
    isLoading: isTotalsLoading,
    error: totalsError,
  } = useAnalyticsTotals(totalsFilters);

  const metricLabel =
    ANALYTICS_METRIC_OPTIONS.find((m) => m.value === metric)?.label ?? metric;

  const isReady = isHydrated;

  return (
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/analytics" />

        <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
          <PageHeader
            title="Analytics"
            subtitle="Track cost, request volume and token usage across providers, modalities and projects"
          />

          {!isReady ? null : !isAuthenticated ? (
            <div className="flex-1 flex items-center justify-center px-6">
              <p className="text-sm text-text-secondary">
                Log in to view analytics.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 z-10 bg-[#FAFAFA] border-b border-border px-4 sm:px-6 py-3">
                <div className="flex flex-wrap lg:flex-nowrap items-end gap-x-3 gap-y-2">
                  <FilterField
                    label="Metric"
                    className="flex-1 basis-40 min-w-40"
                  >
                    <Select
                      value={metric}
                      onChange={(e) =>
                        setMetric(e.target.value as AnalyticsMetric)
                      }
                      options={toSelectOptions(ANALYTICS_METRIC_OPTIONS)}
                    />
                  </FilterField>
                  <FilterField
                    label="Group by"
                    className="flex-1 basis-40 min-w-40"
                  >
                    <Select
                      value={groupBy}
                      onChange={(e) =>
                        setGroupBy(e.target.value as AnalyticsGroupBy)
                      }
                      options={toSelectOptions(ANALYTICS_GROUP_BY_OPTIONS)}
                    />
                  </FilterField>
                  <FilterField
                    label="Request type"
                    className="flex-1 basis-40 min-w-40"
                  >
                    <Select
                      value={modality}
                      onChange={(e) =>
                        setModality(e.target.value as AnalyticsModality | "")
                      }
                      options={toSelectOptions(ANALYTICS_MODALITY_OPTIONS)}
                      placeholder="All"
                    />
                  </FilterField>
                  <FilterField
                    label="Provider"
                    className="flex-1 basis-36 min-w-36"
                  >
                    <Select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      options={PROVIDES_OPTIONS}
                      placeholder="All"
                    />
                  </FilterField>
                  <FilterField
                    label="From"
                    className="flex-[1.25] basis-48 min-w-44"
                  >
                    <MonthYearPicker
                      value={fromMonth}
                      onChange={setFromMonth}
                      placeholder="Any start"
                    />
                  </FilterField>
                  <FilterField
                    label="To"
                    className="flex-[1.25] basis-48 min-w-44"
                  >
                    <MonthYearPicker
                      value={toMonth}
                      onChange={setToMonth}
                      placeholder="Any end"
                    />
                  </FilterField>
                  {(fromMonth || toMonth) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFromMonth("");
                        setToMonth("");
                      }}
                      className="text-[12px] font-medium text-status-error-text hover:underline cursor-pointer pb-1.5 shrink-0"
                    >
                      Clear dates
                    </button>
                  )}
                </div>
              </div>

              <div className="px-4 sm:px-6 py-6 space-y-6">
                <AnalyticsTotalsRow
                  totals={totals}
                  isLoading={isTotalsLoading}
                  error={totalsError}
                />

                <AnalyticsChartCard
                  data={data}
                  isLoading={isLoading}
                  error={error}
                  metricLabel={metricLabel}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
