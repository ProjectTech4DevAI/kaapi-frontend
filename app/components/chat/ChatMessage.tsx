/**
 * ChatMessage - Renders a single message bubble (user or assistant).
 */

"use client";

import { ChatMessage as ChatMessageType } from "@/app/lib/types/chat";
import { ChatIcon } from "@/app/components/icons";

interface ChatMessageProps {
  message: ChatMessageType;
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-[chat-pulse_1.4s_ease-in-out_infinite]" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-[chat-pulse_1.4s_ease-in-out_0.2s_infinite]" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-[chat-pulse_1.4s_ease-in-out_0.4s_infinite]" />
    </div>
  );
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isPending = message.status === "pending";
  const isError = message.status === "error";

  if (isUser) {
    return (
      <div className="flex justify-end px-4 sm:px-6">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-neutral-100 px-4 py-2.5 text-[15px] leading-relaxed text-text-primary whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-4 sm:px-6">
      <div className="w-8 h-8 rounded-full bg-accent-primary text-white flex items-center justify-center shrink-0 mt-1">
        <ChatIcon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 pt-1">
        {isPending && !message.content ? (
          <ThinkingDots />
        ) : (
          <div
            className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
              isError ? "text-status-error" : "text-text-primary"
            }`}
          >
            {message.content}
            {isPending && message.content && (
              <span className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom bg-text-primary animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
