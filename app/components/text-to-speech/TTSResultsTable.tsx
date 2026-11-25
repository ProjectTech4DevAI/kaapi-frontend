"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  TTSFeedbackPayload,
  TTSResult,
  TTSScore,
} from "@/app/lib/types/textToSpeech";
import { ResultsTableSkeleton } from "@/app/components";
import TTSResultRow from "./TTSResultRow";
import TTSReviewPanel from "./TTSReviewPanel";
import { formatUsage, totalUsage } from "./ttsFormat";

interface TTSResultsTableProps {
  results: TTSResult[];
  isLoading: boolean;
  setResults: React.Dispatch<React.SetStateAction<TTSResult[]>>;
  onUpdateFeedback: (resultId: number, payload: TTSFeedbackPayload) => void;
}

// Mirrors the API: score merges per key and a null value clears that key.
function mergeScore(prev: TTSScore | null, patch: TTSScore): TTSScore | null {
  const next: TTSScore = { ...prev };
  for (const [k, v] of Object.entries(patch)) {
    if (v == null) delete next[k];
    else next[k] = v;
  }
  return Object.keys(next).length ? next : null;
}

export default function TTSResultsTable({
  results,
  isLoading,
  setResults,
  onUpdateFeedback,
}: TTSResultsTableProps) {
  const [playingResultId, setPlayingResultId] = useState<number | null>(null);
  const [selected, setSelected] = useState<{
    row: number;
    model: string;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // One row per sample, one column per model. Rows are keyed by text plus the
  // occurrence index so repeated texts in a dataset don't collapse into one row.
  const { models, rows } = useMemo(() => {
    const models: string[] = [];
    const seen: Record<string, number> = {};
    const rows = new Map<string, Record<string, TTSResult>>();
    for (const r of results) {
      if (!models.includes(r.provider)) models.push(r.provider);
      const k = `${r.provider}|${r.sample_text}`;
      const n = (seen[k] = (seen[k] ?? -1) + 1);
      const rowKey = `${r.sample_text}#${n}`;
      rows.set(rowKey, { ...rows.get(rowKey), [r.provider]: r });
    }
    return { models, rows: [...rows.entries()] };
  }, [results]);

  const selectedResult = selected
    ? rows[selected.row]?.[1][selected.model]
    : undefined;
  const playingUrl = results.find((r) => r.id === playingResultId)?.signedUrl;

  // A single <audio> element so a cell and the panel never play over each other.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingUrl) {
      audio.src = playingUrl;
      audio.play().catch(() => setPlayingResultId(null));
    } else {
      audio.pause();
    }
  }, [playingUrl]);

  const togglePlay = (id: number) =>
    setPlayingResultId((cur) => (cur === id ? null : id));

  const select = (id: number) => {
    const row = rows.findIndex(([, byModel]) =>
      Object.values(byModel).some((r) => r.id === id),
    );
    const model = results.find((r) => r.id === id)?.provider;
    if (row >= 0 && model) setSelected({ row, model });
  };

  const navigate = (dRow: number, dModel: number) =>
    setSelected((cur) => {
      if (!cur) return cur;
      const row = Math.min(rows.length - 1, Math.max(0, cur.row + dRow));
      const mi = models.indexOf(cur.model) + dModel;
      const model = models[Math.min(models.length - 1, Math.max(0, mi))];
      return { row, model };
    });

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable=true]")) return;
      const moves: Record<string, [number, number]> = {
        ArrowDown: [1, 0],
        ArrowUp: [-1, 0],
        ArrowRight: [0, 1],
        ArrowLeft: [0, -1],
      };
      if (moves[e.key]) {
        e.preventDefault();
        navigate(...moves[e.key]);
      } else if (e.key === " " && selectedResult?.signedUrl) {
        e.preventDefault();
        togglePlay(selectedResult.id);
      } else if (e.key === "Escape") {
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const applyFeedback = (id: number, payload: TTSFeedbackPayload) => {
    setResults((prev) =>
      prev.map((r) =>
        r.id !== id
          ? r
          : {
              ...r,
              ...(payload.is_correct !== undefined && {
                is_correct: payload.is_correct,
              }),
              ...(payload.comment !== undefined && {
                comment: payload.comment,
              }),
              ...(payload.issues !== undefined && { issues: payload.issues }),
              ...(payload.score && {
                score: mergeScore(r.score, payload.score),
              }),
            },
      ),
    );
    onUpdateFeedback(id, payload);
  };

  const modelHeader = (model: string) => {
    const mine = results.filter((r) => r.provider === model);
    const done = mine.filter((r) => r.status === "SUCCESS");
    const rated = done.filter((r) =>
      Object.values(r.score ?? {}).some(Boolean),
    ).length;
    const usage = formatUsage(totalUsage(mine));
    return { voice: mine[0]?.voice, rated, total: done.length, usage };
  };

  if (isLoading) {
    return <ResultsTableSkeleton rows={5} cols={4} />;
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
    <div className="flex">
      <audio ref={audioRef} onEnded={() => setPlayingResultId(null)} hidden />
      <div className="flex-1 min-w-0 overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="bg-bg-secondary border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-medium align-top text-text-secondary w-[34%]">
                Sample
              </th>
              {models.map((model) => {
                const h = modelHeader(model);
                return (
                  <th
                    key={model}
                    className="text-left px-4 py-3 text-xs font-medium align-top text-text-primary whitespace-nowrap"
                  >
                    {model}
                    <div className="font-normal text-text-secondary">
                      {h.voice ?? "default voice"} · {h.rated}/{h.total} rated
                    </div>
                    {h.usage && (
                      <div className="font-normal text-text-secondary tabular-nums">
                        {h.usage}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, resultsByModel], idx) => (
              <TTSResultRow
                key={key}
                sampleText={Object.values(resultsByModel)[0].sample_text}
                index={idx}
                models={models}
                resultsByModel={resultsByModel}
                playingResultId={playingResultId}
                selectedResultId={selectedResult?.id ?? null}
                onPlayToggle={togglePlay}
                onSelect={select}
              />
            ))}
          </tbody>
        </table>
      </div>

      {selected && selectedResult && (
        <TTSReviewPanel
          result={selectedResult}
          sampleIndex={selected.row}
          sampleCount={rows.length}
          isPlaying={playingResultId === selectedResult.id}
          onPlayToggle={() => togglePlay(selectedResult.id)}
          onFeedback={(payload) => applyFeedback(selectedResult.id, payload)}
          onNavigate={navigate}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
