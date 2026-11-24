"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useChatbotPendingReply(
  timeoutMs: number,
  onTimeout: () => void,
) {
  const [isPending, setIsPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  });

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setIsPending(false);
  }, []);

  const start = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPending(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setIsPending(false);
      onTimeoutRef.current();
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => clear, [clear]);

  return { isPending, start, clear };
}
