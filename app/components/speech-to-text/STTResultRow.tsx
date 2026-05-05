"use client";

import { STTResult } from "@/app/lib/types/speechToText";
import AudioPlayerFromUrl from "./AudioPlayerFromUrl";
import { computeWordDiff } from "./TranscriptionDiffViewer";

interface STTResultRowProps {
  result: STTResult;
  isExpanded: boolean;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onToggleExpanded: () => void;
  onLocalCommentChange: (value: string) => void;
  onCommitFeedback: (
    isCorrect: boolean | null | undefined,
    comment?: string,
  ) => void;
}

const wipColorClass = (wip: number): string => {
  if (wip >= 0.9) return "text-status-success";
  if (wip >= 0.7) return "text-yellow-600";
  return "text-status-error";
};

const errorColorClass = (value: number): string => {
  if (value >= 0.8) return "text-status-error";
  if (value >= 0.4) return "text-yellow-600";
  return "text-status-success";
};

export default function STTResultRow({
  result,
  isExpanded,
  isPlaying,
  onPlayToggle,
  onToggleExpanded,
  onLocalCommentChange,
  onCommitFeedback,
}: STTResultRowProps) {
  const hasBoth = !!(result.groundTruth && result.transcription);
  const segments = hasBoth
    ? computeWordDiff(result.groundTruth, result.transcription)
    : [];

  const showExpandToggle =
    hasBoth &&
    (result.groundTruth!.length > 100 || result.transcription!.length > 100);

  const clampClass = isExpanded
    ? ""
    : "[display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden";

  const isCorrectValue =
    result.is_correct === null ? "" : result.is_correct ? "true" : "false";

  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3 text-sm align-top">
        {result.signedUrl ? (
          <AudioPlayerFromUrl
            signedUrl={result.signedUrl}
            sampleName={result.sampleName}
            isPlaying={isPlaying}
            onPlayToggle={onPlayToggle}
          />
        ) : (
          <div className="font-medium text-text-primary">
            {result.sampleName || "-"}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm align-top">
        <div>
          <div className="grid grid-cols-2 rounded-md overflow-hidden border border-border font-mono text-[12px]">
            <div>
              <div className="px-2 py-1.5 text-xs font-semibold border-b bg-bg-secondary border-border text-text-secondary">
                Ground Truth
              </div>
              <div
                className={`px-3 py-2 leading-relaxed bg-bg-primary ${clampClass}`}
              >
                {hasBoth ? (
                  segments.map((seg, idx) => {
                    if (seg.type === "insertion") return null;
                    const word = seg.reference || "";
                    const bgClass =
                      seg.type === "substitution"
                        ? "bg-amber-100"
                        : seg.type === "deletion"
                          ? "bg-red-100"
                          : "bg-transparent";
                    const colorClass =
                      seg.type === "deletion"
                        ? "text-red-600 line-through"
                        : "text-text-primary";
                    return (
                      <span key={idx}>
                        <span
                          className={`px-0.5 rounded ${bgClass} ${colorClass}`}
                          title={
                            seg.type === "substitution"
                              ? `→ "${seg.hypothesis}"`
                              : undefined
                          }
                        >
                          {seg.type === "deletion" && "- "}
                          {word}
                        </span>{" "}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-text-secondary">
                    {result.groundTruth || "-"}
                  </span>
                )}
              </div>
            </div>
            <div className="border-l border-border">
              <div className="px-2 py-1.5 text-xs font-semibold border-b bg-bg-secondary border-border text-text-secondary">
                Transcription
              </div>
              <div
                className={`px-3 py-2 leading-relaxed bg-bg-primary ${clampClass}`}
              >
                {hasBoth ? (
                  segments.map((seg, idx) => {
                    if (seg.type === "deletion") {
                      return (
                        <span key={idx}>
                          <span
                            className="px-0.5 rounded bg-red-100 text-red-600"
                            title={`Missing: "${seg.reference}"`}
                          >
                            ___
                          </span>{" "}
                        </span>
                      );
                    }
                    const word = seg.hypothesis || seg.reference || "";
                    const bgClass =
                      seg.type === "substitution"
                        ? "bg-amber-100"
                        : seg.type === "insertion"
                          ? "bg-green-100"
                          : "bg-transparent";
                    const colorClass =
                      seg.type === "insertion"
                        ? "text-green-600 font-medium"
                        : "text-text-primary";
                    return (
                      <span key={idx}>
                        <span
                          className={`px-0.5 rounded ${bgClass} ${colorClass}`}
                          title={
                            seg.type === "substitution"
                              ? `Was: "${seg.reference}"`
                              : seg.type === "insertion"
                                ? "Inserted"
                                : undefined
                          }
                        >
                          {seg.type === "insertion" && "+ "}
                          {word}
                        </span>{" "}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-text-secondary">
                    {result.transcription || "-"}
                  </span>
                )}
              </div>
            </div>
          </div>
          {showExpandToggle && (
            <button
              onClick={onToggleExpanded}
              className="text-xs mt-1.5 text-accent-primary cursor-pointer"
            >
              {isExpanded ? "Show less" : "Expand"}
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-xs align-top">
        {result.score ? (
          <div className="space-y-2">
            <div className="flex justify-between gap-2">
              <span className="text-text-secondary">Accuracy</span>
              <span
                className={`font-mono font-medium ${wipColorClass(result.score.wip)}`}
              >
                {(result.score.wip * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <div className="mb-1 text-text-secondary text-[10px] uppercase tracking-wide">
                Errors
              </div>
              <div className="space-y-1 pl-1 border-l-2 border-border">
                {[
                  { label: "WER", value: result.score.wer },
                  { label: "CER", value: result.score.cer },
                  { label: "Lenient WER", value: result.score.lenient_wer },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between gap-2 pl-1.5"
                  >
                    <span className="text-text-secondary">{label}</span>
                    <span
                      className={`font-mono font-medium ${errorColorClass(value)}`}
                    >
                      {(value * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-text-secondary">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm align-top">
        <select
          value={isCorrectValue}
          onChange={(e) => {
            const value = e.target.value;
            onCommitFeedback(value === "" ? null : value === "true");
          }}
          className={`px-3 py-1.5 border rounded text-xs font-medium cursor-pointer ${
            result.is_correct === null
              ? "bg-bg-primary border-border text-text-primary"
              : result.is_correct
                ? "bg-green-600/10 border-status-success text-status-success"
                : "bg-red-500/10 border-status-error text-status-error"
          }`}
        >
          <option value="">-</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </td>
      <td className="px-4 py-3 text-sm align-top">
        <div className="flex items-start gap-2">
          <textarea
            value={result.comment || ""}
            onChange={(e) => onLocalCommentChange(e.target.value)}
            onBlur={(e) =>
              onCommitFeedback(result.is_correct ?? null, e.target.value)
            }
            placeholder="Add your comment..."
            rows={2}
            className="flex-1 px-3 py-2 border rounded text-sm resize-y bg-bg-primary border-border text-text-primary"
          />
        </div>
      </td>
    </tr>
  );
}
