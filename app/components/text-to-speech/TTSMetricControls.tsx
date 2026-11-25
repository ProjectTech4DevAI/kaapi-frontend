"use client";

import { TTSMetricControlsProps } from "@/app/lib/types/textToSpeech";
import { Button } from "@/app/components/ui";
import { CONTENT } from "./TTSScoreInfoTooltip";

const LEVELS = [
  { value: "High", active: "bg-green-600/15! text-status-success!" },
  { value: "Medium", active: "bg-yellow-500/15! text-yellow-600!" },
  { value: "Low", active: "bg-red-500/15! text-status-error!" },
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

interface SegmentedOption {
  label: string;
  selected: boolean;
  activeClass: string;
  title?: string;
  onSelect: () => void;
}

// Radio semantics, except clicking the selected option clears the rating.
function Segmented({
  ariaLabel,
  options,
}: {
  ariaLabel: string;
  options: SegmentedOption[];
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex border border-border rounded overflow-hidden divide-x divide-border"
    >
      {options.map(({ label, selected, activeClass, title, onSelect }) => (
        <Button
          key={label}
          variant="ghost"
          role="radio"
          aria-checked={selected}
          title={title}
          onClick={onSelect}
          className={`flex-1 rounded-none! px-1.5! py-1! text-[11px]! ${
            selected ? activeClass : ""
          }`}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

export default function TTSMetricControls({
  result,
  onChange,
}: TTSMetricControlsProps) {
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
            <Segmented
              ariaLabel={label}
              options={LEVELS.map(({ value, active }) => ({
                label: value,
                selected: current === value,
                activeClass: active,
                title: info[value.toLowerCase() as "high" | "medium" | "low"],
                onSelect: () =>
                  onChange({
                    score: { [scoreKey]: current === value ? null : value },
                  }),
              }))}
            />
          </div>
        );
      })}
      <div>
        <div className="text-[11px] mb-0.5 text-text-secondary">
          Transcript correct?
        </div>
        <Segmented
          ariaLabel="Transcript correct?"
          options={[
            { label: "Yes", v: true, active: LEVELS[0].active },
            { label: "No", v: false, active: LEVELS[2].active },
          ].map(({ label, v, active }) => ({
            label,
            selected: result.is_correct === v,
            activeClass: active,
            onSelect: () =>
              onChange({ is_correct: result.is_correct === v ? null : v }),
          }))}
        />
      </div>
    </div>
  );
}
