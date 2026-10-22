/**
 * ChatbotTestPanel - Chats with the saved flow's server-side session. Replies
 * arrive asynchronously via the webhook stream, so the panel only renders
 * state owned by useChatbotSession.
 */

"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/app/components/ui";
import { RefreshIcon } from "@/app/components/icons";
import ChatbotMessageBubble from "@/app/components/chatbot/ChatbotMessageBubble";
import ChatbotChatInput from "@/app/components/chatbot/ChatbotChatInput";
import { ChatbotStatusBadge } from "@/app/components/chatbot/ChatbotSessionInfo";
import {
  ChatbotChatMessage,
  ChatbotCompletionStatus,
  ChatbotSessionStatus,
} from "@/app/lib/types/chatbot";

interface ChatbotTestPanelProps {
  hasSession: boolean;
  sessionName: string | null;
  status: ChatbotSessionStatus | null;
  completionStatus: ChatbotCompletionStatus | null;
  messages: ChatbotChatMessage[];
  isPending: boolean;
  isRestarting: boolean;
  isDirty: boolean;
  onSend: (message?: string) => Promise<boolean>;
  onRestart: () => void;
}

function inputPlaceholder(isEnded: boolean, hasStarted: boolean): string {
  if (isEnded) return "Session closed";
  if (!hasStarted) return "Click Start chat to begin…";
  return "Reply as the user…";
}

export default function ChatbotTestPanel({
  hasSession,
  sessionName,
  status,
  completionStatus,
  messages,
  isPending,
  isRestarting,
  isDirty,
  onSend,
  onRestart,
}: ChatbotTestPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  // Inactive = superseded by a newer session; a complete one still chats.
  const isEnded = status === "inactive";
  const hasStarted = messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isPending]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {sessionName ? `Test: ${sessionName}` : "Test chat"}
          </p>
          <ChatbotStatusBadge
            status={status}
            completionStatus={completionStatus}
          />
        </div>
        {hasSession && (
          <button
            type="button"
            onClick={onRestart}
            disabled={isRestarting || isPending}
            title="Start a new session with the saved flow"
            className="p-1.5 rounded-full text-text-secondary hover:bg-neutral-100 hover:text-text-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {isDirty && (
        <p className="px-4 py-2 text-xs bg-status-warning-bg text-status-warning-text border-b border-border">
          You have unsaved changes. The chat uses the last saved flow. Save to
          test your edits.
        </p>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!hasSession ? (
          <p className="h-full flex items-center justify-center text-center text-sm text-text-secondary px-6">
            Pick a configuration, write a prompt and click Save to start a
            chatbot session.
          </p>
        ) : (
          messages.length === 0 &&
          !isPending && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3">
              <p className="text-sm text-text-secondary max-w-[260px]">
                The bot will send the first message.
              </p>
              <Button size="sm" onClick={() => onSend()}>
                Start chat
              </Button>
            </div>
          )
        )}
        {messages.map((m) => (
          <ChatbotMessageBubble key={m.id} message={m} />
        ))}
        {isPending && (
          <p className="text-xs text-text-secondary animate-pulse">
            Bot is typing…
          </p>
        )}
        {isEnded && (
          <p className="text-xs text-center text-text-secondary">
            This session was replaced by a newer one. Restart to continue
            testing.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {hasSession && (
        <ChatbotChatInput
          disabled={isPending || isEnded || !hasStarted}
          placeholder={inputPlaceholder(isEnded, hasStarted)}
          onSend={onSend}
        />
      )}
    </div>
  );
}
