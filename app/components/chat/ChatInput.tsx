/**
 * ChatInput - Auto-growing textarea with a send button.
 */

"use client";

import { KeyboardEvent, ReactNode, useEffect, useRef } from "react";
import { InfoIcon, MicIcon, SendIcon } from "@/app/components/icons";

interface ChatInputProps {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isPending?: boolean;
  placeholder?: string;
  helperText?: string;
  trailingAccessory?: ReactNode;
  onStartVoice?: () => void;
  /**
   * True when the currently selected configuration meets the voice-chat
   * requirements (Google provider + STT type). When false, the mic still
   * works but we surface the requirement inline so the user knows why
   * clicking it will be rejected.
   */
  voiceConfigReady?: boolean;
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
  onStartVoice,
  voiceConfigReady,
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
            {onStartVoice && (
              <button
                type="button"
                onClick={onStartVoice}
                disabled={disabled || isPending}
                aria-label="Start voice input"
                title={
                  voiceConfigReady === false
                    ? "Voice chat needs a Google + Speech-to-Text config"
                    : "Start voice input · requires Google + STT config"
                }
                className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  voiceConfigReady === false
                    ? "border-status-warning-border bg-status-warning-bg text-status-warning-text hover:bg-status-warning-bg/80"
                    : "border-border bg-bg-primary text-text-secondary hover:text-accent-primary hover:border-accent-primary hover:bg-accent-primary/5"
                }`}
              >
                <MicIcon className="w-4 h-4" />
              </button>
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
        {onStartVoice && voiceConfigReady === false ? (
          <div className="mt-2 flex items-start justify-center gap-1.5 text-[11px] text-status-warning-text">
            <InfoIcon className="w-3 h-3 shrink-0 mt-[3px]" />
            <p className="text-center leading-snug wrap-break-word">
              Voice chat needs a config with provider{" "}
              <span className="font-semibold">Google</span> and type{" "}
              <span className="font-semibold">Speech-to-Text</span> — pick a
              different config or update this one.
            </p>
          </div>
        ) : (
          <p className="text-center text-[11px] text-text-secondary mt-2">
            {helperText ?? "Press Enter to send, Shift+Enter for a new line."}
          </p>
        )}
      </div>
    </div>
  );
}
