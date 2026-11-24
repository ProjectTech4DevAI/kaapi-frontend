import { createEventChannel } from "@/app/lib/store/eventChannel";
import type { ChatbotSessionEvent } from "@/app/lib/types/chatbot";

export const chatbotReplyChannel =
  createEventChannel<ChatbotSessionEvent>("chatbotReplies");
