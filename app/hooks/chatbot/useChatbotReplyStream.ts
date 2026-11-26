"use client";

import { useEffect, useRef } from "react";
import { openEventStream } from "@/app/lib/eventStream";
import { ChatbotSessionEvent } from "@/app/lib/types/chatbot";

/**
 * Listens to live bot replies for one session. `onEvent` gets each reply and
 * its `seq` (used to skip duplicates after a reconnect).
 */
export function useChatbotReplyStream(
  sessionId: string | null,
  onEvent: (event: ChatbotSessionEvent, seq: number) => void,
) {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    if (!sessionId) return;
    const params = new URLSearchParams({ session_id: sessionId });
    return openEventStream<ChatbotSessionEvent>(
      `/api/webhooks/chatbot/stream?${params}`,
      "reply",
      (event, id) => onEventRef.current(event, Number(id)),
    );
  }, [sessionId]);
}
