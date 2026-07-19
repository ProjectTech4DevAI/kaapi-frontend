"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/apiClient";
import { invalidateConfigCache } from "@/app/lib/utils";
import { useToast } from "@/app/hooks/useToast";
import type {
  IterateSettle,
  JobSnapshotLike,
  LLMJobImmediatePublic,
  UsePromptImprovementArgs,
  UsePromptImprovementResult,
} from "@/app/lib/types/promptImprovement";

/** Map a sync validation code (from the initial 202 request) to a user-facing message. */
function iteratePromptSyncError(code: string): string {
  switch (code) {
    case "evaluation_not_found":
      return "Evaluation not found";
    case "evaluation_not_completed":
      return "Prompt iteration is only available for completed evaluations";
    case "source_config_unavailable":
      return "Source config is no longer available for this evaluation";
    case "traces_not_available":
      return "Evaluation traces aren't available yet — try Resync first";
    case "invalid_callback_url":
      return "Frontend callback URL is invalid. Set NEXT_PUBLIC_APP_URL to a public HTTPS host.";
    case "prompt_improvement_enqueue_failed":
      return "Backend couldn't queue the improvement job. Retry in a moment.";
    default:
      return code || "Failed to queue prompt iteration";
  }
}

function readSnapshot(snap: JobSnapshotLike, settle: IterateSettle): boolean {
  if (snap.status === "SUCCESS") {
    if (!snap.config_version) {
      settle({
        status: "FAILED",
        message: "Backend reported SUCCESS without a config version.",
      });
      return true;
    }
    settle({ status: "SUCCESS", version: snap.config_version });
    return true;
  }
  if (snap.status === "FAILED") {
    settle({ status: "FAILED", message: snap.error_message ?? null });
    return true;
  }
  return false;
}

/**
 * Owns the async prompt-improvement flow for an evaluation: fires the initial
 * POST, keeps a live channel open (SSE first, poll fallback), settles on
 * SUCCESS/FAILED, and navigates to the new config version. Cleans up any
 * open interval / EventSource on unmount.
 */
export function usePromptImprovement({
  jobId,
  apiKey,
  isAuthenticated,
}: UsePromptImprovementArgs): UsePromptImprovementResult {
  const router = useRouter();
  const toast = useToast();
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const stopWatch = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
  }, []);

  useEffect(() => () => stopWatch(), [stopWatch]);

  const pollJob = useCallback(
    (pollJobId: string, settle: IterateSettle) => {
      const tick = async () => {
        try {
          const res = await fetch(
            `/api/webhooks/prompt-improvement?job_id=${encodeURIComponent(pollJobId)}`,
          );
          if (res.status === 404 || !res.ok) return;
          const body = (await res.json()) as {
            success: boolean;
            data?: JobSnapshotLike;
          };
          if (
            body.data &&
            readSnapshot(body.data, (result) => {
              stopWatch();
              settle(result);
            })
          ) {
            // terminal — stopWatch already ran
          }
        } catch (e) {
          console.error("iterate poll error:", e);
        }
      };
      tick();
      pollRef.current = setInterval(tick, 3000);
    },
    [stopWatch],
  );

  const watchJob = useCallback(
    (watchJobId: string, settle: IterateSettle) => {
      if (typeof window === "undefined" || typeof EventSource === "undefined") {
        pollJob(watchJobId, settle);
        return;
      }
      const source = new EventSource(
        `/api/webhooks/prompt-improvement/stream?job_id=${encodeURIComponent(watchJobId)}`,
      );
      sourceRef.current = source;
      let fellBack = false;
      const doFallback = () => {
        if (fellBack) return;
        fellBack = true;
        source.close();
        sourceRef.current = null;
        pollJob(watchJobId, settle);
      };
      source.addEventListener("snapshot", (e) => {
        try {
          const snap = JSON.parse((e as MessageEvent).data) as JobSnapshotLike;
          readSnapshot(snap, (result) => {
            stopWatch();
            settle(result);
          });
        } catch (err) {
          console.error("iterate SSE parse error:", err);
        }
      });
      source.addEventListener("error", () => {
        // CLOSED = server hung up. CONNECTING = browser is retrying, leave it.
        if (source.readyState === EventSource.CLOSED) doFallback();
      });
    },
    [pollJob, stopWatch],
  );

  const settleIteration: IterateSettle = useCallback(
    (result) => {
      setIsImprovingPrompt(false);
      if (result.status === "SUCCESS") {
        invalidateConfigCache();
        toast.success("Prompt iteration ready");
        const cfg = result.version;
        if (cfg.config_id) {
          router.push(
            `/configurations/prompt-editor?config=${encodeURIComponent(
              cfg.config_id,
            )}&version=${cfg.version}&from=evaluations`,
          );
        }
        return;
      }
      toast.error(
        result.message
          ? `Prompt iteration failed: ${result.message}`
          : "Prompt iteration failed",
      );
    },
    [router, toast],
  );

  const handleIteratePrompt = useCallback(async () => {
    if (!isAuthenticated || !jobId) return;
    stopWatch();
    setIsImprovingPrompt(true);
    try {
      const data = await apiFetch<{
        success: boolean;
        error?: string;
        data?: LLMJobImmediatePublic | null;
      }>(`/api/evaluations/${jobId}/improve-prompt`, apiKey, {
        method: "POST",
        body: JSON.stringify({}),
      });

      if (!data.success || !data.data?.job_id) {
        toast.error(iteratePromptSyncError(data.error || ""));
        setIsImprovingPrompt(false);
        return;
      }
      watchJob(data.data.job_id, settleIteration);
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : String(err);
      toast.error(iteratePromptSyncError(code));
      setIsImprovingPrompt(false);
    }
  }, [
    isAuthenticated,
    jobId,
    apiKey,
    stopWatch,
    toast,
    watchJob,
    settleIteration,
  ]);

  return { isImprovingPrompt, handleIteratePrompt };
}
