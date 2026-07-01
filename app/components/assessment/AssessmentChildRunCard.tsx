"use client";

import { useToast } from "@/app/hooks/useToast";
import PostProcessingPanel from "./PostProcessingPanel";
import ChildRunStageProgress from "./ChildRunStageProgress";
import ChildRunActions from "./ChildRunActions";
import {
  getStageProgress,
  isCompletedStatus,
  isFailedStatus,
} from "@/app/lib/assessment/results";
import { formatRelativeTime } from "@/app/lib/utils";
import type {
  AssessmentChildRun,
  ConfigRunDetail,
  ExportFormat,
  PostProcessingConfig,
} from "@/app/lib/types/assessment";

interface AssessmentChildRunCardProps {
  childRun: AssessmentChildRun;
  configDetailsByKey: Record<string, ConfigRunDetail>;
  configLoadingKeys: Record<string, boolean>;
  configErrorKeys: Record<string, string>;
  rerunningId: number | null;
  resumingId: number | null;
  downloadingId: string | null;
  onPreview: (runId: number, label: string) => void;
  onRunDownload: (runId: number, format: ExportFormat) => void;
  onResume: (run: AssessmentChildRun) => void;
  onRerun: (run: AssessmentChildRun) => void;
  onFetchRunColumns: (runId: number) => Promise<string[]>;
  onSavePostProcessing: (
    runId: number,
    config: PostProcessingConfig | null,
  ) => Promise<void>;
}

export default function AssessmentChildRunCard({
  childRun,
  configDetailsByKey,
  configLoadingKeys,
  configErrorKeys,
  rerunningId,
  resumingId,
  downloadingId,
  onPreview,
  onRunDownload,
  onResume,
  onRerun,
  onFetchRunColumns,
  onSavePostProcessing,
}: AssessmentChildRunCardProps) {
  const toast = useToast();

  const isFailedChild = isFailedStatus(childRun.status);
  const isCompletedChild = isCompletedStatus(childRun.status);
  const stageProgress = getStageProgress(childRun);
  const isRerunning = rerunningId === childRun.id;
  const isResuming = resumingId === childRun.id;
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

            <ChildRunStageProgress stages={stageProgress} />

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

          <ChildRunActions
            childRun={childRun}
            previewLabel={previewLabel}
            isResuming={isResuming}
            isRerunning={isRerunning}
            downloadingId={downloadingId}
            onPreview={onPreview}
            onRunDownload={onRunDownload}
            onResume={onResume}
            onRerun={onRerun}
          />
        </div>
      </div>
      {isCompletedChild && (
        <PostProcessingPanel
          availableColumns={[]}
          initialConfig={childRun.post_processing_config ?? null}
          fetchColumns={() => onFetchRunColumns(childRun.id)}
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
