import { apiFetch } from "@/app/lib/apiClient";
import {
  ChatbotSessionSummary,
  ChatbotSessionSummaryResponse,
  CreateChatbotSessionRequest,
  CreateChatbotSessionResponse,
  SendChatbotSessionMessageResponse,
} from "@/app/lib/types/chatbot";

export async function createChatbotSession(
  body: CreateChatbotSessionRequest,
  apiKey: string,
): Promise<{ sessionId: string; chatbotRef: string }> {
  const res = await apiFetch<CreateChatbotSessionResponse>(
    "/api/chatbot/sessions",
    apiKey,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (!res.success || !res.data?.session_id) {
    throw new Error(res.error || "Failed to create the chatbot session.");
  }
  return {
    sessionId: res.data.session_id,
    chatbotRef: res.data.chatbot_ref,
  };
}

export async function getLatestChatbotSession(
  contactRef: string,
  chatbotRef: string | null,
  apiKey: string,
): Promise<ChatbotSessionSummary | null> {
  try {
    const params = new URLSearchParams({ contact_ref: contactRef });
    if (chatbotRef) params.set("chatbot_ref", chatbotRef);
    const res = await apiFetch<ChatbotSessionSummaryResponse>(
      `/api/chatbot/sessions?${params}`,
      apiKey,
    );
    return res.success ? (res.data ?? null) : null;
  } catch {
    // 404 = no session for this contact yet.
    return null;
  }
}

export async function sendChatbotSessionMessage(
  sessionId: string,
  message: string | undefined,
  apiKey: string,
): Promise<void> {
  const res = await apiFetch<SendChatbotSessionMessageResponse>(
    `/api/chatbot/sessions/${encodeURIComponent(sessionId)}/message`,
    apiKey,
    { method: "POST", body: JSON.stringify(message ? { message } : {}) },
  );
  if (!res.success) {
    throw new Error(res.error || "Failed to send the message.");
  }
}
