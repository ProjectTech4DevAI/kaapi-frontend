"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/hooks/useToast";
import { useChatbotReplyStream } from "@/app/hooks/useChatbotReplyStream";
import { useChatbotPendingReply } from "@/app/hooks/useChatbotPendingReply";
import {
  useChatbotStore,
  useChatbotStoreHydration,
} from "@/app/lib/store/chatbot";
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
  ChatbotChatMessage,
  ChatbotNodeData,
  ChatbotSessionEvent,
  ChatbotCompletionStatus,
  ChatbotSessionStatus,
} from "@/app/lib/types/chatbot";

// Backend 422 when the greeting is requested on a session that already has turns.
const ALREADY_STARTED_RE = /required once the session has started/i;
// Backend 409 once a newer session of the same chatbot superseded this one.
const INACTIVE_RE = /session is inactive/i;

/**
 * Owns the server-side chatbot session: creating it on Save (id kept in a
 * cookie and the shared store), sending turns, and applying replies that
 * arrive asynchronously through the webhook stream. The transcript is kept
 * in this hook's state only. Pages that don't chat (the flow canvas) pass
 * `listen: false` to skip opening the reply stream.
 */
export function useChatbotSession({
  listen = true,
}: { listen?: boolean } = {}) {
  const { activeKey, currentUser, isAuthenticated } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const toast = useToast();

  useChatbotStoreHydration();
  const hasHydrated = useChatbotStore((s) => s.hasHydrated);
  const sessionId = useChatbotStore((s) => s.sessionId);
  const setSessionId = useChatbotStore((s) => s.setSessionId);
  const chatbotRef = useChatbotStore((s) => s.chatbotRef);
  const setChatbotRef = useChatbotStore((s) => s.setChatbotRef);
  const setSavedFlow = useChatbotStore((s) => s.setSavedFlow);

  const [messages, setMessages] = useState<ChatbotChatMessage[]>([]);
  const lastEventSeqRef = useRef(0);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [status, setStatus] = useState<ChatbotSessionStatus | null>(null);
  const [completionStatus, setCompletionStatus] =
    useState<ChatbotCompletionStatus | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const pending = useChatbotPendingReply(CHATBOT_REPLY_TIMEOUT_MS, () =>
    toast.error("No reply from the chatbot yet. Try sending again."),
  );
  const { clear: clearPending, start: startPending } = pending;

  const contactRef = currentUser?.id ? `kaapi-user-${currentUser.id}` : null;

  // A different session (new Save, another tab, restore) starts a new transcript.
  useEffect(() => {
    setMessages([]);
    lastEventSeqRef.current = 0;
  }, [sessionId]);

  const activateSession = useCallback(
    (id: string) => {
      writeChatbotSessionCookie(id);
      setSessionId(id);
    },
    [setSessionId],
  );

  // Restore the session from the cookie, falling back to the user's latest
  // session; when found, its name/config/prompt become the saved flow and its
  // backend-issued chatbot ref is stored for later calls. The ref is sent
  // only if we have it.
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !contactRef) return;
    const cookieId = readChatbotSessionCookie();
    if (cookieId) setSessionId(cookieId);

    let cancelled = false;
    getLatestChatbotSession(contactRef, chatbotRef, apiKey).then((summary) => {
      if (cancelled || !summary) return;
      if (cookieId && cookieId !== summary.session_id) return;
      if (!cookieId) activateSession(summary.session_id);
      const name = summary.name || DEFAULT_CHATBOT_NAME;
      setChatbotRef(summary.chatbot_ref);
      setSavedFlow({
        label: name,
        configId: summary.config_id,
        configVersion: summary.config_version ?? undefined,
        systemPrompt:
          summary.system_prompt ??
          useChatbotStore.getState().savedFlow?.systemPrompt ??
          "",
      });
      setSessionName(name);
      setStatus(summary.status);
      setCompletionStatus(summary.completion_status);
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
    activateSession,
    setSessionId,
    setChatbotRef,
    setSavedFlow,
  ]);

  const handleEvent = useCallback(
    (event: ChatbotSessionEvent) => {
      if (event.seq <= lastEventSeqRef.current) return;
      lastEventSeqRef.current = event.seq;
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

  useChatbotReplyStream(
    hasHydrated && listen ? sessionId : null,
    () => lastEventSeqRef.current,
    handleEvent,
  );

  /**
   * Creates a new session for the flow and makes it the active one.
   * Resolves to the new session id, or null when creation failed.
   * `keepPending` leaves the "bot is typing" state on while a turn is retried.
   */
  const startSession = useCallback(
    async (
      data: ChatbotNodeData,
      { keepPending = false }: { keepPending?: boolean } = {},
    ): Promise<string | null> => {
      if (!contactRef) {
        toast.error("Couldn't identify your account. Please log in again.");
        return null;
      }
      const name = data.label.trim() || DEFAULT_CHATBOT_NAME;
      setIsCreating(true);
      try {
        const created = await createChatbotSession(
          {
            name,
            // Backend issues the ref on the first save; resend it afterwards.
            chatbot_ref: chatbotRef ?? undefined,
            config_id: data.configId,
            config_version: data.configVersion,
            contact_ref: contactRef,
            system_prompt: data.systemPrompt,
          },
          apiKey,
        );
        setChatbotRef(created.chatbotRef);
        if (!keepPending) clearPending();
        activateSession(created.sessionId);
        setSessionName(name);
        setStatus("active");
        setCompletionStatus("in_progress");
        return created.sessionId;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save the flow.",
        );
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [
      activateSession,
      apiKey,
      chatbotRef,
      clearPending,
      contactRef,
      setChatbotRef,
      toast,
    ],
  );

  /**
   * Queues one turn on `id`; on failure rolls back the optimistic message and
   * rethrows. The pending state is left to the caller, which may retry.
   */
  const queueTurn = useCallback(
    async (id: string, message?: string): Promise<void> => {
      const optimisticId = message ? crypto.randomUUID() : null;
      if (optimisticId && message) {
        setMessages((prev) => [
          ...prev,
          { id: optimisticId, role: "user", content: message },
        ]);
      }
      startPending();
      try {
        await sendChatbotSessionMessage(id, message, apiKey);
      } catch (err) {
        if (optimisticId) {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        }
        throw err;
      }
    },
    [apiKey, startPending],
  );

  /**
   * Sends a turn; omit `message` to get the greeting. "Start chat" always
   * opens a conversation: if this session already has turns this tab never
   * saw (e.g. after a reload), a fresh session of the saved flow is started.
   */
  const send = useCallback(
    async (message?: string): Promise<boolean> => {
      if (!sessionId) {
        toast.error("Save the flow first to start a session.");
        return false;
      }
      const savedFlow = useChatbotStore.getState().savedFlow;
      try {
        await queueTurn(sessionId, message);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send the message.";
        if (INACTIVE_RE.test(errorMessage)) setStatus("inactive");
        if (message || !savedFlow || !ALREADY_STARTED_RE.test(errorMessage)) {
          clearPending();
          toast.error(errorMessage);
          return false;
        }
      }
      // Keep the typing dots up through the retry so "Start chat" doesn't flash.
      const freshId = await startSession(savedFlow, { keepPending: true });
      if (!freshId) {
        clearPending();
        return false;
      }
      try {
        await queueTurn(freshId);
        return true;
      } catch (err) {
        clearPending();
        toast.error(
          err instanceof Error ? err.message : "Failed to start the chat.",
        );
        return false;
      }
    },
    [clearPending, queueTurn, sessionId, startSession, toast],
  );

  return {
    sessionId,
    sessionName,
    status,
    completionStatus,
    messages,
    isPending: pending.isPending,
    isCreating,
    startSession,
    send,
  };
}
