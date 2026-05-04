"use client";

interface TooltipContent {
  title: string;
  description: string;
  high: string;
  medium: string;
  low: string;
}

const CONTENT: Record<string, TooltipContent> = {
  speech_naturalness: {
    title: "Speech Naturalness",
    description: "Assesses how human-like the generated speech sounds.",
    high: "Very human-like, natural flow with appropriate pauses and inflections.",
    medium:
      "Some human qualities but with occasional robotic or awkward elements.",
    low: "Clearly robotic or artificial, with choppy or monotone speech.",
  },
  pronunciation_accuracy: {
    title: "Pronunciation Accuracy",
    description:
      "Evaluates how clearly and correctly words are pronounced in the TTS output.",
    high: "All words are pronounced clearly and correctly.",
    medium: "1-2 words are mispronounced or unclear.",
    low: "3 or more words are mispronounced or difficult to understand.",
  },
};

interface TTSScoreInfoTooltipProps {
  metricKey: "speech_naturalness" | "pronunciation_accuracy";
  position: { top: number; left: number };
}

export default function TTSScoreInfoTooltip({
  metricKey,
  position,
}: TTSScoreInfoTooltipProps) {
  const content = CONTENT[metricKey];

  return (
    <div
      className="fixed z-50 rounded-lg shadow-lg border text-xs bg-bg-primary border-border w-[340px]"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-3">
        <div className="font-semibold mb-2 text-text-primary">
          {content.title}
        </div>
        <p className="mb-3 text-text-secondary font-sans">
          {content.description}
        </p>
        <div className="mb-1 font-semibold text-text-primary">Scoring</div>
        <div className="space-y-2 p-2 rounded bg-bg-secondary">
          <div className="flex">
            <span className="font-semibold shrink-0 text-status-success w-[62px]">
              High:
            </span>
            <span className="text-text-primary">{content.high}</span>
          </div>
          <div className="flex">
            <span className="font-semibold shrink-0 text-yellow-600 w-[62px]">
              Medium:
            </span>
            <span className="text-text-primary">{content.medium}</span>
          </div>
          <div className="flex">
            <span className="font-semibold shrink-0 text-status-error w-[62px]">
              Low:
            </span>
            <span className="text-text-primary">{content.low}</span>
          </div>
        </div>
        <div className="mt-2 font-semibold text-status-success">
          Higher is better.
        </div>
      </div>
    </div>
  );
}
