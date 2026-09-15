"use client";

import ChildRunStageProgress from "@/app/components/assessment/ChildRunStageProgress";
import {
  ASSESSMENT_CARD_CLASSES,
  STATUS_BADGE_CLASSES,
} from "@/app/lib/assessment/constants";
import { formatStatusLabel, getResultTone } from "@/app/lib/assessment/results";
import RunRowActions from "./RunRowActions";
import RunRowMeta from "./RunRowMeta";
import type { HomeRunRow, ResultsTarget } from "@/app/lib/types/assessment";

interface RunRowProps {
  row: HomeRunRow;
  isExporting: boolean;
  onExport: (target: ResultsTarget, fileName: string) => void;
}

export default function RunRow({
  row,
  isExporting,
  onExport,
}: RunRowProps) {
  const { assessment, stages, isActive } = row;
  const tone = getResultTone(assessment.status);

  return (
    <article
      className={`rounded-lg border border-l-[3px] border-border bg-bg-primary px-4 py-3 ${ASSESSMENT_CARD_CLASSES[tone]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-semibold text-text-primary">
          {assessment.experiment_name}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${STATUS_BADGE_CLASSES[tone]}`}
        >
          {formatStatusLabel(assessment.status)}
        </span>
      </div>

      <RunRowMeta row={row} />

      {assessment.error && (
        <p className="mt-1.5 text-xs text-status-error-text">
          {assessment.error}
        </p>
      )}

      {isActive && stages.length > 0 && (
        <div className="mt-2.5">
          <ChildRunStageProgress stages={stages} />
        </div>
      )}

      <RunRowActions
        row={row}
        isExporting={isExporting}
        onExport={onExport}
      />
    </article>
  );
}
