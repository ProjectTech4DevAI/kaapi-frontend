/**
 * TranscriptionDiffViewer Component
 *
 * Shows inline diff between ground truth and hypothesis transcriptions.
 * Highlights substitutions (yellow), deletions (red), and insertions (green).
 */

import { useMemo } from "react";

export interface DiffSegment {
  type: "match" | "substitution" | "deletion" | "insertion";
  reference?: string;
  hypothesis?: string;
}

interface TranscriptionDiffViewerProps {
  groundTruth: string;
  hypothesis: string;
  showLegend?: boolean;
  compact?: boolean;
}

// Tailwind classes for the diff highlight palette. Kept as constants so the
// reference and hypothesis rows stay in sync.
const SUBSTITUTION_BG = "bg-status-warning-bg text-status-warning-text";
const DELETION_BG = "bg-status-error-bg text-status-error-text";
const INSERTION_BG = "bg-status-success-bg text-status-success-text";

export function computeWordDiff(
  reference: string,
  hypothesis: string,
): DiffSegment[] {
  const refWords = reference
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const hypWords = hypothesis
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (refWords.length === 0 && hypWords.length === 0) return [];
  if (refWords.length === 0)
    return hypWords.map((w) => ({ type: "insertion", hypothesis: w }));
  if (hypWords.length === 0)
    return refWords.map((w) => ({ type: "deletion", reference: w }));

  const m = refWords.length;
  const n = hypWords.length;

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  const ops: string[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(""));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const refWord = refWords[i - 1].toLowerCase();
      const hypWord = hypWords[j - 1].toLowerCase();

      if (refWord === hypWord) {
        dp[i][j] = dp[i - 1][j - 1];
        ops[i][j] = "match";
      } else {
        const sub = dp[i - 1][j - 1] + 1;
        const del = dp[i - 1][j] + 1;
        const ins = dp[i][j - 1] + 1;

        if (sub <= del && sub <= ins) {
          dp[i][j] = sub;
          ops[i][j] = "sub";
        } else if (del <= ins) {
          dp[i][j] = del;
          ops[i][j] = "del";
        } else {
          dp[i][j] = ins;
          ops[i][j] = "ins";
        }
      }
    }
  }

  const segments: DiffSegment[] = [];
  let i = m,
    j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ops[i][j] === "match") {
      segments.unshift({
        type: "match",
        reference: refWords[i - 1],
        hypothesis: hypWords[j - 1],
      });
      i--;
      j--;
    } else if (i > 0 && j > 0 && ops[i][j] === "sub") {
      segments.unshift({
        type: "substitution",
        reference: refWords[i - 1],
        hypothesis: hypWords[j - 1],
      });
      i--;
      j--;
    } else if (i > 0 && (j === 0 || ops[i][j] === "del")) {
      segments.unshift({ type: "deletion", reference: refWords[i - 1] });
      i--;
    } else {
      segments.unshift({ type: "insertion", hypothesis: hypWords[j - 1] });
      j--;
    }
  }

  return segments;
}

export default function TranscriptionDiffViewer({
  groundTruth,
  hypothesis,
  showLegend = true,
  compact = false,
}: TranscriptionDiffViewerProps) {
  const diffSegments = useMemo(
    () => computeWordDiff(groundTruth, hypothesis),
    [groundTruth, hypothesis],
  );

  const stats = useMemo(() => {
    let matches = 0,
      substitutions = 0,
      deletions = 0,
      insertions = 0;
    diffSegments.forEach((seg) => {
      if (seg.type === "match") matches++;
      else if (seg.type === "substitution") substitutions++;
      else if (seg.type === "deletion") deletions++;
      else if (seg.type === "insertion") insertions++;
    });
    return { matches, substitutions, deletions, insertions };
  }, [diffSegments]);

  if (!groundTruth && !hypothesis) {
    return (
      <div className="text-sm italic text-text-secondary">
        No text to compare
      </div>
    );
  }

  const rowPad = compact ? "p-2" : "p-3";

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {showLegend && (
        <div className="flex items-center gap-4 text-xs text-text-secondary flex-wrap">
          <LegendChip
            color="bg-status-warning-bg"
            label={`Substitution (${stats.substitutions})`}
          />
          <LegendChip
            color="bg-status-error-bg"
            label={`Deletion (${stats.deletions})`}
          />
          <LegendChip
            color="bg-status-success-bg"
            label={`Insertion (${stats.insertions})`}
          />
          <span>Correct: {stats.matches}</span>
        </div>
      )}

      <div>
        <div className="text-xs font-medium mb-1.5 text-text-secondary">
          Ground Truth
        </div>
        <div
          className={`${rowPad} rounded-md font-mono text-sm leading-relaxed bg-bg-secondary`}
        >
          {diffSegments.map((seg, idx) => {
            if (seg.type === "insertion") return null;
            const word = seg.reference || "";

            const tone =
              seg.type === "substitution"
                ? SUBSTITUTION_BG
                : seg.type === "deletion"
                  ? `${DELETION_BG} line-through`
                  : "text-text-primary";

            return (
              <span key={idx}>
                <span
                  className={`px-0.5 rounded ${tone}`}
                  title={
                    seg.type === "substitution"
                      ? `→ "${seg.hypothesis}"`
                      : undefined
                  }
                >
                  {word}
                </span>
                {idx < diffSegments.length - 1 &&
                  diffSegments[idx + 1]?.type !== "insertion" &&
                  " "}
              </span>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs font-medium mb-1.5 text-text-secondary">
          Hypothesis (Transcription)
        </div>
        <div
          className={`${rowPad} rounded-md font-mono text-sm leading-relaxed bg-bg-secondary`}
        >
          {diffSegments.map((seg, idx) => {
            if (seg.type === "deletion") {
              return (
                <span key={idx}>
                  <span
                    className={`px-1 mx-0.5 rounded text-xs ${DELETION_BG}`}
                    title={`Missing: "${seg.reference}"`}
                  >
                    ___
                  </span>{" "}
                </span>
              );
            }

            const word = seg.hypothesis || seg.reference || "";
            const tone =
              seg.type === "substitution"
                ? SUBSTITUTION_BG
                : seg.type === "insertion"
                  ? `${INSERTION_BG} font-medium`
                  : "text-text-primary";

            return (
              <span key={idx}>
                <span
                  className={`px-0.5 rounded ${tone}`}
                  title={
                    seg.type === "substitution"
                      ? `Was: "${seg.reference}"`
                      : seg.type === "insertion"
                        ? "Inserted"
                        : undefined
                  }
                >
                  {word}
                </span>{" "}
              </span>
            );
          })}
        </div>
      </div>

      {!compact && (
        <div>
          <div className="text-xs font-medium mb-1.5 text-text-secondary">
            Inline Comparison
          </div>
          <div className="p-3 rounded-md font-mono text-sm leading-loose border border-border bg-bg-primary">
            {diffSegments.map((seg, idx) => {
              if (seg.type === "match") {
                return (
                  <span key={idx}>
                    <span className="text-text-primary">
                      {seg.reference}
                    </span>{" "}
                  </span>
                );
              }

              if (seg.type === "substitution") {
                return (
                  <span key={idx}>
                    <span
                      className={`px-1 rounded line-through ${SUBSTITUTION_BG}`}
                    >
                      {seg.reference}
                    </span>
                    <span
                      className={`px-1 rounded ml-0.5 font-medium ${SUBSTITUTION_BG}`}
                    >
                      {seg.hypothesis}
                    </span>{" "}
                  </span>
                );
              }

              if (seg.type === "deletion") {
                return (
                  <span key={idx}>
                    <span
                      className={`px-1 rounded line-through ${DELETION_BG}`}
                    >
                      {seg.reference}
                    </span>{" "}
                  </span>
                );
              }

              if (seg.type === "insertion") {
                return (
                  <span key={idx}>
                    <span
                      className={`px-1 rounded font-medium ${INSERTION_BG}`}
                    >
                      +{seg.hypothesis}
                    </span>{" "}
                  </span>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded ${color}`} />
      <span>{label}</span>
    </div>
  );
}
