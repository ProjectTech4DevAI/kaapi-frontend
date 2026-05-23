"use client";

import { ReactNode } from "react";
import { InfoTooltip, Loader } from "@/app/components/ui";
import { AnalyticsTotalsMap } from "@/app/hooks/useAnalyticsTotals";

interface AnalyticsTotalsRowProps {
  totals: AnalyticsTotalsMap | null;
  isLoading: boolean;
  error: string | null;
}

function formatTokens(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function AnalyticsTotalsRow({
  totals,
  isLoading,
  error,
}: AnalyticsTotalsRowProps) {
  if (isLoading && !totals) {
    return (
      <div className="rounded-2xl bg-bg-primary p-6 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-center min-h-[120px]">
        <Loader size="md" message="Loading totals…" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl bg-bg-primary p-6 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] text-center">
        <p className="text-sm text-status-error-text">{error}</p>
      </div>
    );
  }
  if (!totals) return null;

  return (
    <div className="rounded-2xl bg-bg-primary p-5 sm:p-6 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-text-primary tracking-tight">
          All-time totals
        </h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Aggregated across the selected filter window. Each card is one backend
          metric — they do not add up to one another.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        <StatCard
          label="Requests"
          value={formatCount(totals.requests.value)}
          tooltip="Number of production LLM calls and LLM chain executions in the filter window. Backend metric: requests."
        />
        <StatCard
          label="LLM cost"
          value={formatCurrency(totals.cost.value)}
          hint={`${formatTokens(totals.cost.totalTokens)} production tokens`}
          tooltip={
            <>
              USD spent on <strong>production</strong> LLM calls (not evals) in
              the filter window. Backend metric: <strong>cost</strong>. The hint
              shows the tokens billed for these calls.
            </>
          }
        />
        <StatCard
          label="Eval runs"
          value={formatCount(totals.eval_runs.value)}
          tooltip="Number of evaluation runs executed in the filter window. Backend metric: eval_runs."
        />
        <StatCard
          label="Eval cost"
          value={formatCurrency(totals.eval_cost.value)}
          hint={`${formatTokens(totals.eval_cost.totalTokens)} eval tokens`}
          tooltip={
            <>
              USD spent on LLM calls made by <strong>eval runs</strong> in the
              filter window. Backend metric: <strong>eval_cost</strong>. The
              hint shows the tokens billed for these eval calls.
            </>
          }
        />
        <StatCard
          label="Production tokens"
          value={formatTokens(totals.cost.totalTokens)}
          hint={`${formatCount(totals.cost.inputTokens)} in · ${formatCount(totals.cost.outputTokens)} out`}
          tooltip="Tokens consumed by production LLM calls in the filter window. Pulled from the cost metric response."
        />
        <StatCard
          label="Eval tokens"
          value={formatTokens(totals.eval_cost.totalTokens)}
          hint={`${formatCount(totals.eval_cost.inputTokens)} in · ${formatCount(totals.eval_cost.outputTokens)} out`}
          tooltip="Tokens consumed by eval LLM calls in the filter window. Pulled from the eval_cost metric response."
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tooltip,
}: {
  label: string;
  value: string;
  hint?: string;
  tooltip?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-bg-secondary/40 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary mb-2 inline-flex items-center">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </p>
      <p className="text-2xl font-semibold text-text-primary tabular-nums tracking-tight">
        {value}
      </p>
      {hint && (
        <p className="text-[11px] text-text-secondary mt-1 tabular-nums">
          {hint}
        </p>
      )}
    </div>
  );
}
