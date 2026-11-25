"use client";

import { TTSResult, TTSScore } from "@/app/lib/types/textToSpeech";
import { CONTENT } from "./TTSScoreInfoTooltip";

export interface TTSFeedbackPatch {
  score?: TTSScore;
  is_correct?: boolean | null;
}

interface Props {
  result: TTSResult;
  onChange: (patch: TTSFeedbackPatch) => void;
}

const LEVELS = [
  { value: "High", active: "bg-green-600/15 text-status-success" },
  { value: "Medium", active: "bg-yellow-500/15 text-yellow-600" },
  { value: "Low", active: "bg-red-500/15 text-status-error" },
] as const;

const METRICS = [
  {
    label: "Naturalness",
    scoreKey: "Speech Naturalness",
    altKey: "speech_naturalness",
    info: CONTENT.speech_naturalness,
  },
  {
    label: "Pronunciation",
    scoreKey: "Pronunciation Accuracy",
    altKey: "pronunciation_accuracy",
    info: CONTENT.pronunciation_accuracy,
  },
] as const;

const btn = (on: boolean, activeCls: string) =>
  `flex-1 px-1.5 py-1 text-[11px] font-medium cursor-pointer ${
    on ? activeCls : "bg-bg-primary text-text-secondary hover:bg-bg-secondary"
  }`;

// Segmented one-click rating; clicking the active option clears it.
export default function TTSMetricControls({ result, onChange }: Props) {
  const disabled = result.status !== "SUCCESS";

  return (
    <div
      className={`mt-3 space-y-1.5 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      {METRICS.map(({ label, scoreKey, altKey, info }) => {
        const raw = (result.score?.[scoreKey] ?? result.score?.[altKey]) as
          | string
          | undefined;
        const current = raw
          ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
          : "";
        return (
          <div key={scoreKey}>
            <div className="text-[11px] mb-0.5 text-text-secondary">
              {label}
            </div>
            <div className="flex border border-border rounded overflow-hidden divide-x divide-border">
              {LEVELS.map(({ value, active }) => (
                <button
                  key={value}
                  type="button"
                  title={info[value.toLowerCase() as "high" | "medium" | "low"]}
                  onClick={() =>
                    onChange({
                      score: { [scoreKey]: current === value ? null : value },
                    })
                  }
                  className={btn(current === value, active)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <div>
        <div className="text-[11px] mb-0.5 text-text-secondary">
          Transcript correct?
        </div>
        <div className="flex border border-border rounded overflow-hidden divide-x divide-border">
          {[
            { label: "Yes", v: true, active: LEVELS[0].active },
            { label: "No", v: false, active: LEVELS[2].active },
          ].map(({ label, v, active }) => (
            <button
              key={label}
              type="button"
              onClick={() =>
                onChange({ is_correct: result.is_correct === v ? null : v })
              }
              className={btn(result.is_correct === v, active)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
