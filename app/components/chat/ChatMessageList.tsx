/**
 * ChatMessageList - Scrollable container for chat messages with auto-scroll on append.
 */

"use client";

import { useEffect, useRef } from "react";
import { ChatMessage as ChatMessageType } from "@/app/lib/types/chat";
import ChatMessage from "@/app/components/chat/ChatMessage";

interface ChatMessageListProps {
  messages: ChatMessageType[];
}

export default function ChatMessageList({ messages }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
