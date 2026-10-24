"use client";

import {
  getVerdictBand,
  VERDICT_LABELS,
  VerdictBand,
} from "@/app/lib/utils/evaluation";

interface VerdictBadgeProps {
  value: number | string | null | undefined;
  dataType?: "NUMERIC" | "CATEGORICAL";
  name?: string;
  size?: "sm" | "md";
}

const VERDICT_CLASSES: Record<VerdictBand, string> = {
  good: "bg-status-success-bg text-status-success-text",
  needs_refinement: "bg-status-warning-bg text-status-warning-text",
  needs_improvement: "bg-status-error-bg text-status-error-text",
};

export default function VerdictBadge({
  value,
  dataType,
  name,
  size = "sm",
}: VerdictBadgeProps) {
  const band = getVerdictBand(value, dataType, name);
  if (!band) return null;

  const padding =
    size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center shrink-0 rounded-full font-semibold uppercase tracking-wide ${padding} ${VERDICT_CLASSES[band]}`}
    >
      {VERDICT_LABELS[band]}
    </span>
  );
}
