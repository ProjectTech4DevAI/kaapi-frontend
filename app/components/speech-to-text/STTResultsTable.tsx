"use client";

import { useEffect, useState } from "react";
import { STTResult } from "@/app/lib/types/speechToText";
import { ResultsTableSkeleton } from "@/app/components";
import STTResultRow from "./STTResultRow";
import STTScoreInfoTooltip from "./STTScoreInfoTooltip";

interface STTResultsTableProps {
  results: STTResult[];
  isLoading: boolean;
  setResults: React.Dispatch<React.SetStateAction<STTResult[]>>;
  onUpdateFeedback: (
    resultId: number,
    isCorrect: boolean | null | undefined,
    comment?: string,
  ) => void;
}

export default function STTResultsTable({
  results,
  isLoading,
  setResults,
  onUpdateFeedback,
}: STTResultsTableProps) {
  const [expandedTranscriptions, setExpandedTranscriptions] = useState<
    Set<number>
  >(new Set());
  const [openScoreInfo, setOpenScoreInfo] = useState<string | null>(null);
  const [scoreInfoPos, setScoreInfoPos] = useState({ top: 0, left: 0 });
  const [playingResultId, setPlayingResultId] = useState<number | null>(null);

  useEffect(() => {
    if (!openScoreInfo) return;
    const handleClick = () => setOpenScoreInfo(null);
    const handleScroll = () => setOpenScoreInfo(null);
    document.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [openScoreInfo]);

  const toggleTranscription = (resultId: number) => {
    setExpandedTranscriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  const handleScoreInfoClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setScoreInfoPos({ top: rect.bottom + 4, left: rect.left });
    setOpenScoreInfo(openScoreInfo ? null : "accuracy");
  };

  if (isLoading) {
    return <ResultsTableSkeleton rows={5} cols={5} />;
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
    <table className="w-full">
      <thead>
        <tr className="bg-bg-secondary border-b border-border">
          <th className="text-left px-4 py-3 text-xs font-medium align-top text-text-secondary w-[10%]">
            Sample
          </th>
          <th className="text-left px-4 py-3 text-xs font-medium align-top text-text-secondary w-[40%]">
            <div>
              <div>Ground Truth vs Transcription</div>
              <div className="flex items-center gap-2 font-normal mt-1">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded bg-red-100" />
                  <span className="text-text-secondary">Deletion</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded bg-green-100" />
                  <span className="text-text-secondary">Insertion</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded bg-amber-100" />
                  <span className="text-text-secondary">Substitution</span>
                </span>
              </div>
            </div>
          </th>
          <th className="text-left px-4 py-3 text-xs font-medium align-top text-text-secondary w-[15%]">
            <span className="inline-flex items-center gap-1">
              Score
              <span
                onClick={handleScoreInfoClick}
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-normal cursor-pointer shrink-0 bg-bg-primary border border-border text-text-secondary"
              >
                i
              </span>
              {openScoreInfo && (
                <STTScoreInfoTooltip
                  activeKey={openScoreInfo}
                  position={scoreInfoPos}
                  onSelectKey={setOpenScoreInfo}
                />
              )}
            </span>
          </th>
          <th className="text-left px-4 py-3 text-xs font-medium align-top text-text-secondary w-[8%]">
            Is Correct
          </th>
          <th className="text-left px-4 py-3 text-xs font-medium align-top text-text-secondary w-[27%]">
            Comment
          </th>
        </tr>
      </thead>
      <tbody>
        {results.map((result) => (
          <STTResultRow
            key={result.id}
            result={result}
            isExpanded={expandedTranscriptions.has(result.id)}
            isPlaying={playingResultId === result.id}
            onPlayToggle={() =>
              setPlayingResultId(
                playingResultId === result.id ? null : result.id,
              )
            }
            onToggleExpanded={() => toggleTranscription(result.id)}
            onLocalCommentChange={(value) =>
              setResults((prev) =>
                prev.map((r) =>
                  r.id === result.id ? { ...r, comment: value } : r,
                ),
              )
            }
            onCommitFeedback={(isCorrect, comment) =>
              onUpdateFeedback(result.id, isCorrect, comment)
            }
          />
        ))}
      </tbody>
    </table>
  );
}
