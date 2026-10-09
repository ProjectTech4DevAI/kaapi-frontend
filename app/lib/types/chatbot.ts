import type { Node } from "@xyflow/react";

export type ChatbotRole = "system" | "user" | "assistant";

export interface ChatbotMessage {
  role: ChatbotRole;
  content: string;
}

/** Data carried by each LLM node on the flow canvas (unsaved, in-memory). */
export type ChatbotNodeData = {
  label: string;
  systemPrompt: string;
  configId: string;
  configVersion?: number;
  maxTokens: number;
  historyTokenLimit: number;
};

export type ChatbotLlmNode = Node<ChatbotNodeData, "llm">;

/** Fixed entry/exit points of the flow. */
export type ChatbotTerminalNode = Node<
  { label: string },
  "flowInput" | "flowOutput"
>;

export type ChatbotFlowNode = ChatbotLlmNode | ChatbotTerminalNode;

export interface ChatbotMessageRequest {
  config_id: string;
  config_version?: number;
  system_prompt: string;
  history: ChatbotMessage[];
  /** Omitted on the first call so the bot greets first. */
  message?: string;
  max_tokens?: number;
  history_token_limit?: number;
}

export interface ChatbotMessageResponse {
  success: boolean;
  data?: { messages: ChatbotMessage[] } | null;
  error?: string | null;
}
