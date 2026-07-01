"use client";

import { useCallback, useState } from "react";
import { getAsyncErrorMessage } from "@/app/lib/assessment/results";
import type { ExportFormat } from "@/app/lib/types/assessment";
import type { ToastContextType } from "@/app/lib/types/toast";

interface UseAssessmentDownloadParams {
  apiKey: string;
  isAuthenticated: boolean;
  onForbidden?: () => void;
  toast: ToastContextType;
}

export default function useAssessmentDownload({
  apiKey,
  isAuthenticated,
  onForbidden,
  toast,
}: UseAssessmentDownloadParams) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const buildAuthHeaders = useCallback(() => {
    const headers = new Headers();
    if (apiKey) headers.set("X-API-KEY", apiKey);
    return headers;
  }, [apiKey]);

  const triggerDownload = useCallback(
    async (url: string, format: ExportFormat, key: string) => {
      if (!isAuthenticated) return;
      setDownloadingId(key);
      try {
        const response = await fetch(`${url}?export_format=${format}`, {
          headers: buildAuthHeaders(),
          credentials: "include",
        });
        if (response.status === 403) {
          onForbidden?.();
          return;
        }
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            err.error ||
              err.message ||
              err.detail ||
              `Export failed (${response.status})`,
          );
        }
        const blob = await response.blob();
        const disposition = response.headers.get("content-disposition") || "";
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
        const filename = filenameMatch?.[1] || `export.${format}`;

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
        toast.success("Download started");
      } catch (error) {
        toast.error(getAsyncErrorMessage("Export failed", error));
      } finally {
        setDownloadingId(null);
      }
    },
    [buildAuthHeaders, isAuthenticated, onForbidden, toast],
  );

  const handleAssessmentDownload = useCallback(
    (assessmentId: number, format: ExportFormat) =>
      triggerDownload(
        `/api/assessment/assessments/${assessmentId}/results`,
        format,
        `assessment-${assessmentId}`,
      ),
    [triggerDownload],
  );

  const handleRunDownload = useCallback(
    (runId: number, format: ExportFormat) =>
      triggerDownload(
        `/api/assessment/runs/${runId}/results`,
        format,
        `run-${runId}`,
      ),
    [triggerDownload],
  );

  return { downloadingId, handleAssessmentDownload, handleRunDownload };
}
