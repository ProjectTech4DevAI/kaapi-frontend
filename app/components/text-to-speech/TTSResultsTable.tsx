"use client";

import { useEffect, useState } from "react";
import { TTSResult, TTSScore } from "@/app/lib/types/textToSpeech";
import { ResultsTableSkeleton } from "@/app/components";
import TTSResultRow from "./TTSResultRow";
import TTSScoreInfoTooltip from "./TTSScoreInfoTooltip";

interface TTSResultsTableProps {
  results: TTSResult[];
  isLoading: boolean;
  setResults: React.Dispatch<React.SetStateAction<TTSResult[]>>;
  onUpdateFeedback: (
    resultId: number,
    isCorrect: boolean | null | undefined,
    comment?: string,
    score?: TTSScore,
  ) => void;
}

type ScoreInfoKey = "speech_naturalness" | "pronunciation_accuracy";

export default function TTSResultsTable({
  results,
  isLoading,
  setResults,
  onUpdateFeedback,
}: TTSResultsTableProps) {
  const [playingResultId, setPlayingResultId] = useState<number | null>(null);
  const [openScoreInfo, setOpenScoreInfo] = useState<ScoreInfoKey | null>(null);
  const [scoreInfoPos, setScoreInfoPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!openScoreInfo) return;
    const handleClose = () => setOpenScoreInfo(null);
    document.addEventListener("click", handleClose);
    document.addEventListener("scroll", handleClose, true);
    return () => {
      document.removeEventListener("click", handleClose);
      document.removeEventListener("scroll", handleClose, true);
    };
  }, [openScoreInfo]);

  const handleScoreInfoClick = (
    e: React.MouseEvent<HTMLSpanElement>,
    key: ScoreInfoKey,
  ) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setScoreInfoPos({ top: rect.bottom + 4, left: rect.left });
    setOpenScoreInfo(openScoreInfo === key ? null : key);
  };

  if (isLoading) {
    return <ResultsTableSkeleton rows={5} cols={6} />;
  }

  if (results.length === 0) {
    return (
      <div className="p-16 text-center">
        <p className="text-sm font-medium mb-1 text-text-primary">
          No results found
        </p>
        <p className="text-xs text-text-secondary">
          This evaluation has no results yet
        </p>
      </div>
    );
  }

  return (
    <table className="w-full min-w-[900px]">
      <thead>
        <tr className="bg-bg-secondary border-b border-border">
          <th className="text-left px-4 py-3 text-xs font-medium align-top text-text-secondary w-[24%]">
            Text
          </th>
          <th className="text-left px-4 py-3 text-xs font-medium align-top text-text-secondary w-[18%]">
            Audio
          </th>
          <th className="text-left px-3 py-3 text-xs font-medium align-top text-text-secondary w-[12%]">
            <div>
              <div>Speech</div>
              <div>
                Naturalness{" "}
                <span
                  onClick={(e) => handleScoreInfoClick(e, "speech_naturalness")}
                  className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-normal cursor-pointer align-middle bg-bg-primary border border-border text-text-secondary"
                >
                  i
                </span>
                {openScoreInfo === "speech_naturalness" && (
                  <TTSScoreInfoTooltip
                    metricKey="speech_naturalness"
                    position={scoreInfoPos}
                  />
                )}
              </div>
            </div>
          </th>
          <th className="text-left px-3 py-3 text-xs font-medium align-top text-text-secondary w-[12%]">
            <div>
              <div>Pronunciation</div>
              <div>
                Accuracy{" "}
                <span
                  onClick={(e) =>
                    handleScoreInfoClick(e, "pronunciation_accuracy")
                  }
                  className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-normal cursor-pointer align-middle bg-bg-primary border border-border text-text-secondary"
                >
                  i
                </span>
                {openScoreInfo === "pronunciation_accuracy" && (
                  <TTSScoreInfoTooltip
                    metricKey="pronunciation_accuracy"
                    position={scoreInfoPos}
                  />
                )}
              </div>
            </div>
          </th>
          <th className="text-left px-3 py-3 text-xs font-medium align-top text-text-secondary w-[12%]">
            Is Correct
          </th>
          <th className="text-left px-4 py-3 text-xs font-medium align-top text-text-secondary w-[18%]">
            Comment
          </th>
        </tr>
      </thead>
      <tbody>
        {results.map((result, idx) => (
          <TTSResultRow
            key={result.id}
            result={result}
            index={idx}
            isPlaying={playingResultId === result.id}
            onPlayToggle={() =>
              setPlayingResultId(
                playingResultId === result.id ? null : result.id,
              )
            }
            onUpdateLocalScore={(newScore) =>
              setResults((prev) =>
                prev.map((r) =>
                  r.id === result.id ? { ...r, score: newScore } : r,
                ),
              )
            }
            onUpdateLocalCorrect={(value) =>
              setResults((prev) =>
                prev.map((r) =>
                  r.id === result.id ? { ...r, is_correct: value } : r,
                ),
              )
            }
            onUpdateLocalComment={(value) =>
              setResults((prev) =>
                prev.map((r) =>
                  r.id === result.id ? { ...r, comment: value } : r,
                ),
              )
            }
            onCommitFeedback={(isCorrect, comment, score) =>
              onUpdateFeedback(result.id, isCorrect, comment, score)
            }
          />
        ))}
      </tbody>
    </table>
  );
}
