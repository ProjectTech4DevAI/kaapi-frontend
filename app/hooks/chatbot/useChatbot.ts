"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { getChatbot } from "@/app/lib/chatbotClient";
import { Chatbot } from "@/app/lib/types/chatbot";

export function useChatbot(chatbotId: string) {
  const { activeKey, isAuthenticated, isHydrated } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return;
    let cancelled = false;
    getChatbot(chatbotId, apiKey)
      .then((bot) => {
        if (!cancelled) setChatbot(bot);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Chatbot not found.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [chatbotId, apiKey, isAuthenticated, isHydrated]);

  return { chatbot, error };
}
