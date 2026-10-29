import {
  apiFetch,
  apiFetchResponse,
  extractErrorMessage,
} from "@/app/lib/apiClient";
import {
  Chatbot,
  ChatbotFlow,
  ChatbotFlowGraph,
  ChatbotFlowResponse,
  ChatbotListResponse,
  ChatbotResponse,
  ChatbotSessionCreated,
  ChatbotSessionCreatedResponse,
  SendChatbotMessageResponse,
} from "@/app/lib/types/chatbot";

function unwrap<T>(
  res: { success: boolean; data: T | null; error?: string | null },
  fallback: string,
): T {
  if (!res.success || res.data === null) throw new Error(res.error || fallback);
  return res.data;
}

export async function listChatbots(apiKey: string): Promise<Chatbot[]> {
  const res = await apiFetch<ChatbotListResponse>(
    "/api/chatbots?skip=0&limit=100",
    apiKey,
  );
  return unwrap(res, "Failed to load chatbots.");
}

export async function createChatbot(
  name: string,
  apiKey: string,
): Promise<Chatbot> {
  const res = await apiFetch<ChatbotResponse>("/api/chatbots", apiKey, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return unwrap(res, "Failed to create the chatbot.");
}

export async function getChatbot(id: string, apiKey: string): Promise<Chatbot> {
  const res = await apiFetch<ChatbotResponse>(
    `/api/chatbots/${encodeURIComponent(id)}`,
    apiKey,
  );
  return unwrap(res, "Failed to load the chatbot.");
}

export async function getChatbotFlow(
  chatbotId: string,
  apiKey: string,
): Promise<ChatbotFlow | null> {
  const res = await apiFetchResponse(
    `/api/chatbots/${encodeURIComponent(chatbotId)}/flow`,
    apiKey,
  );
  if (res.status === 404) return null;
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(extractErrorMessage(body, "Failed to load the flow."));
  }
  return unwrap(
    body as unknown as ChatbotFlowResponse,
    "Failed to load the flow.",
  );
}

export async function saveChatbotFlow(
  chatbotId: string,
  flow: ChatbotFlowGraph,
  apiKey: string,
): Promise<ChatbotFlow> {
  const res = await apiFetch<ChatbotFlowResponse>(
    `/api/chatbots/${encodeURIComponent(chatbotId)}/flow`,
    apiKey,
    { method: "PUT", body: JSON.stringify(flow) },
  );
  return unwrap(res, "Failed to save the flow.");
}

export async function publishChatbotFlow(
  chatbotId: string,
  apiKey: string,
): Promise<ChatbotFlow> {
  const res = await apiFetch<ChatbotFlowResponse>(
    `/api/chatbots/${encodeURIComponent(chatbotId)}/flow/publish`,
    apiKey,
    { method: "POST" },
  );
  return unwrap(res, "Failed to publish the flow.");
}

export async function createChatbotSession(
  chatbotId: string,
  contactRef: string,
  apiKey: string,
): Promise<ChatbotSessionCreated> {
  const res = await apiFetch<ChatbotSessionCreatedResponse>(
    `/api/chatbots/${encodeURIComponent(chatbotId)}/sessions`,
    apiKey,
    { method: "POST", body: JSON.stringify({ contact_ref: contactRef }) },
  );
  return unwrap(res, "Failed to start a chat session.");
}

export async function sendChatbotMessage(
  sessionId: string,
  message: string | undefined,
  apiKey: string,
): Promise<void> {
  const res = await apiFetch<SendChatbotMessageResponse>(
    `/api/chatbots/sessions/${encodeURIComponent(sessionId)}/message`,
    apiKey,
    { method: "POST", body: JSON.stringify(message ? { message } : {}) },
  );
  if (!res.success) {
    throw new Error(res.error || "Failed to send the message.");
  }
}
