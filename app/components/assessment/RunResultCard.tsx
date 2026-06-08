"use client";

import { Button } from "@/app/components/ui";
import { EyeIcon } from "@/app/components/icons";
import {
  formatStatusLabel,
  getResultTone,
  isCompletedStatus,
  isFailedStatus,
} from "@/app/lib/assessment/results";
import { STATUS_BADGE_CLASSES } from "@/app/lib/assessment/constants";
import { formatRelativeTime } from "@/app/lib/utils";
import type {
  AssessmentChildRun,
  ConfigRunDetail,
  ExportFormat,
} from "@/app/lib/types/assessment";
import DownloadDropdown from "./DownloadDropdown";
import LoadingSpinner from "./LoadingSpinner";

interface RunResultCardProps {
  childRun: AssessmentChildRun;
  configDetailsByKey: Record<string, ConfigRunDetail>;
  configLoadingKeys: Record<string, boolean>;
  configErrorKeys: Record<string, string>;
  rerunningId: number | null;
  previewLoading: number | null;
  downloadingId: string | null;
  onPreview: (runId: number, label: string) => void;
  onDownload: (runId: number, format: ExportFormat) => void;
  onRerun: (childRun: AssessmentChildRun) => void;
}

function RunResultInfo({
  childRun,
  configDetail,
  isConfigLoading,
  configError,
  isFailedChild,
  configName,
}: {
  childRun: AssessmentChildRun;
  configDetail: ConfigRunDetail | null;
  isConfigLoading: boolean;
  configError: string | null;
  isFailedChild: boolean;
  configName: string;
}) {
  return (
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
          <span className="font-mono">ID {childRun.config_id.slice(0, 8)}</span>
        )}
      </div>

      {configError && (
        <div className="mt-2 text-xs text-status-error-text">{configError}</div>
      )}
      {isFailedChild && childRun.error_message && (
        <div className="mt-2 text-xs text-status-error-text">
          {childRun.error_message}
        </div>
      )}
    </div>
  );
}

function RunResultActions({
  childRun,
  statusClass,
  isCompletedChild,
  isFailedChild,
  isPreviewLoading,
  isRerunning,
  isDownloading,
  previewLabel,
  onPreview,
  onDownload,
  onRerun,
}: {
  childRun: AssessmentChildRun;
  statusClass: string;
  isCompletedChild: boolean;
  isFailedChild: boolean;
  isPreviewLoading: boolean;
  isRerunning: boolean;
  isDownloading: boolean;
  previewLabel: string;
  onPreview: (runId: number, label: string) => void;
  onDownload: (runId: number, format: ExportFormat) => void;
  onRerun: (childRun: AssessmentChildRun) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <span
        className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${statusClass}`}
      >
        {formatStatusLabel(childRun.status)}
      </span>
      {isCompletedChild && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPreview(childRun.id, previewLabel)}
          disabled={isPreviewLoading}
          className={`!rounded-md !px-2.5 !py-1.5 !text-xs ${
            isPreviewLoading ? "opacity-50" : ""
          }`}
        >
          {isPreviewLoading ? (
            <LoadingSpinner className="w-3.5 h-3.5" />
          ) : (
            <EyeIcon className="w-3.5 h-3.5" />
          )}
          Preview
        </Button>
      )}
      {isCompletedChild && (
        <DownloadDropdown
          onDownload={(fmt) => onDownload(childRun.id, fmt)}
          loading={isDownloading}
        />
      )}
      {isFailedChild && (
        <Button
          type="button"
          size="sm"
          onClick={() => onRerun(childRun)}
          disabled={isRerunning}
          className="!rounded-lg !px-3 !py-1.5 !text-xs"
        >
          {isRerunning ? "Re-running..." : "Re-run"}
        </Button>
      )}
    </div>
  );
}

export default function RunResultCard({
  childRun,
  configDetailsByKey,
  configLoadingKeys,
  configErrorKeys,
  rerunningId,
  previewLoading,
  downloadingId,
  onPreview,
  onDownload,
  onRerun,
}: RunResultCardProps) {
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
  const isFailedChild = isFailedStatus(childRun.status);

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <div className="flex items-start justify-between gap-3">
        <RunResultInfo
          childRun={childRun}
          configDetail={configDetail}
          isConfigLoading={isConfigLoading}
          configError={configError}
          isFailedChild={isFailedChild}
          configName={configName}
        />
        <RunResultActions
          childRun={childRun}
          statusClass={STATUS_BADGE_CLASSES[getResultTone(childRun.status)]}
          isCompletedChild={isCompletedStatus(childRun.status)}
          isFailedChild={isFailedChild}
          isPreviewLoading={previewLoading === childRun.id}
          isRerunning={rerunningId === childRun.id}
          isDownloading={downloadingId === `run-${childRun.id}`}
          previewLabel={previewLabel}
          onPreview={onPreview}
          onDownload={onDownload}
          onRerun={onRerun}
        />
      </div>
    </div>
  );
}
