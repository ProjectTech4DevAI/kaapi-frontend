"use client";

import { useEffect, useState } from "react";
import {
  TTS_ISSUES,
  TTSFeedbackPayload,
  TTSIssue,
  TTSResult,
} from "@/app/lib/types/textToSpeech";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  PauseIcon,
  PlayIcon,
} from "@/app/components/icons";
import TTSMetricControls from "./TTSMetricControls";
import { formatDuration, formatSize, formatUsage } from "@/app/lib/utils/tts";

interface TTSReviewPanelProps {
  result: TTSResult;
  sampleIndex: number;
  sampleCount: number;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onFeedback: (payload: TTSFeedbackPayload) => void;
  onNavigate: (dSample: number, dModel: number) => void;
  onClose: () => void;
}

const NOTE_MAX = 500;

export default function TTSReviewPanel({
  result,
  sampleIndex,
  sampleCount,
  isPlaying,
  onPlayToggle,
  onFeedback,
  onNavigate,
  onClose,
}: TTSReviewPanelProps) {
  const [note, setNote] = useState(result.comment ?? "");
  useEffect(() => setNote(result.comment ?? ""), [result.id, result.comment]);

  const canReview = result.status === "SUCCESS";
  const issues = result.issues ?? [];
  const usage = formatUsage(result.usage);

  const commitNote = () => {
    if (note !== (result.comment ?? "")) onFeedback({ comment: note });
  };

  const toggleIssue = (issue: TTSIssue) =>
    onFeedback({
      issues: issues.includes(issue)
        ? issues.filter((i) => i !== issue)
        : [...issues, issue],
    });

  return (
    <aside className="w-[360px] shrink-0 border-l border-border bg-bg-primary flex flex-col">
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="min-w-0">
          <div className="text-sm font-medium text-text-primary truncate">
            {result.provider}
          </div>
          <div className="text-xs text-text-secondary">
            {result.voice ?? "default voice"} · Sample {sampleIndex + 1} of{" "}
            {sampleCount}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[
            { label: "Previous sample", d: -1, Icon: ChevronLeftIcon },
            { label: "Next sample", d: 1, Icon: ChevronRightIcon },
          ].map(({ label, d, Icon }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => onNavigate(d, 0)}
              className="p-1 rounded text-text-secondary hover:bg-bg-secondary cursor-pointer"
            >
              <Icon className="w-4! h-4!" />
            </button>
          ))}
          <button
            type="button"
            aria-label="Close review panel"
            onClick={onClose}
            className="p-1 rounded text-text-secondary hover:bg-bg-secondary cursor-pointer"
          >
            <CloseIcon className="w-4! h-4!" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <p className="text-sm leading-relaxed text-text-primary max-h-32 overflow-y-auto">
          {result.sample_text}
        </p>

        <div className="flex items-center gap-3">
          {result.signedUrl ? (
            <button
              type="button"
              onClick={onPlayToggle}
              className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-accent-primary text-white cursor-pointer"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <PauseIcon className="w-3.5! h-3.5!" />
              ) : (
                <PlayIcon className="w-3.5! h-3.5!" />
              )}
            </button>
          ) : null}
          <div className="text-xs text-text-secondary tabular-nums space-y-0.5">
            {canReview ? (
              <div>
                {[
                  result.duration_seconds != null &&
                    formatDuration(result.duration_seconds),
                  result.size_bytes != null && formatSize(result.size_bytes),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            ) : (
              <div className="text-status-error">
                {result.error_message ?? result.status}
              </div>
            )}
            {usage && <div>Usage: {usage}</div>}
          </div>
        </div>

        <div className={canReview ? "" : "opacity-50 pointer-events-none"}>
          <TTSMetricControls result={result} onChange={onFeedback} />

          <div className="mt-4">
            <div className="text-[11px] mb-1 text-text-secondary">Issues</div>
            <div className="flex flex-wrap gap-1.5">
              {TTS_ISSUES.map(({ value, label }) => {
                const on = issues.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleIssue(value)}
                    className={`px-2 py-1 rounded-full text-[11px] border cursor-pointer ${
                      on
                        ? "border-status-error bg-red-500/10 text-status-error"
                        : "border-border text-text-secondary hover:bg-bg-secondary"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <input
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              onBlur={commitNote}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              placeholder="Add a note (optional)"
              className="w-full px-2.5 py-1.5 border rounded-md text-xs bg-bg-primary border-border text-text-primary"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-border text-[10px] text-text-secondary">
        ↑↓ sample · ←→ model · Space play · Esc close
      </div>
    </aside>
  );
}
