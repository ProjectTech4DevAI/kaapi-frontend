"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/hooks/useToast";
import { sendChatbotMessage } from "@/app/lib/chatbotClient";
import { ChatbotMessage, ChatbotNodeData } from "@/app/lib/types/chatbot";

/**
 * Drives the chatbot test panel for a single flow node. History lives only in
 * React state; it is cleared whenever the node's prompt or config changes so
 * every edit starts a fresh test.
 */
export function useChatbotTest(data: ChatbotNodeData) {
  const { activeKey } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const toast = useToast();

  const [history, setHistory] = useState<ChatbotMessage[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const resetKey = `${data.systemPrompt}\u0000${data.configId}\u0000${data.configVersion ?? ""}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setHistory([]);
    setPendingMessage(null);
    setIsPending(false);
  }

  // Bumped on every reset so responses from an outdated test are dropped.
  const generationRef = useRef(0);
  useEffect(() => {
    generationRef.current += 1;
  }, [resetKey]);

  const canSend = !!data.configId && !!data.systemPrompt.trim();

  const send = useCallback(
    async (message?: string): Promise<boolean> => {
      if (!data.configId) {
        toast.error("Select a configuration and version first.");
        return false;
      }
      if (!data.systemPrompt.trim()) {
        toast.error("Add a system prompt to the node first.");
        return false;
      }

      const generation = generationRef.current;
      setIsPending(true);
      setPendingMessage(message ?? null);
      try {
        const messages = await sendChatbotMessage(
          {
            config_id: data.configId,
            config_version: data.configVersion,
            system_prompt: data.systemPrompt,
            history,
            message,
            max_tokens: data.maxTokens,
            history_token_limit: data.historyTokenLimit,
          },
          apiKey,
        );
        if (generation !== generationRef.current) return false;
        setHistory(messages);
        return true;
      } catch (err) {
        if (generation !== generationRef.current) return false;
        toast.error(
          err instanceof Error ? err.message : "Something went wrong",
        );
        return false;
      } finally {
        if (generation === generationRef.current) {
          setIsPending(false);
          setPendingMessage(null);
        }
      }
    },
    [apiKey, data, history, toast],
  );

  const reset = useCallback(() => {
    generationRef.current += 1;
    setHistory([]);
    setPendingMessage(null);
    setIsPending(false);
  }, []);

  return { history, pendingMessage, isPending, canSend, send, reset };
}
