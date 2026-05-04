"use client";

interface ScoreInfoMetric {
  key: string;
  title: string;
  desc: string;
  formula: string;
  formulaDesc: string;
  example: string;
  direction: string;
  directionClass: string;
  shortLabel: string;
}

const METRICS: ScoreInfoMetric[] = [
  {
    key: "accuracy",
    title: "Accuracy (Word Information Preserved)",
    desc: "Measures how much of the original information was correctly captured.",
    formula: "WIP = (C / N) × (C / H)",
    formulaDesc:
      "C = correct words\nN = total words in reference\nH = total words in hypothesis",
    example: `Reference:  "the cat sat on the mat" (N=6)\nHypothesis: "a cat sit on mat" (H=5)\nC = 3 (cat, on, mat)\n\nWIP = (3/6) × (3/5)\n    = 0.5 × 0.6 = 0.30 = 30%`,
    direction: "Higher is better.",
    directionClass: "text-status-success",
    shortLabel: "Accuracy",
  },
  {
    key: "wer",
    title: "WER (Word Error Rate)",
    desc: "The most widely used metric in STT evaluation.",
    formula: "WER = (S + D + I) / N",
    formulaDesc:
      "S = substitutions, D = deletions\nI = insertions, N = total words in reference",
    example: `Reference:  "the cat sat on the mat" (N=6)\nHypothesis: "a cat sit on mat"\n\nthe → a    (Substitution)\ncat → cat  (Correct)\nsat → sit  (Substitution)\non  → on   (Correct)\nthe → ∅    (Deletion)\nmat → mat  (Correct)\n\nS=2, D=1, I=0\nWER = (2+1+0) / 6 = 0.50 = 50%`,
    direction: "Lower is better.",
    directionClass: "text-status-error",
    shortLabel: "WER",
  },
  {
    key: "cer",
    title: "CER (Character Error Rate)",
    desc: "Same concept as WER but at the character level — more granular, catches partial word errors.",
    formula: "CER = (S + D + I) / N",
    formulaDesc:
      "S, D, I = character-level errors\nN = total characters in reference",
    example: `Reference:  "the cat sat" (N=11 chars)\nHypothesis: "the bat set"\n\nt → t  (Correct)\nh → h  (Correct)\ne → e  (Correct)\n· → ·  (Correct)\nc → b  (Substitution)\na → a  (Correct)\nt → t  (Correct)\n· → ·  (Correct)\ns → s  (Correct)\na → e  (Substitution)\nt → t  (Correct)\n\nS=2, D=0, I=0\nCER = 2/11 = 0.18 = 18%`,
    direction: "Lower is better.",
    directionClass: "text-status-error",
    shortLabel: "CER",
  },
  {
    key: "lenient_wer",
    title: "Lenient WER",
    desc: "Same as WER but ignores differences in casing and punctuation — useful when exact formatting doesn't matter.",
    formula: "Same as WER after normalizing text",
    formulaDesc: "Normalization: lowercase + remove punctuation",
    example: `Reference:  "Hello, World!"\nHypothesis: "hello world"\n\nAfter normalization:\n"hello world" vs "hello world"\n→ exact match\n\nLenient WER = 0%\n(strict WER would be higher)`,
    direction: "Lower is better.",
    directionClass: "text-status-error",
    shortLabel: "Lenient WER",
  },
];

interface STTScoreInfoTooltipProps {
  activeKey: string;
  position: { top: number; left: number };
  onSelectKey: (key: string) => void;
}

export default function STTScoreInfoTooltip({
  activeKey,
  position,
  onSelectKey,
}: STTScoreInfoTooltipProps) {
  const current = METRICS.find((m) => m.key === activeKey) ?? METRICS[0];

  return (
    <div
      className="fixed z-50 rounded-lg shadow-lg border text-xs bg-bg-primary border-border w-[370px]"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex border-b border-border">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => onSelectKey(m.key)}
            className={`flex-1 px-2 py-2 text-xs font-medium bg-transparent cursor-pointer border-b-2 ${
              activeKey === m.key
                ? "text-accent-primary border-accent-primary"
                : "text-text-secondary border-transparent"
            }`}
          >
            {m.shortLabel}
          </button>
        ))}
      </div>
      <div className="p-3 font-mono">
        <div className="font-semibold mb-2 text-text-primary">
          {current.title}
        </div>
        <p className="mb-2 text-text-secondary font-sans">{current.desc}</p>
        <div className="mb-1 font-semibold text-text-primary">Formula</div>
        <div className="mb-2 p-2 rounded whitespace-pre-wrap bg-bg-secondary text-text-primary">
          {current.formula}
          {"\n"}
          <span className="text-text-secondary">{current.formulaDesc}</span>
        </div>
        <div className="mb-1 font-semibold text-text-primary">Example</div>
        <div className="p-2 rounded whitespace-pre-wrap bg-bg-secondary text-text-primary leading-relaxed">
          {current.example}
        </div>
        <div className={`mt-2 font-semibold ${current.directionClass}`}>
          {current.direction}
        </div>
      </div>
    </div>
  );
}
