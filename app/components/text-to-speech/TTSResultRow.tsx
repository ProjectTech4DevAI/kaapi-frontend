"use client";

import { TTSResult, TTSScore } from "@/app/lib/types/textToSpeech";
import AudioPlayerFromUrl from "./AudioPlayerFromUrl";

interface TTSResultRowProps {
  result: TTSResult;
  index: number;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onUpdateLocalScore: (score: TTSScore) => void;
  onUpdateLocalCorrect: (value: boolean | null) => void;
  onUpdateLocalComment: (value: string) => void;
  onCommitFeedback: (
    isCorrect: boolean | null | undefined,
    comment?: string,
    score?: TTSScore,
  ) => void;
}

const ratingClass = (
  rating: string,
): { bg: string; border: string; text: string } => {
  if (!rating) {
    return {
      bg: "bg-bg-primary",
      border: "border-border",
      text: "text-text-primary",
    };
  }
  if (rating === "High") {
    return {
      bg: "bg-green-600/10",
      border: "border-status-success",
      text: "text-status-success",
    };
  }
  if (rating === "Medium") {
    return {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500",
      text: "text-yellow-600",
    };
  }
  return {
    bg: "bg-red-500/10",
    border: "border-status-error",
    text: "text-status-error",
  };
};

const correctnessClass = (
  value: boolean | null,
): { bg: string; border: string; text: string } => {
  if (value === null) {
    return {
      bg: "bg-bg-primary",
      border: "border-border",
      text: "text-text-primary",
    };
  }
  if (value) {
    return {
      bg: "bg-green-600/10",
      border: "border-status-success",
      text: "text-status-success",
    };
  }
  return {
    bg: "bg-red-500/10",
    border: "border-status-error",
    text: "text-status-error",
  };
};

export default function TTSResultRow({
  result,
  index,
  isPlaying,
  onPlayToggle,
  onUpdateLocalScore,
  onUpdateLocalCorrect,
  onUpdateLocalComment,
  onCommitFeedback,
}: TTSResultRowProps) {
  const isSuccess = result.status === "SUCCESS";

  const snVal =
    result.score?.["Speech Naturalness"] ||
    result.score?.speech_naturalness ||
    "";
  const normalizedSn = snVal
    ? snVal.charAt(0).toUpperCase() + snVal.slice(1).toLowerCase()
    : "";

  const paVal =
    result.score?.["Pronunciation Accuracy"] ||
    result.score?.pronunciation_accuracy ||
    "";
  const normalizedPa = paVal
    ? paVal.charAt(0).toUpperCase() + paVal.slice(1).toLowerCase()
    : "";

  const isCorrectValue =
    result.is_correct === null ? "" : result.is_correct ? "true" : "false";

  const snStyles = ratingClass(normalizedSn);
  const paStyles = ratingClass(normalizedPa);
  const correctStyles = correctnessClass(result.is_correct);

  const disabledClass = isSuccess
    ? "cursor-pointer opacity-100"
    : "cursor-not-allowed opacity-50";

  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3 text-sm align-top text-text-primary">
        <div className="overflow-y-auto max-h-20 leading-relaxed">
          {result.sample_text || "-"}
        </div>
      </td>
      <td className="px-4 py-3 text-sm align-top">
        {result.signedUrl ? (
          <AudioPlayerFromUrl
            signedUrl={result.signedUrl}
            isPlaying={isPlaying}
            onPlayToggle={onPlayToggle}
            sampleLabel={`Sample ${index + 1}`}
            durationSeconds={result.duration_seconds}
            sizeBytes={result.size_bytes}
          />
        ) : (
          <span className="text-xs text-text-secondary">
            {result.status === "SUCCESS" ? "No audio available" : "-"}
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-sm align-top">
        <select
          value={normalizedSn}
          onChange={(e) => {
            const value = e.target.value || null;
            const newScore: TTSScore = {
              ...(result.score || {}),
              "Speech Naturalness": value,
            };
            onUpdateLocalScore(newScore);
            onCommitFeedback(result.is_correct, undefined, {
              "Speech Naturalness": value,
            });
          }}
          disabled={!isSuccess}
          className={`w-full px-2 py-1.5 border rounded text-xs font-medium ${snStyles.bg} ${snStyles.border} ${snStyles.text} ${disabledClass}`}
        >
          <option value="">-</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </td>
      <td className="px-3 py-3 text-sm align-top">
        <select
          value={normalizedPa}
          onChange={(e) => {
            const value = e.target.value || null;
            const newScore: TTSScore = {
              ...(result.score || {}),
              "Pronunciation Accuracy": value,
            };
            onUpdateLocalScore(newScore);
            onCommitFeedback(result.is_correct, undefined, {
              "Pronunciation Accuracy": value,
            });
          }}
          disabled={!isSuccess}
          className={`w-full px-2 py-1.5 border rounded text-xs font-medium ${paStyles.bg} ${paStyles.border} ${paStyles.text} ${disabledClass}`}
        >
          <option value="">-</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </td>
      <td className="px-3 py-3 text-sm align-top">
        <select
          value={isCorrectValue}
          onChange={(e) => {
            const value = e.target.value;
            const next = value === "" ? null : value === "true";
            onUpdateLocalCorrect(next);
            onCommitFeedback(next);
          }}
          disabled={!isSuccess}
          className={`w-full px-2 py-1.5 border rounded text-xs font-medium ${correctStyles.bg} ${correctStyles.border} ${correctStyles.text} ${disabledClass}`}
        >
          <option value="">-</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </td>
      <td className="px-4 py-3 text-sm align-top">
        <textarea
          value={result.comment || ""}
          onChange={(e) => onUpdateLocalComment(e.target.value)}
          onBlur={(e) => {
            if (isSuccess) {
              onCommitFeedback(result.is_correct, e.target.value);
            }
          }}
          placeholder="Add comment..."
          rows={2}
          disabled={!isSuccess}
          className={`w-full px-2 py-1.5 border rounded text-xs resize-y bg-bg-primary border-border text-text-primary ${
            isSuccess
              ? "opacity-100 cursor-text"
              : "opacity-50 cursor-not-allowed"
          }`}
        />
      </td>
    </tr>
  );
}
