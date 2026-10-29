"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/app/components/ui";
import { AssistantAvatar, ThinkingDots } from "@/app/components/chat";
import ChatbotMessageBubble from "@/app/components/chatbot/ChatbotMessageBubble";
import ChatbotChatInput from "@/app/components/chatbot/ChatbotChatInput";
import {
  ChatbotChatMessage,
  ChatbotSessionStatus,
} from "@/app/lib/types/chatbot";

interface ChatbotChatWindowProps {
  status: ChatbotSessionStatus | null;
  messages: ChatbotChatMessage[];
  isPending: boolean;
  onStart: () => void;
  onSend: (message: string) => Promise<boolean>;
}

function inputPlaceholder(isEnded: boolean, hasStarted: boolean): string {
  if (isEnded) return "Session closed";
  if (!hasStarted) return "Click Start chat to begin…";
  return "Type your message…";
}

export default function ChatbotChatWindow({
  status,
  messages,
  isPending,
  onStart,
  onSend,
}: ChatbotChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  // Inactive = superseded by a newer session; a complete one still chats.
  const isEnded = status === "inactive";
  const hasStarted = messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isPending]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {!hasStarted && !isPending && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <p className="text-sm text-text-secondary">
              The bot will send the first message.
            </p>
            <Button size="sm" onClick={onStart}>
              Start chat
            </Button>
          </div>
        )}
        {messages.map((m) => (
          <ChatbotMessageBubble key={m.id} message={m} />
        ))}
        {isPending && (
          <div className="flex gap-3" aria-label="Bot is typing">
            <AssistantAvatar />
            <div className="pt-1">
              <ThinkingDots />
            </div>
          </div>
        )}
        {isEnded && (
          <p className="text-xs text-center text-text-secondary">
            This session was replaced by a newer one. Restart to continue
            testing.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatbotChatInput
        disabled={isPending || isEnded || !hasStarted}
        placeholder={inputPlaceholder(isEnded, hasStarted)}
        onSend={onSend}
      />
    </div>
  );
}
