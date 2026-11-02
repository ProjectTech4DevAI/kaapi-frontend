import type { Edge, Node } from "@xyflow/react";
import type { APIResponse } from "@/app/lib/types/configs";

export interface Chatbot {
  id: string;
  name: string;
  organization_id: number;
  project_id: number;
  inserted_at: string;
  updated_at: string;
}

export type OnboardingNodeData = {
  config_id?: string;
  config_version?: number;
  prompt?: string;
};

export type ChatbotOnboardingNode = Node<OnboardingNodeData, "onboarding">;

export type ChatbotTerminalNode = Node<
  Record<string, unknown>,
  "input" | "output"
>;

export type ChatbotFlowNode = ChatbotOnboardingNode | ChatbotTerminalNode;

export interface ChatbotFlowGraph {
  nodes: ChatbotFlowNode[];
  edges: Edge[];
}

export interface ChatbotFlow extends ChatbotFlowGraph {
  id: string;
  chatbot_id: string;
  version: number;
  is_live: boolean;
  inserted_at: string;
  updated_at: string;
}

export interface ChatbotSessionCreated {
  session_id: string;
  chatbot_id: string;
  flow_version: number;
  active_node_id: string;
}

export type ChatbotSessionStatus = "active" | "inactive";

export type ChatbotCompletionStatus = "in_progress" | "complete" | "abandoned";

export interface ChatbotChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type ChatbotResponse = APIResponse<Chatbot>;
export type ChatbotListResponse = APIResponse<Chatbot[]>;
export type ChatbotFlowResponse = APIResponse<ChatbotFlow>;
export type ChatbotSessionCreatedResponse = APIResponse<ChatbotSessionCreated>;
export type SendChatbotMessageResponse = APIResponse<{ status: string }>;

export interface ChatbotWebhookPayload {
  success: boolean;
  data?: {
    session_id: string;
    chatbot_id?: string;
    node_id?: string;
    reply?: string;
    status?: ChatbotSessionStatus;
    completion_status?: ChatbotCompletionStatus;
    collected_fields?: Record<string, unknown>;
  } | null;
  error?: string | null;
}

export interface ChatbotSessionEvent {
  success: boolean;
  reply: string | null;
  status: ChatbotSessionStatus | null;
  completionStatus: ChatbotCompletionStatus | null;
  error: string | null;
}
