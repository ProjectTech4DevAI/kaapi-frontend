export interface ModelOption {
  value: string;
  label: string;
}

export const MODEL_OPTIONS: Record<string, ModelOption[]> = {
  openai: [
    // GPT-5 family
    { value: "gpt-5.4", label: "GPT-5.4" },
    { value: "gpt-5.4-pro", label: "GPT-5.4 Pro" },
    { value: "gpt-5.4-mini", label: "GPT-5.4 Mini" },
    { value: "gpt-5.4-nano", label: "GPT-5.4 Nano" },
    { value: "gpt-5", label: "GPT-5" },
    { value: "gpt-5-mini", label: "GPT-5 Mini" },
    { value: "gpt-5-nano", label: "GPT-5 Nano" },
    // GPT-4 family
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  ],
  // anthropic: [
  //   { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  //   { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  //   { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
  //   { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  // ],
  // google: [
  //   { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  //   { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  //   { value: 'gemini-pro', label: 'Gemini Pro' },
  // ],
};

/**
 * Returns true if the given model ID is a GPT-5 family model.
 * GPT-5 models do not support temperature or max_num_results parameters.
 */
export function isGpt5Model(model: string): boolean {
  return model.startsWith("gpt-5");
}
