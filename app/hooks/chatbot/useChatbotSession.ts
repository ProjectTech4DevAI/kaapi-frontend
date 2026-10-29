"use client";

import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/hooks/useToast";
import { useChatbotReplyStream } from "@/app/hooks/chatbot/useChatbotReplyStream";
import { useChatbotPendingReply } from "@/app/hooks/chatbot/useChatbotPendingReply";
import { CHATBOT_REPLY_TIMEOUT_MS } from "@/app/lib/constants";
import {
  createChatbotSession,
  sendChatbotMessage,
} from "@/app/lib/chatbotClient";
import {
  ChatbotChatMessage,
  ChatbotCompletionStatus,
  ChatbotSessionEvent,
  ChatbotSessionStatus,
} from "@/app/lib/types/chatbot";

const INACTIVE_RE = /inactive/i;

export function useChatbotSession(chatbotId: string) {
  const { activeKey, currentUser } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const toast = useToast();
  const contactRef = currentUser?.id ? `kaapi-user-${currentUser.id}` : null;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatbotChatMessage[]>([]);
  const [status, setStatus] = useState<ChatbotSessionStatus | null>(null);
  const [completionStatus, setCompletionStatus] =
    useState<ChatbotCompletionStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const lastEventSeqRef = useRef(0);
  const pending = useChatbotPendingReply(CHATBOT_REPLY_TIMEOUT_MS, () =>
    toast.error("No reply from the chatbot yet. Try sending again."),
  );
  const { clear: clearPending, start: startPending } = pending;

  const handleEvent = useCallback(
    (event: ChatbotSessionEvent, seq: number) => {
      if (seq <= lastEventSeqRef.current) return; // already shown
      lastEventSeqRef.current = seq;
      clearPending();
      if (!event.success) {
        toast.error(event.error || "The chatbot couldn't reply.");
        return;
      }
      const reply = event.reply;
      if (reply) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: reply },
        ]);
      }
      if (event.status) setStatus(event.status);
      if (event.completionStatus) setCompletionStatus(event.completionStatus);
    },
    [clearPending, toast],
  );

  useChatbotReplyStream(sessionId, handleEvent);

  const startChat = useCallback(async (): Promise<void> => {
    if (!contactRef) {
      toast.error("Couldn't identify your account. Please log in again.");
      return;
    }
    setIsStarting(true);
    startPending();
    try {
      const created = await createChatbotSession(chatbotId, contactRef, apiKey);
      lastEventSeqRef.current = 0;
      setMessages([]);
      setSessionId(created.session_id);
      setStatus("active");
      setCompletionStatus("in_progress");
      await sendChatbotMessage(created.session_id, undefined, apiKey);
    } catch (err) {
      clearPending();
      toast.error(
        err instanceof Error ? err.message : "Failed to start the chat.",
      );
    } finally {
      setIsStarting(false);
    }
  }, [apiKey, chatbotId, clearPending, contactRef, startPending, toast]);

  const send = useCallback(
    async (message: string): Promise<boolean> => {
      if (!sessionId) return false;
      const id = crypto.randomUUID();
      setMessages((prev) => [...prev, { id, role: "user", content: message }]);
      startPending();
      try {
        await sendChatbotMessage(sessionId, message, apiKey);
        return true;
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        clearPending();
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send the message.";
        if (INACTIVE_RE.test(errorMessage)) setStatus("inactive");
        toast.error(errorMessage);
        return false;
      }
    },
    [apiKey, clearPending, sessionId, startPending, toast],
  );

  return {
    sessionId,
    messages,
    status,
    completionStatus,
    isPending: pending.isPending,
    isStarting,
    startChat,
    send,
  };
}
