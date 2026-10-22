import type { Node } from "@xyflow/react";

export type ChatbotNodeData = {
  label: string;
  systemPrompt: string;
  configId: string;
  configVersion?: number;
};

export type ChatbotLlmNode = Node<ChatbotNodeData, "llm">;

export type ChatbotTerminalNode = Node<
  { label: string },
  "flowInput" | "flowOutput"
>;

export type ChatbotFlowNode = ChatbotLlmNode | ChatbotTerminalNode;

export type ChatbotSessionStatus = "active" | "inactive";

/** `complete` once every field the system prompt asks for is collected. */
export type ChatbotCompletionStatus = "in_progress" | "complete" | "abandoned";

export type ChatbotCollectedFields = Record<string, unknown>;

export interface ChatbotChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface CreateChatbotSessionRequest {
  name: string;
  /** Omit for a new chatbot (backend generates one); resend it for the same chatbot. */
  chatbot_ref?: string;
  config_id: string;
  config_version?: number;
  contact_ref: string;
  system_prompt: string;
}

export interface CreateChatbotSessionResponse {
  success: boolean;
  data?: { session_id: string; chatbot_ref: string } | null;
  error?: string | null;
}

export interface ChatbotSessionSummary {
  session_id: string;
  name: string;
  contact_ref: string;
  chatbot_ref: string;
  status: ChatbotSessionStatus;
  completion_status: ChatbotCompletionStatus;
  collected_fields: ChatbotCollectedFields;
  config_id: string;
  config_version: number | null;
  inserted_at: string;
  updated_at: string;
}

export interface ChatbotSessionSummaryResponse {
  success: boolean;
  data?: ChatbotSessionSummary | null;
  error?: string | null;
}

export interface SendChatbotSessionMessageResponse {
  success: boolean;
  data?: { status: string } | null;
  error?: string | null;
}

/** Body Kaapi POSTs to our webhook once a session turn completes. */
export interface ChatbotWebhookPayload {
  success: boolean;
  data?: {
    session_id: string;
    /** Present on success payloads only. */
    chatbot_ref?: string;
    reply?: string;
    status?: ChatbotSessionStatus;
    completion_status?: ChatbotCompletionStatus;
    collected_fields?: ChatbotCollectedFields;
  } | null;
  error?: string | null;
}

export interface ChatbotSessionEvent {
  seq: number;
  sessionId: string;
  success: boolean;
  reply: string | null;
  status: ChatbotSessionStatus | null;
  completionStatus: ChatbotCompletionStatus | null;
  collectedFields: ChatbotCollectedFields | null;
  error: string | null;
}

export type ChatbotSessionEventListener = (event: ChatbotSessionEvent) => void;

export interface ChatbotSessionStoreShape {
  events: Map<string, ChatbotSessionEvent[]>;
  listeners: Map<string, Set<ChatbotSessionEventListener>>;
  lastSeq: number;
}
