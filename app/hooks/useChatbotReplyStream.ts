"use client";

import { useEffect, useRef } from "react";
import { ChatbotSessionEvent } from "@/app/lib/types/chatbot";

/**
 * Keeps an SSE connection to the webhook stream for one chatbot session and
 * calls `onEvent` for every reply Kaapi delivers. EventSource reconnects on
 * its own and resumes via `Last-Event-ID`; `getAfterSeq` skips replies the
 * page already applied before a reload.
 */
export function useChatbotReplyStream(
  sessionId: string | null,
  getAfterSeq: () => number,
  onEvent: (event: ChatbotSessionEvent) => void,
) {
  // Latest callbacks without reopening the stream on every render.
  const onEventRef = useRef(onEvent);
  const getAfterSeqRef = useRef(getAfterSeq);
  useEffect(() => {
    onEventRef.current = onEvent;
    getAfterSeqRef.current = getAfterSeq;
  });

  useEffect(() => {
    if (!sessionId || typeof EventSource === "undefined") return;
    const params = new URLSearchParams({
      session_id: sessionId,
      after: String(getAfterSeqRef.current()),
    });
    const source = new EventSource(`/api/webhooks/chatbot/stream?${params}`);
    source.addEventListener("reply", (e) => {
      try {
        onEventRef.current(
          JSON.parse((e as MessageEvent).data) as ChatbotSessionEvent,
        );
      } catch (err) {
        console.error("chatbot SSE parse error:", err);
      }
    });
    return () => source.close();
  }, [sessionId]);
}
