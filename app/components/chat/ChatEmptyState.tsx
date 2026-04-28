/**
 * ChatEmptyState - Welcome surface shown when the conversation is empty.
 *
 * Mirrors the Chat-style "Ask anything" hero with optional starter prompts.
 */

"use client";

import { ChatIcon } from "@/app/components/icons";

interface ChatEmptyStateProps {
  hasConfig: boolean;
  isAuthenticated: boolean;
  onSuggestion?: (text: string) => void;
}

const SUGGESTIONS = [
  "Summarize a long article in plain language",
  "Draft a polite reply to a tough email",
  "Brainstorm ideas for a product launch",
  "Explain a complex concept like I'm five",
];

export default function ChatEmptyState({
  hasConfig,
  isAuthenticated,
  onSuggestion,
}: ChatEmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-accent-primary text-white flex items-center justify-center">
          <ChatIcon className="w-6 h-6" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-text-primary">
          What can I help with?
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {!isAuthenticated
            ? "Log in to start chatting with your assistants."
            : !hasConfig
              ? "Pick a configuration above to choose which assistant answers."
              : "Ask anything — your conversation history is kept in this session."}
        </p>

        {isAuthenticated && hasConfig && onSuggestion && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestion(s)}
                className="text-left text-sm text-text-primary px-4 py-3 rounded-xl border border-border bg-bg-primary hover:bg-neutral-50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
