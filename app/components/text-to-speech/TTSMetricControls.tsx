"use client";

import { TTSMetricControlsProps } from "@/app/lib/types/textToSpeech";
import { RadioGroup } from "@/app/components/ui";
import { CONTENT } from "./TTSScoreInfoTooltip";

const LEVELS = ["High", "Medium", "Low"] as const;

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

const CORRECT_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

// Clicking the selected option again clears the rating.
export default function TTSMetricControls({
  result,
  onChange,
}: TTSMetricControlsProps) {
  const disabled = result.status !== "SUCCESS";
  const correct =
    result.is_correct == null ? "" : result.is_correct ? "yes" : "no";

  return (
    <div className="mt-3 space-y-1.5">
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
            <RadioGroup
              ariaLabel={label}
              value={current}
              disabled={disabled}
              options={LEVELS.map((value) => ({
                value,
                label: value,
                title: info[value.toLowerCase() as "high" | "medium" | "low"],
              }))}
              onChange={(value) =>
                onChange({
                  score: { [scoreKey]: value === current ? null : value },
                })
              }
            />
          </div>
        );
      })}
      <div>
        <div className="text-[11px] mb-0.5 text-text-secondary">
          Transcript correct?
        </div>
        <RadioGroup
          ariaLabel="Transcript correct?"
          value={correct}
          disabled={disabled}
          options={CORRECT_OPTIONS}
          onChange={(value) =>
            onChange({ is_correct: value === correct ? null : value === "yes" })
          }
        />
      </div>
    </div>
  );
}
