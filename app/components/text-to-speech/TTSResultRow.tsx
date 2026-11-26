"use client";

import { TTSResult } from "@/app/lib/types/textToSpeech";
import { PauseIcon, PlayIcon } from "@/app/components/icons";
import { InfoTooltip } from "@/app/components/ui";
import { formatDuration, formatUsage, usageDetail } from "@/app/lib/utils/tts";

interface TTSResultRowProps {
  sampleText: string;
  index: number;
  models: string[];
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

const IN_PROGRESS = ["PENDING", "PROCESSING"];

function RatingPill({ label, value }: { label: string; value: unknown }) {
  if (typeof value !== "string" || !value) return null;
  const tone = RATING_TONE[value.toLowerCase()] ?? "bg-bg-secondary";
  return (
    <InfoTooltip
      text={`${label}: ${value}`}
      triggerClassName={`px-1 rounded text-[10px] font-medium cursor-default ${tone}`}
      icon={`${label[0]}·${value[0].toUpperCase()}`}
    />
  );
}

function PlayButton({
  isPlaying,
  onClick,
}: {
  isPlaying: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const Icon = isPlaying ? PauseIcon : PlayIcon;
  return (
    <button
      type="button"
      aria-label={isPlaying ? "Pause" : "Play"}
      onClick={onClick}
      className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full border-2 border-accent-primary text-accent-primary cursor-pointer"
    >
      <Icon className="w-2.5! h-2.5!" />
    </button>
  );
}

function ResultCell({
  result,
  isSelected,
  isPlaying,
  onPlayToggle,
  onSelect,
}: {
  result: TTSResult;
  isSelected: boolean;
  isPlaying: boolean;
  onPlayToggle: (resultId: number) => void;
  onSelect: (resultId: number) => void;
}) {
  const issueCount = result.issues?.length ?? 0;
  const failure =
    result.status === "SUCCESS"
      ? "No audio"
      : (result.error_message ?? result.status);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(result.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(result.id)}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer border ${
        isSelected
          ? "border-accent-primary bg-accent-primary/5"
          : "border-transparent hover:bg-bg-secondary"
      }`}
    >
      {result.signedUrl ? (
        <PlayButton
          isPlaying={isPlaying}
          onClick={(e) => {
            e.stopPropagation();
            onPlayToggle(result.id);
          }}
        />
      ) : IN_PROGRESS.includes(result.status) ? (
        <span className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
          Generating…
        </span>
      ) : (
        <InfoTooltip
          text={failure}
          triggerClassName="text-xs text-status-error truncate max-w-[8rem] cursor-default"
          icon={failure}
        />
      )}
      {result.duration_seconds != null && (
        <span className="text-[11px] tabular-nums text-text-secondary">
          {formatDuration(result.duration_seconds)}
        </span>
      )}
      {result.usage && (
        <InfoTooltip
          text={usageDetail(result.usage)}
          triggerClassName="px-1.5 py-0.5 rounded bg-accent-primary/10 text-[11px] font-medium tabular-nums text-accent-primary whitespace-nowrap cursor-default"
          icon={formatUsage(result.usage)}
        />
      )}
      <span className="flex items-center gap-1 ml-auto shrink-0 whitespace-nowrap">
        <RatingPill
          label="Naturalness"
          value={
            result.score?.["Speech Naturalness"] ??
            result.score?.speech_naturalness
          }
        />
        <RatingPill
          label="Pronunciation"
          value={
            result.score?.["Pronunciation Accuracy"] ??
            result.score?.pronunciation_accuracy
          }
        />
        {issueCount > 0 && (
          <InfoTooltip
            text={result.issues?.join(", ")}
            triggerClassName="text-[10px] font-medium text-status-error cursor-default"
            icon={`${issueCount} issue${issueCount > 1 ? "s" : ""}`}
          />
        )}
        {result.comment && (
          <InfoTooltip
            text={result.comment}
            triggerClassName="text-[10px] text-text-secondary cursor-default"
            icon="✎"
          />
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
        const result = resultsByModel[model];
        return result ? (
          <td key={model} className="px-2 py-1.5 align-middle">
            <ResultCell
              result={result}
              isSelected={selectedResultId === result.id}
              isPlaying={playingResultId === result.id}
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
