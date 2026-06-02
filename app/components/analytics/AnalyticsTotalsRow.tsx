"use client";

import { ReactNode } from "react";
import { InfoTooltip, Loader } from "@/app/components/ui";
import { AnalyticsTotalsRowProps } from "@/app/lib/types/analytics";

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
    <div className="rounded-2xl bg-bg-primary p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-text-primary tracking-tight">
          All-time totals
        </h3>
        <p className="text-[11px] text-text-secondary">
          Each row pairs <strong>production</strong> with <strong>eval</strong>.
        </p>
      </div>

      <TotalsSection title="Cost & spend" accent="cost">
        <StatCard
          accent="cost"
          label="Production cost"
          value={formatCurrency(totals.cost.value)}
          hint="LLM calls (not evals)"
          tooltip={
            <>
              USD spent on <strong>production</strong> LLM calls in the filter
              window. Backend metric: <strong>cost</strong>.
            </>
          }
        />
        <StatCard
          accent="cost"
          label="Eval cost"
          value={formatCurrency(totals.eval_cost.value)}
          hint="LLM calls from eval runs"
          tooltip={
            <>
              USD spent on LLM calls made by <strong>eval runs</strong>. Backend
              metric: <strong>eval_cost</strong>.
            </>
          }
        />
      </TotalsSection>

      <TotalsSection title="Token usage" accent="usage">
        <StatCard
          accent="usage"
          label="Production tokens"
          value={`${formatTokens(totals.cost.totalTokens)} tokens`}
          hint={`${formatCount(totals.cost.inputTokens)} in · ${formatCount(totals.cost.outputTokens)} out`}
          tooltip="Tokens consumed by production LLM calls. Pulled from the cost metric response."
        />
        <StatCard
          accent="usage"
          label="Eval tokens"
          value={`${formatTokens(totals.eval_cost.totalTokens)} tokens`}
          hint={`${formatCount(totals.eval_cost.inputTokens)} in · ${formatCount(totals.eval_cost.outputTokens)} out`}
          tooltip="Tokens consumed by eval LLM calls. Pulled from the eval_cost metric response."
        />
      </TotalsSection>

      <TotalsSection title="Activity" accent="activity">
        <StatCard
          accent="activity"
          label="Production requests"
          value={formatCount(totals.requests.value)}
          hint="LLM call + LLM chain executions"
          tooltip="Number of production LLM calls and LLM chain executions in the filter window. Backend metric: requests."
        />
        <StatCard
          accent="activity"
          label="Eval runs"
          value={formatCount(totals.eval_runs.value)}
          hint="Evaluation batches executed"
          tooltip="Number of evaluation runs executed in the filter window. Backend metric: eval_runs."
        />
      </TotalsSection>
    </div>
  );
}

type Accent = "cost" | "usage" | "activity";

const ACCENT_DOT: Record<Accent, string> = {
  cost: "bg-status-success",
  usage: "bg-accent-primary",
  activity: "bg-status-warning",
};

const ACCENT_CARD: Record<Accent, string> = {
  cost: "bg-status-success-bg/40 border-status-success-border/40",
  usage: "bg-accent-primary/5 border-accent-primary/20",
  activity: "bg-status-warning-bg/40 border-status-warning-border/40",
};

function TotalsSection({
  title,
  accent,
  children,
}: {
  title: string;
  accent: Accent;
  children: ReactNode;
}) {
  return (
    <section>
      <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary mb-1.5">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${ACCENT_DOT[accent]}`}
        />
        {title}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
  tooltip,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  tooltip?: ReactNode;
  accent: Accent;
}) {
  return (
    <div className={`rounded-lg border p-3 ${ACCENT_CARD[accent]}`}>
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-text-secondary mb-1 inline-flex items-center">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </p>
      <p className="text-xl font-semibold text-text-primary tabular-nums tracking-tight leading-tight">
        {value}
      </p>
      {hint && (
        <p className="text-[11px] text-text-secondary mt-0.5 tabular-nums">
          {hint}
        </p>
      )}
    </div>
  );
}
