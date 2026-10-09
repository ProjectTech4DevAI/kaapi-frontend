import { apiFetch } from "@/app/lib/apiClient";
import {
  ChatbotMessage,
  ChatbotMessageRequest,
  ChatbotMessageResponse,
} from "@/app/lib/types/chatbot";

/**
 * Sends one turn of a chatbot test conversation. The backend is stateless:
 * it takes the full history and returns the updated history (old messages
 * plus the new user/assistant turn).
 */
export async function sendChatbotMessage(
  body: ChatbotMessageRequest,
  apiKey: string,
): Promise<ChatbotMessage[]> {
  const res = await apiFetch<ChatbotMessageResponse>(
    "/api/chatbot/message",
    apiKey,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (!res.success || !res.data?.messages) {
    throw new Error(res.error || "Failed to get a response from the chatbot.");
  }
  return res.data.messages;
}
