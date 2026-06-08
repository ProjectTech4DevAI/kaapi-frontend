import { AnalyticsSeriesPoint } from "@/app/lib/types/analytics";

const PROVIDER_DISPLAY: Record<string, string> = {
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic",
  sarvamai: "Sarvam AI",
  elevenlabs: "ElevenLabs",
  azure: "Azure",
  cohere: "Cohere",
};

function canonicalProviderKey(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[-_\s]?native$/i, "")
    .replace(/[-_\s]+/g, "");
}

function formatProvider(raw: string): string {
  const key = canonicalProviderKey(raw);
  return PROVIDER_DISPLAY[key] ?? raw.trim();
}

function normalizeName(name: string): string {
  const parts = name.split("·").map((p) => p.trim());
  if (parts.length === 1) return formatProvider(parts[0]);
  return parts
    .map((p, i) => (i === parts.length - 1 ? formatProvider(p) : p))
    .join(" · ");
}

function sumNumericArrays(a: string[], b: string[]): string[] {
  const len = Math.max(a.length, b.length);
  const out: string[] = [];
  for (let i = 0; i < len; i++) {
    const left = Number(a[i] ?? 0) || 0;
    const right = Number(b[i] ?? 0) || 0;
    out.push(String(left + right));
  }
  return out;
}

function mergeSeries(
  a: AnalyticsSeriesPoint,
  b: AnalyticsSeriesPoint,
): AnalyticsSeriesPoint {
  return {
    name: a.name,
    data: sumNumericArrays(a.data, b.data),
    total_input_tokens:
      (a.total_input_tokens ?? 0) + (b.total_input_tokens ?? 0),
    total_output_tokens:
      (a.total_output_tokens ?? 0) + (b.total_output_tokens ?? 0),
    total_tokens: (a.total_tokens ?? 0) + (b.total_tokens ?? 0),
  };
}

export function normalizeAndMergeSeries(
  series: AnalyticsSeriesPoint[],
): AnalyticsSeriesPoint[] {
  const byName = new Map<string, AnalyticsSeriesPoint>();
  for (const s of series) {
    const displayName = normalizeName(s.name);
    const existing = byName.get(displayName);
    if (!existing) {
      byName.set(displayName, { ...s, name: displayName });
    } else {
      byName.set(displayName, mergeSeries(existing, s));
    }
  }
  return Array.from(byName.values());
}
