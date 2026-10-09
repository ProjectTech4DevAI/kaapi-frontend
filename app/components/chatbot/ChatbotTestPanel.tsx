/**
 * ChatbotTestPanel - Runs a throwaway test conversation against the selected
 * node's current (unsaved) prompt and config.
 */

"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui";
import { MarkdownContent } from "@/app/components/chat";
import { RefreshIcon, SendIcon } from "@/app/components/icons";
import { useChatbotTest } from "@/app/hooks/useChatbotTest";
import { ChatbotMessage, ChatbotNodeData } from "@/app/lib/types/chatbot";

interface ChatbotTestPanelProps {
  data: ChatbotNodeData;
}

function MessageBubble({ message }: { message: ChatbotMessage }) {
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

export default function ChatbotTestPanel({ data }: ChatbotTestPanelProps) {
  const { history, pendingMessage, isPending, canSend, send, reset } =
    useChatbotTest(data);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const visible = history.filter((m) => m.role !== "system");
  const hasStarted = history.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visible.length, pendingMessage, isPending]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isPending) return;
    setInput("");
    const ok = await send(text);
    if (!ok) setInput(text);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!hasStarted && !isPending && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <p className="text-sm text-text-secondary max-w-[260px]">
              {canSend
                ? "Start a test - the bot will send the first message."
                : "Pick a configuration and write a system prompt to start testing."}
            </p>
            <Button size="sm" onClick={() => send()} disabled={!canSend}>
              Start test
            </Button>
          </div>
        )}
        {visible.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {pendingMessage && (
          <MessageBubble message={{ role: "user", content: pendingMessage }} />
        )}
        {isPending && (
          <p className="text-xs text-text-secondary animate-pulse">
            Bot is typing…
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {hasStarted && (
        <form
          onSubmit={handleSubmit}
          className="border-t border-border p-3 flex items-center gap-2"
        >
          <button
            type="button"
            onClick={reset}
            title="Restart test"
            className="p-2 rounded-full text-text-secondary hover:bg-neutral-100 hover:text-text-primary cursor-pointer"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Reply as the user…"
            disabled={isPending}
            className="flex-1 px-3 py-2 rounded-full border border-border text-sm bg-bg-primary text-text-primary focus:outline-none focus:border-accent-primary disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isPending || !input.trim()}
            title="Send"
            className="p-2 rounded-full bg-accent-primary text-white hover:bg-accent-hover disabled:bg-neutral-200 disabled:text-text-secondary cursor-pointer disabled:cursor-not-allowed"
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}
