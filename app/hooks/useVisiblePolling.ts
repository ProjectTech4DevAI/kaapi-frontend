"use client";

import { useEffect, useRef } from "react";
import type { UsePollingOptions } from "@/app/lib/types/pagination";

export function useVisiblePolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  {
    enabled = true,
    pauseWhenHidden = true,
    refetchOnVisible = true,
  }: UsePollingOptions = {},
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;
    let interval: ReturnType<typeof setInterval> | null = null;

    const tick = () => void callbackRef.current();
    const stop = () => {
      if (interval !== null) clearInterval(interval);
      interval = null;
    };
    const start = () => {
      stop();
      interval = setInterval(tick, intervalMs);
    };
    const isHidden = () =>
      pauseWhenHidden && document.visibilityState === "hidden";
    const onVisibilityChange = () => {
      if (isHidden()) {
        stop();
        return;
      }
      if (refetchOnVisible) tick();
      start();
    };

    if (!isHidden()) start();
    if (pauseWhenHidden) {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, intervalMs, pauseWhenHidden, refetchOnVisible]);
}
