export type ConfigType = "text" | "stt" | "tts";

export interface ModelOption {
  value: string;
  label: string;
  types?: ConfigType[];
}

export const MODEL_OPTIONS: Record<string, ModelOption[]> = {
  openai: [
    { value: "gpt-5.4", label: "GPT-5.4" },
    { value: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
    { value: "gpt-5.4-nano", label: "GPT-5.4 Nano" },
    { value: "gpt-5", label: "GPT-5" },
    { value: "gpt-5-mini", label: "GPT-5 Mini" },
    { value: "gpt-5-nano", label: "GPT-5 Nano" },
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
  google: [
    {
      value: "gemini-2.5-pro",
      label: "Gemini 2.5 Pro",
      types: ["text", "stt"],
    },
    {
      value: "gemini-2.5-flash-preview-tts",
      label: "Gemini 2.5 Flash (TTS)",
      types: ["tts"],
    },
    {
      value: "gemini-2.5-pro-preview-tts",
      label: "Gemini 2.5 Pro (TTS)",
      types: ["tts"],
    },
  ],
};

export function getModelsForType(
  provider: string,
  type: ConfigType,
): ModelOption[] {
  const all = MODEL_OPTIONS[provider] ?? [];
  return all.filter((m) => (m.types ?? ["text"]).includes(type));
}

/**
 * GPT-5 family models don't support temperature or max_num_results, so
 * UI components must hide those controls when one is selected.
 */
export function isGpt5Model(model: string): boolean {
  return model.startsWith("gpt-5");
}
