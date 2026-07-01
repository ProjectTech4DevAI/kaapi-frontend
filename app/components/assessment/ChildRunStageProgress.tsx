import { Fragment } from "react";
import type {
  StageProgress,
  StageProgressStatus,
} from "@/app/lib/assessment/results";

interface ChildRunStageProgressProps {
  stages: StageProgress[];
}

const nodeClass: Record<StageProgressStatus, string> = {
  completed: "bg-status-success border-status-success text-white",
  failed: "bg-status-error border-status-error text-white",
  processing: "border-status-warning text-status-warning-text",
  pending: "border-border text-text-secondary",
};

const labelClass: Record<StageProgressStatus, string> = {
  completed: "text-text-primary",
  processing: "text-status-warning-text",
  failed: "text-status-error-text",
  pending: "text-text-secondary",
};

const nodeSymbol: Record<StageProgressStatus, string> = {
  completed: "✓",
  failed: "✗",
  processing: "●",
  pending: "",
};

export default function ChildRunStageProgress({
  stages,
}: ChildRunStageProgressProps) {
  if (stages.length === 0) return null;

  return (
    <div className="mt-3 flex items-center">
      {stages.map((s, i) => {
        const prevDone = i > 0 && stages[i - 1].status === "completed";
        return (
          <Fragment key={s.stage}>
            {i > 0 && (
              <div
                className={`h-px w-6 ${prevDone ? "bg-status-success" : "bg-border"}`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold leading-none ${nodeClass[s.status]} ${
                  s.status === "processing" ? "animate-pulse" : ""
                }`}
              >
                {nodeSymbol[s.status]}
              </span>
              <span
                className={`text-[11px] font-medium ${labelClass[s.status]}`}
              >
                {s.label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
