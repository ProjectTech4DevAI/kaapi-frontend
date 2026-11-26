"use client";

import { createContext, useContext } from "react";
import { AgentNodeData, RouteEdgeData } from "@/app/lib/types/chatbot";

interface ChatbotFlowContextValue {
  updateNodeData: (id: string, patch: Partial<AgentNodeData>) => void;
  updateEdgeData: (id: string, patch: Partial<RouteEdgeData>) => void;
}

export const ChatbotFlowContext = createContext<ChatbotFlowContextValue | null>(
  null,
);

/** custom nodes and edges edit their own data inline on the canvas. */
export function useChatbotFlowContext(): ChatbotFlowContextValue {
  const ctx = useContext(ChatbotFlowContext);
  if (!ctx) {
    throw new Error(
      "useChatbotFlowContext must be used inside ChatbotFlowContext.Provider",
    );
  }
  return ctx;
}
