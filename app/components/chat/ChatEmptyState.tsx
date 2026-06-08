/**
 * ChatEmptyState - Welcome surface shown when the conversation is empty.
 */

"use client";

import { ChatIcon } from "@/app/components/icons";

interface ChatEmptyStateProps {
  hasConfig: boolean;
  isAuthenticated: boolean;
  onSuggestion?: (text: string) => void;
}

const SUGGESTIONS = [
  "Why evaluation is important",
  "What is cosine similarity",
  "What should be ideal score for evaluation results",
  "How much it cost to run program with AI",
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
                className="text-left text-sm text-text-primary px-4 py-3 rounded-xl bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] transition-shadow cursor-pointer"
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
