import { MarkdownContent } from "@/app/components/chat";
import { ChatbotChatMessage } from "@/app/lib/types/chatbot";

export default function ChatbotMessageBubble({
  message,
}: {
  message: Pick<ChatbotChatMessage, "role" | "content">;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? "bg-accent-primary text-white whitespace-pre-wrap"
            : "bg-bg-secondary text-text-primary"
        }`}
      >
        {isUser ? message.content : <MarkdownContent text={message.content} />}
      </div>
    </div>
  );
}
