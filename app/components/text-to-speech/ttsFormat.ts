import { TTSResult, TTSUsage } from "@/app/lib/types/textToSpeech";

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatDuration = (s: number) =>
  s >= 60
    ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
    : `${s.toFixed(1)}s`;

export const formatSize = (b: number) =>
  b < 1024 * 1024
    ? `${(b / 1024).toFixed(1)} KB`
    : `${(b / (1024 * 1024)).toFixed(1)} MB`;

// Each provider's own unit: tokens (Gemini), characters (Sarvam), credits (ElevenLabs).
export function formatUsage(usage: TTSUsage | null | undefined): string | null {
  if (!usage) return null;
  if (usage.unit === "tokens") {
    const total =
      usage.total_tokens ??
      (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0);
    return `${compact.format(total)} tokens`;
  }
  if (usage.unit === "credits" && usage.credits != null) {
    return `${compact.format(usage.credits)} credits`;
  }
  return `${compact.format(usage.characters)} chars`;
}

// Hover detail behind a usage label: the provider's own breakdown.
export function usageDetail(usage: TTSUsage): string {
  if (usage.unit === "tokens") {
    return `Gemini tokens · input ${usage.input_tokens ?? "?"} · output (audio) ${usage.output_tokens ?? "?"}`;
  }
  if (usage.unit === "credits") {
    return usage.credits != null
      ? `ElevenLabs credits · ${usage.characters} chars × ${usage.credit_multiplier ?? "?"}`
      : `ElevenLabs · ${usage.characters} chars (credits unavailable)`;
  }
  return `Sarvam characters billed · ${usage.characters}`;
}

// Sums one model's per-result usage; every row of a model shares its unit.
export function totalUsage(results: TTSResult[]): TTSUsage | null {
  const usages = results.map((r) => r.usage).filter((u): u is TTSUsage => !!u);
  if (usages.length === 0) return null;
  const sum = (pick: (u: TTSUsage) => number | null | undefined) =>
    usages.reduce((acc, u) => acc + (pick(u) ?? 0), 0);
  const first = usages[0];
  if (first.unit === "tokens") {
    return {
      unit: "tokens",
      total_tokens: sum((u) =>
        u.unit === "tokens"
          ? (u.total_tokens ?? (u.input_tokens ?? 0) + (u.output_tokens ?? 0))
          : 0,
      ),
    };
  }
  const characters = sum((u) => ("characters" in u ? u.characters : 0));
  if (first.unit === "credits") {
    const priced = usages.some(
      (u) => u.unit === "credits" && u.credits != null,
    );
    return {
      unit: "credits",
      characters,
      credits: priced
        ? sum((u) => (u.unit === "credits" ? u.credits : 0))
        : null,
    };
  }
  return { unit: "characters", characters };
}
