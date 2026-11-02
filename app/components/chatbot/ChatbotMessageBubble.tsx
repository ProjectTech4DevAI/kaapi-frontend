import { AssistantAvatar, MarkdownContent } from "@/app/components/chat";
import { ChatbotChatMessage } from "@/app/lib/types/chatbot";

export default function ChatbotMessageBubble({
  message,
}: {
  message: Pick<ChatbotChatMessage, "role" | "content">;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed bg-accent-primary text-white whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <AssistantAvatar />
      <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed bg-accent-primary/10 text-text-primary">
        <MarkdownContent text={message.content} />
      </div>
    </div>
  );
}
