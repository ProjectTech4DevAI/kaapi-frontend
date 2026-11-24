"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { createChatbot, listChatbots } from "@/app/lib/chatbotClient";
import { Chatbot } from "@/app/lib/types/chatbot";

export function useChatbots() {
  const { activeKey, isAuthenticated, isHydrated } = useAuth();
  const apiKey = activeKey?.key ?? "";

  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    let cancelled = false;
    setIsLoading(true);
    listChatbots(apiKey)
      .then((list) => {
        if (!cancelled) setChatbots(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load chatbots.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, isAuthenticated, isHydrated]);

  const create = useCallback(
    (name: string) => createChatbot(name, apiKey),
    [apiKey],
  );

  return { chatbots, isLoading, error, create };
}
