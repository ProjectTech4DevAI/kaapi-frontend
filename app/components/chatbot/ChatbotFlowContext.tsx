"use client";

import { createContext, useContext } from "react";
import { ChatbotNodeData } from "@/app/lib/types/chatbot";

interface ChatbotFlowContextValue {
  updateNodeData: (id: string, patch: Partial<ChatbotNodeData>) => void;
}

export const ChatbotFlowContext = createContext<ChatbotFlowContextValue | null>(
  null,
);

/** Lets custom nodes edit their own data inline on the canvas. */
export function useChatbotFlowContext(): ChatbotFlowContextValue {
  const ctx = useContext(ChatbotFlowContext);
  if (!ctx) {
    throw new Error(
      "useChatbotFlowContext must be used inside ChatbotFlowContext.Provider",
    );
  }
  return ctx;
}
