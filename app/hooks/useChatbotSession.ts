"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/hooks/useToast";
import { useChatbotReplyStream } from "@/app/hooks/useChatbotReplyStream";
import { useChatbotPendingReply } from "@/app/hooks/useChatbotPendingReply";
import { useChatbotStore } from "@/app/lib/store/chatbot";
import {
  CHATBOT_REPLY_TIMEOUT_MS,
  DEFAULT_CHATBOT_NAME,
} from "@/app/lib/constants";
import {
  createChatbotSession,
  getLatestChatbotSession,
  sendChatbotSessionMessage,
} from "@/app/lib/chatbotClient";
import {
  readChatbotSessionCookie,
  writeChatbotSessionCookie,
} from "@/app/lib/utils/chatbotSessionCookie";
import {
  ChatbotNodeData,
  ChatbotSessionEvent,
  ChatbotCompletionStatus,
  ChatbotSessionStatus,
} from "@/app/lib/types/chatbot";

/**
 * Owns the server-side chatbot session used by the test panel: creating it
 * on Save (id kept in a cookie), sending turns, and applying replies that
 * arrive asynchronously through the webhook stream.
 */
export function useChatbotSession() {
  const { activeKey, currentUser, isAuthenticated } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const toast = useToast();

  const hasHydrated = useChatbotStore((s) => s.hasHydrated);
  const messages = useChatbotStore((s) => s.messages);
  const bindSession = useChatbotStore((s) => s.bindSession);
  const appendMessage = useChatbotStore((s) => s.appendMessage);
  const removeMessage = useChatbotStore((s) => s.removeMessage);
  const setLastEventSeq = useChatbotStore((s) => s.setLastEventSeq);
  const chatbotRef = useChatbotStore((s) => s.chatbotRef);
  const setChatbotRef = useChatbotStore((s) => s.setChatbotRef);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [status, setStatus] = useState<ChatbotSessionStatus | null>(null);
  const [completionStatus, setCompletionStatus] =
    useState<ChatbotCompletionStatus | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const pending = useChatbotPendingReply(CHATBOT_REPLY_TIMEOUT_MS, () =>
    toast.error("No reply from the chatbot yet. Try sending again."),
  );
  const { clear: clearPending, start: startPending } = pending;

  const userRef = currentUser?.id ?? activeKey?.id;
  const contactRef = userRef ? `kaapi-user-${userRef}` : null;

  const adoptSession = useCallback(
    (id: string) => {
      setSessionId(id);
      bindSession(id);
    },
    [bindSession],
  );

  // Restore the session from the cookie, falling back to this chatbot's
  // latest session for the contact; either way refresh its status. The
  // lookup needs the chatbot ref, which only exists after the first save.
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !contactRef) return;
    const cookieId = readChatbotSessionCookie();
    if (cookieId) adoptSession(cookieId);
    if (!chatbotRef) return;

    let cancelled = false;
    getLatestChatbotSession(contactRef, chatbotRef, apiKey).then((summary) => {
      if (cancelled || !summary) return;
      if (!cookieId) {
        writeChatbotSessionCookie(summary.session_id);
        adoptSession(summary.session_id);
      }
      if (!cookieId || cookieId === summary.session_id) {
        setSessionName(summary.name || DEFAULT_CHATBOT_NAME);
        setStatus(summary.status);
        setCompletionStatus(summary.completion_status);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    hasHydrated,
    isAuthenticated,
    contactRef,
    chatbotRef,
    apiKey,
    adoptSession,
  ]);

  const handleEvent = useCallback(
    (event: ChatbotSessionEvent) => {
      if (event.seq <= useChatbotStore.getState().lastEventSeq) return;
      setLastEventSeq(event.seq);
      clearPending();
      if (!event.success) {
        toast.error(event.error || "The chatbot couldn't reply.");
        return;
      }
      if (event.reply) {
        appendMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: event.reply,
        });
      }
      if (event.status) setStatus(event.status);
      if (event.completionStatus) setCompletionStatus(event.completionStatus);
    },
    [appendMessage, clearPending, setLastEventSeq, toast],
  );

  useChatbotReplyStream(
    hasHydrated ? sessionId : null,
    () => useChatbotStore.getState().lastEventSeq,
    handleEvent,
  );

  /** Creates a new session for the saved flow and makes it the active one. */
  const startSession = useCallback(
    async (data: ChatbotNodeData): Promise<boolean> => {
      if (!contactRef) {
        toast.error("Couldn't identify your account. Please log in again.");
        return false;
      }
      const name = data.label.trim() || DEFAULT_CHATBOT_NAME;
      setIsCreating(true);
      try {
        const created = await createChatbotSession(
          {
            name,
            chatbot_ref: chatbotRef ?? undefined,
            config_id: data.configId,
            config_version: data.configVersion,
            contact_ref: contactRef,
            system_prompt: data.systemPrompt,
          },
          apiKey,
        );
        writeChatbotSessionCookie(created.sessionId);
        setChatbotRef(created.chatbotRef);
        clearPending();
        adoptSession(created.sessionId);
        setSessionName(name);
        setStatus("active");
        setCompletionStatus("in_progress");
        return true;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save the flow.",
        );
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [
      adoptSession,
      apiKey,
      chatbotRef,
      clearPending,
      contactRef,
      setChatbotRef,
      toast,
    ],
  );

  /** Queues a turn; omit `message` to get the greeting on a fresh session. */
  const send = useCallback(
    async (message?: string): Promise<boolean> => {
      if (!sessionId) {
        toast.error("Save the flow first to start a session.");
        return false;
      }
      const optimisticId = message ? crypto.randomUUID() : null;
      if (optimisticId && message) {
        appendMessage({ id: optimisticId, role: "user", content: message });
      }
      startPending();

      try {
        await sendChatbotSessionMessage(sessionId, message, apiKey);
        return true;
      } catch (err) {
        if (optimisticId) removeMessage(optimisticId);
        clearPending();
        toast.error(
          err instanceof Error ? err.message : "Failed to send the message.",
        );
        return false;
      }
    },
    [
      appendMessage,
      apiKey,
      clearPending,
      removeMessage,
      sessionId,
      startPending,
      toast,
    ],
  );

  return {
    sessionId,
    sessionName,
    status,
    completionStatus,
    messages: sessionId ? messages : [],
    isPending: pending.isPending,
    isCreating,
    startSession,
    send,
  };
}
