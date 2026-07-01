"use client";

import { Button } from "@/app/components/ui";
import { EyeIcon } from "@/app/components/icons";
import DownloadDropdown from "./DownloadDropdown";
import {
  formatStatusLabel,
  getResultTone,
  hasViewableResults,
  isCompletedStatus,
  isFailedStatus,
} from "@/app/lib/assessment/results";
import { STATUS_BADGE_CLASSES } from "@/app/lib/assessment/constants";
import type {
  AssessmentChildRun,
  ExportFormat,
} from "@/app/lib/types/assessment";

interface ChildRunActionsProps {
  childRun: AssessmentChildRun;
  previewLabel: string;
  isResuming: boolean;
  isRerunning: boolean;
  downloadingId: string | null;
  onPreview: (runId: number, label: string) => void;
  onRunDownload: (runId: number, format: ExportFormat) => void;
  onResume: (run: AssessmentChildRun) => void;
  onRerun: (run: AssessmentChildRun) => void;
}

export default function ChildRunActions({
  childRun,
  previewLabel,
  isResuming,
  isRerunning,
  downloadingId,
  onPreview,
  onRunDownload,
  onResume,
  onRerun,
}: ChildRunActionsProps) {
  const childStatusClass = STATUS_BADGE_CLASSES[getResultTone(childRun.status)];
  const isFailedChild = isFailedStatus(childRun.status);
  const isCompletedChild = isCompletedStatus(childRun.status);
  const canPreview = hasViewableResults(childRun);
  const canResume = Boolean(childRun.stage);

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <span
        className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${childStatusClass}`}
      >
        {formatStatusLabel(childRun.status)}
      </span>
      {canPreview && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPreview(childRun.id, previewLabel)}
          className="!rounded-md !px-2.5 !py-1.5 !text-xs"
        >
          <EyeIcon className="w-3.5 h-3.5" />
          Preview
        </Button>
      )}
      {isCompletedChild && (
        <DownloadDropdown
          onDownload={(fmt) => onRunDownload(childRun.id, fmt)}
          loading={downloadingId === `run-${childRun.id}`}
        />
      )}
      {isFailedChild && canResume && (
        <Button
          type="button"
          size="sm"
          onClick={() => onResume(childRun)}
          disabled={isResuming || isRerunning}
          className="!rounded-lg !px-3 !py-1.5 !text-xs"
        >
          {isResuming ? "Resuming..." : "Retry from failed stage"}
        </Button>
      )}
      {isFailedChild && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onRerun(childRun)}
          disabled={isRerunning || isResuming}
          className="!rounded-lg !px-3 !py-1.5 !text-xs"
        >
          {isRerunning ? "Re-running..." : "Retry all"}
        </Button>
      )}
    </div>
  );
}
