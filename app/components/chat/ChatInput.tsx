/**
 * ChatInput - Auto-growing textarea with a send button.
 */

"use client";

import { KeyboardEvent, ReactNode, useEffect, useRef } from "react";
import { SendIcon } from "@/app/components/icons";

interface ChatInputProps {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isPending?: boolean;
  placeholder?: string;
  helperText?: string;
  trailingAccessory?: ReactNode;
}

const MAX_HEIGHT_PX = 200;

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  isPending = false,
  placeholder = "Message…",
  helperText,
  trailingAccessory,
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isPending && value.trim()) onSend();
    }
  };

  const canSend = !disabled && !isPending && value.trim().length > 0;

  return (
    <div className="px-4 sm:px-6 pb-6 pt-2 bg-bg-primary">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-3xl border border-border bg-bg-primary shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-colors">
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="block w-full resize-none bg-transparent text-text-primary text-[15px] leading-6 px-5 pt-3 pb-1 outline-none placeholder:text-text-secondary disabled:opacity-60"
            style={{ maxHeight: MAX_HEIGHT_PX }}
          />
          <div className="flex items-center gap-2 px-3 pb-2 pt-1">
            <div className="flex-1" />
            {trailingAccessory && (
              <div className="flex items-center gap-2 min-w-0">
                {trailingAccessory}
              </div>
            )}
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              aria-label="Send message"
              className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                canSend
                  ? "bg-accent-primary text-white hover:bg-accent-secondary cursor-pointer"
                  : "bg-neutral-200 text-text-secondary cursor-not-allowed"
              }`}
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-center text-[11px] text-text-secondary mt-2">
          {helperText ?? "Press Enter to send, Shift+Enter for a new line."}
        </p>
      </div>
    </div>
  );
}
