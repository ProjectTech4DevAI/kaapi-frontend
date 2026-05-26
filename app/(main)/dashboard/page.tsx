"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Sidebar } from "@/app/components";
import { Button, Select, SelectOption } from "@/app/components/ui";
import { CloseIcon } from "@/app/components/icons";
import { useApp } from "@/app/lib/context/AppContext";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useAnalyticsChart } from "@/app/hooks/useAnalyticsChart";
import { useAnalyticsTotals } from "@/app/hooks/useAnalyticsTotals";
import {
  AnalyticsChartCard,
  AnalyticsTotalsRow,
} from "@/app/components/analytics";
import {
  ANALYTICS_GROUP_BY_OPTIONS,
  ANALYTICS_METRIC_OPTIONS,
  ANALYTICS_MODALITY_OPTIONS,
  MONTH_OPTIONS,
  PROVIDES_OPTIONS,
  getRecentYearOptions,
} from "@/app/lib/constants";
import {
  AnalyticsChartFilters,
  AnalyticsGroupBy,
  AnalyticsMetric,
  AnalyticsModality,
} from "@/app/lib/types/analytics";

function toSelectOptions<T extends string>(
  items: { value: T; label: string }[],
): SelectOption[] {
  return items.map((i) => ({ value: i.value, label: i.label }));
}

const YEAR_OPTIONS: SelectOption[] = getRecentYearOptions(2);

interface MonthYearPickerProps {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}

function MonthYearPicker({ label, value, onChange }: MonthYearPickerProps) {
  const [year, setYear] = useState(value ? value.slice(0, 4) : "");
  const [month, setMonth] = useState(value ? value.slice(5, 7) : "");

  useEffect(() => {
    setYear(value ? value.slice(0, 4) : "");
    setMonth(value ? value.slice(5, 7) : "");
  }, [value]);

  const flush = (y: string, m: string) => {
    if (y && m) onChange(`${y}-${m}-01`);
    else if (!y && !m) onChange("");
  };

  const handleMonth = (m: string) => {
    setMonth(m);
    flush(year, m);
  };
  const handleYear = (y: string) => {
    setYear(y);
    flush(y, month);
  };

  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-text-secondary">
        {label}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={month}
          onChange={(e) => handleMonth(e.target.value)}
          options={MONTH_OPTIONS}
          placeholder="Month"
        />
        <Select
          value={year}
          onChange={(e) => handleYear(e.target.value)}
          options={YEAR_OPTIONS}
          placeholder="Year"
        />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { sidebarCollapsed } = useApp();
  const { isAuthenticated, isHydrated } = useAuth();
  const [metric, setMetric] = useState<AnalyticsMetric>("cost");
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
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/dashboard" />

        <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
          <PageHeader
            title="Dashboard"
            subtitle="Track cost, request volume and token usage across providers, modalities and projects"
          />

          {!isReady ? null : !isAuthenticated ? (
            <div className="flex-1 flex items-center justify-center px-6">
              <p className="text-sm text-text-secondary">
                Log in to view analytics.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
              <div className="rounded-2xl bg-bg-primary p-5 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] space-y-6">
                <section>
                  <h3 className="text-sm font-semibold text-text-primary mb-1">
                    Chart settings
                  </h3>
                  <p className="text-xs text-text-secondary mb-3">
                    Pick what the chart below plots and how to break it down.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-text-secondary">
                        Metric
                      </label>
                      <Select
                        value={metric}
                        onChange={(e) =>
                          setMetric(e.target.value as AnalyticsMetric)
                        }
                        options={toSelectOptions(ANALYTICS_METRIC_OPTIONS)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-text-secondary">
                        Group by
                      </label>
                      <Select
                        value={groupBy}
                        onChange={(e) =>
                          setGroupBy(e.target.value as AnalyticsGroupBy)
                        }
                        options={toSelectOptions(ANALYTICS_GROUP_BY_OPTIONS)}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-text-primary mb-1">
                    Filters
                  </h3>
                  <p className="text-xs text-text-secondary mb-3">
                    Narrow what counts toward the totals above and the chart
                    below.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-text-secondary">
                        Request type
                      </label>
                      <Select
                        value={modality}
                        onChange={(e) =>
                          setModality(e.target.value as AnalyticsModality | "")
                        }
                        options={toSelectOptions(ANALYTICS_MODALITY_OPTIONS)}
                        placeholder="All request types"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-text-secondary">
                        Provider
                      </label>
                      <Select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        options={PROVIDES_OPTIONS}
                        placeholder="All providers"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-4 items-end mt-4">
                    <MonthYearPicker
                      label="From month"
                      value={fromMonth}
                      onChange={setFromMonth}
                    />
                    <MonthYearPicker
                      label="To month"
                      value={toMonth}
                      onChange={setToMonth}
                    />
                    {(fromMonth || toMonth) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFromMonth("");
                          setToMonth("");
                        }}
                        className="text-status-error-text border-status-error-border hover:bg-status-error-bg gap-1.5 text-[13px]"
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                        Clear dates
                      </Button>
                    )}
                  </div>
                </section>
              </div>

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
          )}
        </div>
      </div>
    </div>
  );
}
