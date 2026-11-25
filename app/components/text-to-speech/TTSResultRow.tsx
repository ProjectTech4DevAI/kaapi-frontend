"use client";

import { TTSResult } from "@/app/lib/types/textToSpeech";
import { formatDuration, formatUsage, usageDetail } from "./ttsFormat";

interface TTSResultRowProps {
  sampleText: string;
  index: number;
  models: string[];
  // result per model for this sample (a model may be missing)
  resultsByModel: Record<string, TTSResult | undefined>;
  playingResultId: number | null;
  selectedResultId: number | null;
  onPlayToggle: (resultId: number) => void;
  onSelect: (resultId: number) => void;
}

const RATING_TONE: Record<string, string> = {
  high: "bg-green-600/15 text-status-success",
  medium: "bg-yellow-500/15 text-yellow-600",
  low: "bg-red-500/15 text-status-error",
};

// Queued (PENDING) or claimed by a worker (PROCESSING): not a failure yet.
const IN_PROGRESS = ["PENDING", "PROCESSING"];

function RatingPill({ label, value }: { label: string; value: unknown }) {
  if (typeof value !== "string" || !value) return null;
  const tone = RATING_TONE[value.toLowerCase()] ?? "bg-bg-secondary";
  return (
    <span
      className={`px-1 rounded text-[10px] font-medium ${tone}`}
      title={`${label}: ${value}`}
    >
      {label[0]}·{value[0].toUpperCase()}
    </span>
  );
}

function PlayButton({
  isPlaying,
  onClick,
}: {
  isPlaying: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      aria-label={isPlaying ? "Pause" : "Play"}
      onClick={onClick}
      className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full border-2 border-accent-primary text-accent-primary cursor-pointer"
    >
      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
        {isPlaying ? (
          <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
        ) : (
          <path d="M8 5v14l11-7z" />
        )}
      </svg>
    </button>
  );
}

function ResultCell({
  r,
  isSelected,
  isPlaying,
  onPlayToggle,
  onSelect,
}: {
  r: TTSResult;
  isSelected: boolean;
  isPlaying: boolean;
  onPlayToggle: (resultId: number) => void;
  onSelect: (resultId: number) => void;
}) {
  const issueCount = r.issues?.length ?? 0;
  const failure =
    r.status === "SUCCESS" ? "No audio" : (r.error_message ?? r.status);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(r.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(r.id)}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer border ${
        isSelected
          ? "border-accent-primary bg-accent-primary/5"
          : "border-transparent hover:bg-bg-secondary"
      }`}
    >
      {r.signedUrl ? (
        <PlayButton
          isPlaying={isPlaying}
          onClick={(e) => {
            e.stopPropagation();
            onPlayToggle(r.id);
          }}
        />
      ) : IN_PROGRESS.includes(r.status) ? (
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
          Generating…
        </span>
      ) : (
        <span
          className="text-xs text-status-error truncate max-w-[8rem]"
          title={failure}
        >
          {failure}
        </span>
      )}
      {r.duration_seconds != null && (
        <span className="text-[11px] tabular-nums text-text-secondary">
          {formatDuration(r.duration_seconds)}
        </span>
      )}
      {r.usage && (
        <span
          className="px-1.5 py-0.5 rounded bg-accent-primary/10 text-[11px] font-medium tabular-nums text-accent-primary whitespace-nowrap"
          title={usageDetail(r.usage)}
        >
          {formatUsage(r.usage)}
        </span>
      )}
      <span className="flex items-center gap-1 ml-auto shrink-0 whitespace-nowrap">
        <RatingPill
          label="Naturalness"
          value={r.score?.["Speech Naturalness"] ?? r.score?.speech_naturalness}
        />
        <RatingPill
          label="Pronunciation"
          value={
            r.score?.["Pronunciation Accuracy"] ??
            r.score?.pronunciation_accuracy
          }
        />
        {issueCount > 0 && (
          <span
            className="text-[10px] font-medium text-status-error"
            title={r.issues?.join(", ")}
          >
            {issueCount} issue{issueCount > 1 ? "s" : ""}
          </span>
        )}
        {r.comment && (
          <span className="text-[10px] text-text-secondary" title={r.comment}>
            ✎
          </span>
        )}
      </span>
    </div>
  );
}

export default function TTSResultRow({
  sampleText,
  index,
  models,
  resultsByModel,
  playingResultId,
  selectedResultId,
  onPlayToggle,
  onSelect,
}: TTSResultRowProps) {
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-2.5 text-sm align-middle text-text-primary">
        <div className="flex gap-2">
          <span className="text-xs tabular-nums text-text-secondary pt-0.5">
            {index + 1}
          </span>
          <p className="line-clamp-2 leading-snug" title={sampleText}>
            {sampleText || "-"}
          </p>
        </div>
      </td>
      {models.map((model) => {
        const r = resultsByModel[model];
        return r ? (
          <td key={model} className="px-2 py-1.5 align-middle">
            <ResultCell
              r={r}
              isSelected={selectedResultId === r.id}
              isPlaying={playingResultId === r.id}
              onPlayToggle={onPlayToggle}
              onSelect={onSelect}
            />
          </td>
        ) : (
          <td key={model} className="px-4 py-2.5 text-xs text-text-secondary">
            -
          </td>
        );
      })}
    </tr>
  );
}
