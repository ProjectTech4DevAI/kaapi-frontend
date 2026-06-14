"use client";

import { RunMode } from "@/app/lib/types/evaluation";

interface RunModeBadgeProps {
  runMode?: RunMode;
  size?: "sm" | "md";
}

export default function RunModeBadge({
  runMode,
  size = "sm",
}: RunModeBadgeProps) {
  if (!runMode) return null;
  const isFast = runMode === "fast";
  const padding =
    size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";
  const colour = isFast
    ? "bg-accent-secondary text-text-primary"
    : "bg-accent-primary/10 text-accent-primary";
  return (
    <span
      className={`inline-flex items-center shrink-0 rounded-full font-semibold uppercase tracking-wide ${padding} ${colour}`}
      title={isFast ? "Fast mode" : "Batch mode"}
    >
      {isFast ? "Fast" : "Batch"}
    </span>
  );
}
