"use client";

import { Fragment } from "react";
import { Button } from "@/app/components/ui";
import { EyeIcon } from "@/app/components/icons";
import { useToast } from "@/app/hooks/useToast";
import {
  formatStatusLabel,
  getResultTone,
  getStageProgress,
  hasViewableResults,
  isCompletedStatus,
  isFailedStatus,
} from "@/app/lib/assessment/results";
import { STATUS_BADGE_CLASSES } from "@/app/lib/assessment/constants";
import { formatRelativeTime } from "@/app/lib/utils";
import type {
  AssessmentChildRun,
  ConfigRunDetail,
  ExportFormat,
  PostProcessingConfig,
} from "@/app/lib/types/assessment";
import DownloadDropdown from "./DownloadDropdown";
import PostProcessingPanel from "./PostProcessingPanel";

interface RunResultCardProps {
  childRun: AssessmentChildRun;
  configDetailsByKey: Record<string, ConfigRunDetail>;
  configLoadingKeys: Record<string, boolean>;
  configErrorKeys: Record<string, string>;
  rerunningId: number | null;
  resumingId: number | null;
  downloadingId: string | null;
  onPreview: (runId: number, label: string) => void;
  onDownload: (runId: number, format: ExportFormat) => void;
  onRerun: (childRun: AssessmentChildRun) => void;
  onResume: (childRun: AssessmentChildRun) => void;
  onSavePostProcessing: (
    runId: number,
    config: PostProcessingConfig,
  ) => Promise<void>;
  onFetchColumns: (runId: number) => Promise<string[]>;
}

function StageProgressStrip({
  stages,
}: {
  stages: ReturnType<typeof getStageProgress>;
}) {
  return (
    <div className="mt-3 flex items-center">
      {stages.map((s, i) => {
        const done = s.status === "completed";
        const failed = s.status === "failed";
        const active = s.status === "processing";
        const nodeClass = done
          ? "bg-status-success border-status-success text-white"
          : failed
            ? "bg-status-error border-status-error text-white"
            : active
              ? "border-status-warning text-status-warning-text"
              : "border-border text-text-secondary";
        const labelClass = done
          ? "text-text-primary"
          : active
            ? "text-status-warning-text"
            : failed
              ? "text-status-error-text"
              : "text-text-secondary";
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
                className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold leading-none ${nodeClass} ${active ? "animate-pulse" : ""}`}
              >
                {done ? "✓" : failed ? "✗" : active ? "●" : ""}
              </span>
              <span className={`text-[11px] font-medium ${labelClass}`}>
                {s.label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

export default function RunResultCard({
  childRun,
  configDetailsByKey,
  configLoadingKeys,
  configErrorKeys,
  rerunningId,
  resumingId,
  downloadingId,
  onPreview,
  onDownload,
  onRerun,
  onResume,
  onSavePostProcessing,
  onFetchColumns,
}: RunResultCardProps) {
  const toast = useToast();
  const childStatusClass = STATUS_BADGE_CLASSES[getResultTone(childRun.status)];
  const isFailedChild = isFailedStatus(childRun.status);
  const isCompletedChild = isCompletedStatus(childRun.status);
  const stageProgress = getStageProgress(childRun);
  const canPreview = hasViewableResults(childRun);
  const isRerunning = rerunningId === childRun.id;
  const isResuming = resumingId === childRun.id;
  const canResume = Boolean(childRun.stage);
  const configKey =
    childRun.config_id && childRun.config_version
      ? `${childRun.config_id}:${childRun.config_version}`
      : null;
  const configDetail = configKey ? configDetailsByKey[configKey] : null;
  const isConfigLoading = configKey
    ? Boolean(configLoadingKeys[configKey])
    : false;
  const configError = configKey ? configErrorKeys[configKey] : null;
  const fallbackName = childRun.config_id
    ? `Config ${childRun.config_id.slice(0, 8)}`
    : "Configuration";
  const configName = configDetail?.name || fallbackName;
  const previewLabel = `${configName}${childRun.config_version ? ` v${childRun.config_version}` : ""}`;

  return (
    <div>
      <div className="rounded-xl border border-border bg-bg-secondary p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">
                {configName}
              </span>
              {childRun.config_version !== null && (
                <span className="rounded-full bg-bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                  v{childRun.config_version}
                </span>
              )}
              {configDetail?.provider && configDetail?.model && (
                <span className="rounded-full bg-bg-primary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                  {configDetail.provider}/{configDetail.model}
                </span>
              )}
            </div>

            <div className="mt-1 text-sm text-text-secondary">
              {isConfigLoading
                ? "Loading configuration details..."
                : configDetail?.description ||
                  configDetail?.commitMessage ||
                  "No description available for this configuration."}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
              <span>{childRun.total_items} items</span>
              {childRun.updated_at && (
                <span>{formatRelativeTime(childRun.updated_at)}</span>
              )}
              {childRun.config_id && (
                <span className="font-mono">
                  ID {childRun.config_id.slice(0, 8)}
                </span>
              )}
            </div>
            {childRun.prefilter_total_rows != null && (
              <div className="mt-1.5 text-xs text-text-secondary">
                Prefilter: {childRun.prefilter_total_passed ?? 0}/
                {childRun.prefilter_total_rows} passed
                {childRun.prefilter_total_rejected != null &&
                  childRun.prefilter_total_rejected > 0 && (
                    <span className="ml-1 text-status-warning-text">
                      · {childRun.prefilter_total_rejected} rejected
                    </span>
                  )}
              </div>
            )}

            {stageProgress.length > 0 && (
              <StageProgressStrip stages={stageProgress} />
            )}

            {configError && (
              <div className="mt-2 text-xs text-status-error-text">
                {configError}
              </div>
            )}
            {isFailedChild && childRun.error_message && (
              <div className="mt-2 text-xs text-status-error-text">
                {childRun.error_message}
              </div>
            )}
          </div>

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
                onDownload={(fmt) => onDownload(childRun.id, fmt)}
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
        </div>
      </div>
      {isCompletedChild && (
        <PostProcessingPanel
          availableColumns={[]}
          initialConfig={childRun.post_processing_config ?? null}
          fetchColumns={() => onFetchColumns(childRun.id)}
          onSave={async (cfg: PostProcessingConfig) => {
            await onSavePostProcessing(childRun.id, cfg);
            toast.success(
              "Post-processing saved. Re-open preview to see updated results.",
            );
          }}
        />
      )}
    </div>
  );
}
