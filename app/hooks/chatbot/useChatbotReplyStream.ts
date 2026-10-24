"use client";

import { useEffect, useRef } from "react";
import { ChatbotSessionEvent } from "@/app/lib/types/chatbot";

/**
 * Keeps an SSE connection to the webhook stream for one chatbot session and
 * calls `onEvent` for every reply Kaapi delivers. A new connection only gets
 * replies from then on; EventSource reconnects on its own and resumes via
 * `Last-Event-ID`.
 */
export function useChatbotReplyStream(
  sessionId: string | null,
  onEvent: (event: ChatbotSessionEvent) => void,
) {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    if (!sessionId || typeof EventSource === "undefined") return;
    const params = new URLSearchParams({ session_id: sessionId });
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
