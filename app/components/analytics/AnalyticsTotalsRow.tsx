"use client";

import { ReactNode } from "react";
import { InfoTooltip, Loader } from "@/app/components/ui";
import {
  AnalyticsCardAccent,
  AnalyticsTotalsRowProps,
} from "@/app/lib/types/analytics";

const ACCENT_CARD: Record<AnalyticsCardAccent, string> = {
  cost: "bg-status-success-bg/40 border-status-success-border/40",
  usage: "bg-accent-primary/5 border-accent-primary/20",
  activity: "bg-status-warning-bg/40 border-status-warning-border/40",
};

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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <StatCard
          accent="cost"
          label="AI cost"
          value={formatCurrency(totals.cost.value)}
          hint="Real users using your AI"
          tooltip="Money spent on AI requests made by your real users (excludes any testing or quality checks you ran)."
        />
        <StatCard
          accent="usage"
          label="AI usage tokens"
          value={`${formatTokens(totals.cost.totalTokens)} tokens`}
          hint={`${formatCount(totals.cost.inputTokens)} in · ${formatCount(totals.cost.outputTokens)} out`}
          tooltip="The amount of text your AI processed for real users. Tokens are how AI providers measure work and bill you — roughly one word ≈ 1.3 tokens."
        />
        <StatCard
          accent="activity"
          label="AI requests"
          value={formatCount(totals.requests.value)}
          hint="Real-user AI requests"
          tooltip="How many times your real users asked the AI to do something."
        />
        <StatCard
          accent="cost"
          label="Eval cost"
          value={formatCurrency(totals.eval_cost.value)}
          hint="Evaluations you ran"
          tooltip="Money spent on AI requests used for running evaluations (separate from user activity)."
        />
        <StatCard
          accent="usage"
          label="Eval tokens"
          value={`${formatTokens(totals.eval_cost.totalTokens)} tokens`}
          hint={`${formatCount(totals.eval_cost.inputTokens)} in · ${formatCount(totals.eval_cost.outputTokens)} out`}
          tooltip="The amount of text processed during your evaluations. Tokens are how AI providers measure work and bill you."
        />
        <StatCard
          accent="activity"
          label="Eval runs"
          value={formatCount(totals.eval_runs.value)}
          hint="Eval-run activity"
          tooltip="How many times you ran an evaluation on your AI. Each run can test it on many cases at once."
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
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  tooltip?: ReactNode;
  accent: AnalyticsCardAccent;
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
