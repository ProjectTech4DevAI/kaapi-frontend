/**
 * VoiceInput - Replaces ChatInput while the user is in voice mode.
 */

"use client";

import { CloseIcon, SendIcon } from "@/app/components/icons";
import { VoiceStatus } from "@/app/lib/types/voiceChat";

interface VoiceInputProps {
  status: VoiceStatus;
  audioLevel: number;
  transcript?: string;
  onCancel: () => void;
  onSubmit: () => void;
}

const BAR_COUNT = 24;

function StatusLabel({ status }: { status: VoiceStatus }) {
  switch (status) {
    case "requesting":
      return <>Waiting for microphone permission…</>;
    case "listening":
      return <>Listening…</>;
    case "sending":
      return <>Sending…</>;
    case "error":
      return <>Tap × to close</>;
    default:
      return <>Starting…</>;
  }
}

export default function VoiceInput({
  status,
  audioLevel,
  transcript,
  onCancel,
  onSubmit,
}: VoiceInputProps) {
  const canSubmit = status === "listening";
  const isBusy = status === "sending";

  return (
    <div className="px-4 sm:px-6 pb-6 pt-2 bg-bg-primary">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-3xl border border-border bg-bg-primary shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex items-center gap-3 px-3 py-3">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel voice input"
            className="shrink-0 w-9 h-9 rounded-full border border-border bg-bg-primary text-text-secondary hover:text-text-primary hover:bg-neutral-50 flex items-center justify-center transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0 flex items-center justify-center gap-3">
            <div className="flex items-center gap-[3px] h-6" aria-hidden="true">
              {Array.from({ length: BAR_COUNT }).map((_, i) => {
                // Center bars react more strongly than the outer ones.
                const center = (BAR_COUNT - 1) / 2;
                const distance = Math.abs(i - center) / center;
                const weight = 1 - distance * 0.7;
                const base = 0.18;
                const reactive =
                  status === "listening" ? audioLevel * weight : 0;
                const h = Math.max(base, base + reactive);
                const animateIdle = isBusy || status === "listening";
                return (
                  <span
                    key={i}
                    className={`w-[3px] rounded-full transition-[height] duration-75 ${
                      animateIdle ? "animate-pulse" : ""
                    } ${
                      status === "listening"
                        ? "bg-accent-primary"
                        : "bg-text-secondary/50"
                    }`}
                    style={{
                      height: `${Math.min(1, h) * 100}%`,
                      animationDelay: `${i * 60}ms`,
                    }}
                  />
                );
              })}
            </div>
            <span className="text-sm font-medium text-text-secondary min-w-0 truncate">
              {transcript && transcript.trim().length > 0 ? (
                <span className="text-text-primary" title={transcript}>
                  {transcript}
                </span>
              ) : (
                <StatusLabel status={status} />
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-label="Send voice message"
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              canSubmit
                ? "bg-text-primary text-white hover:bg-neutral-800 cursor-pointer"
                : "bg-neutral-200 text-text-secondary cursor-not-allowed"
            }`}
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-[11px] text-text-secondary mt-2">
          {status === "listening"
            ? "Tap ↑ to send · ✕ to cancel"
            : status === "sending"
              ? "Sending your message…"
              : status === "requesting"
                ? "Allow microphone access in the browser prompt to start"
                : "Preparing microphone…"}
        </p>
      </div>
    </div>
  );
}
