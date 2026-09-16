import type {
  AssessmentModelConfig,
  ConfigParamDefinition,
  ModelOption,
} from "@/app/lib/types/assessment";
import type { ConfigBlob, ProviderType } from "@/app/lib/types/configs";

const TEMPERATURE: ConfigParamDefinition = {
  type: "float",
  default: 1.0,
  min: 0.0,
  max: 2.0,
  description: "Controls randomness. Lower = more deterministic.",
};

const TOP_P: ConfigParamDefinition = {
  type: "float",
  default: 1.0,
  min: 0.0,
  max: 1.0,
  description: "Nucleus sampling. Use either this or temperature, not both.",
};

const MAX_OUTPUT_TOKENS: ConfigParamDefinition = {
  type: "int",
  default: 2048,
  min: 1,
  max: 32768,
  description: "Max tokens in the response.",
};

const SUMMARY: ConfigParamDefinition = {
  type: "enum",
  default: "auto",
  options: ["auto", "detailed", "concise"],
  description: "Summarize the reasoning result.",
};

const GEMINI_TEMPERATURE: ConfigParamDefinition = {
  type: "float",
  default: 1,
  min: 0,
  max: 2,
  description: "Controls randomness.",
};

const THINKING_LEVEL_DESCRIPTION =
  "Max reasoning depth before output. high = best quality, low = faster/cheaper.";

const OPENAI_EFFORT_DESCRIPTION =
  "How long the model spends reasoning. Higher = better but slower.";

const ANTHROPIC_EFFORT_OPTIONS = ["low", "medium", "high", "xhigh", "max"];

export const GPT4_STYLE_CONFIG: Record<string, ConfigParamDefinition> = {
  top_p: TOP_P,
  temperature: TEMPERATURE,
  max_output_tokens: MAX_OUTPUT_TOKENS,
};

function openaiReasoning(
  effortOptions: string[],
): Record<string, ConfigParamDefinition> {
  return {
    effort: {
      type: "enum",
      default: "medium",
      options: effortOptions,
      description: OPENAI_EFFORT_DESCRIPTION,
    },
    summary: SUMMARY,
  };
}

function anthropicReasoning(
  description: string,
): Record<string, ConfigParamDefinition> {
  return {
    effort: {
      type: "enum",
      default: "high",
      options: ANTHROPIC_EFFORT_OPTIONS,
      description,
    },
  };
}

function geminiThinking(
  defaultLevel: string,
): Record<string, ConfigParamDefinition> {
  return {
    temperature: GEMINI_TEMPERATURE,
    thinking_level: {
      type: "enum",
      default: defaultLevel,
      options: ["low", "medium", "high"],
      description: THINKING_LEVEL_DESCRIPTION,
    },
  };
}

const ANTHROPIC_TEMPERATURE_CONFIG: Record<string, ConfigParamDefinition> = {
  temperature: { type: "float", default: 1, min: 0, max: 2 },
};

const GEMINI_TEXT_MODELS: Omit<AssessmentModelConfig, "provider">[] = [
  { model_name: "gemini-3-pro-preview", config: geminiThinking("high") },
  { model_name: "gemini-3.5-flash-preview", config: geminiThinking("low") },
  { model_name: "gemini-3-flash-preview", config: geminiThinking("low") },
];

function geminiModelsFor(provider: ProviderType): AssessmentModelConfig[] {
  return GEMINI_TEXT_MODELS.map((model) => ({ provider, ...model }));
}

export const ASSESSMENT_MODEL_CONFIGS: AssessmentModelConfig[] = [
  { provider: "openai", model_name: "gpt-4o-mini", config: GPT4_STYLE_CONFIG },
  { provider: "openai", model_name: "gpt-4o", config: GPT4_STYLE_CONFIG },
  { provider: "openai", model_name: "gpt-4.1", config: GPT4_STYLE_CONFIG },
  { provider: "openai", model_name: "gpt-4.1-mini", config: GPT4_STYLE_CONFIG },
  { provider: "openai", model_name: "gpt-4.1-nano", config: GPT4_STYLE_CONFIG },
  {
    provider: "openai",
    model_name: "gpt-5",
    config: openaiReasoning(["minimal", "low", "medium", "high"]),
  },
  {
    provider: "openai",
    model_name: "gpt-5-mini",
    config: openaiReasoning(["minimal", "low", "medium", "high"]),
  },
  {
    provider: "openai",
    model_name: "gpt-5-nano",
    config: openaiReasoning(["minimal", "low", "medium", "high"]),
  },
  {
    provider: "openai",
    model_name: "gpt-5.1",
    config: openaiReasoning(["none", "low", "medium", "high"]),
  },
  {
    provider: "openai",
    model_name: "gpt-5.2",
    config: openaiReasoning(["none", "low", "medium", "high", "xhigh"]),
  },
  {
    provider: "openai",
    model_name: "gpt-5.4",
    config: openaiReasoning(["none", "low", "medium", "high", "xhigh"]),
  },
  {
    provider: "openai",
    model_name: "gpt-5.4-mini",
    config: openaiReasoning(["none", "low", "medium", "high", "xhigh"]),
  },
  {
    provider: "openai",
    model_name: "gpt-5.4-nano",
    config: openaiReasoning(["none", "low", "medium", "high", "xhigh"]),
  },
  {
    provider: "openai",
    model_name: "gpt-5.4-pro",
    config: openaiReasoning(["none", "low", "medium", "high", "xhigh"]),
  },
  {
    provider: "openai",
    model_name: "gpt-5.6-luna",
    config: openaiReasoning(["none", "low", "medium", "high", "xhigh", "max"]),
  },
  {
    provider: "openai",
    model_name: "gpt-5.6-sol",
    config: openaiReasoning(["none", "low", "medium", "high", "xhigh", "max"]),
  },
  {
    provider: "openai",
    model_name: "gpt-5.6-terra",
    config: openaiReasoning(["none", "low", "medium", "high", "xhigh", "max"]),
  },
  ...geminiModelsFor("google-aistudio"),
  ...geminiModelsFor("google-gcp"),
  {
    provider: "anthropic",
    model_name: "claude-sonnet-4-6",
    config: ANTHROPIC_TEMPERATURE_CONFIG,
  },
  {
    provider: "anthropic",
    model_name: "claude-haiku-4-5",
    config: ANTHROPIC_TEMPERATURE_CONFIG,
  },
  {
    provider: "anthropic",
    model_name: "claude-sonnet-5",
    config: anthropicReasoning(
      "Reasoning depth with adaptive thinking. Higher = better but slower/costlier.",
    ),
  },
  {
    provider: "anthropic",
    model_name: "claude-opus-4-8",
    config: anthropicReasoning(
      "Reasoning depth with adaptive thinking. Higher = better but slower/costlier.",
    ),
  },
  {
    provider: "anthropic",
    model_name: "claude-fable-5",
    config: anthropicReasoning(
      "Reasoning depth. Thinking is always on for this model. Higher = better but slower/costlier.",
    ),
  },
];

export const PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "google-aistudio", label: "Google AI Studio (Gemini)" },
  { value: "google-gcp", label: "Google Vertex AI (Gemini)" },
  { value: "anthropic", label: "Anthropic (Claude)" },
] as const;

export function getModelsByProvider(provider: string): ModelOption[] {
  return ASSESSMENT_MODEL_CONFIGS.filter((m) => m.provider === provider).map(
    ({ model_name }) => ({ value: model_name, label: model_name }),
  );
}

export function getDefaultModelForProvider(provider: string): string {
  return (
    ASSESSMENT_MODEL_CONFIGS.find((m) => m.provider === provider)?.model_name ??
    "gpt-4o-mini"
  );
}

export function getModelConfigDefinition(
  modelName: string,
): Record<string, ConfigParamDefinition> {
  return (
    ASSESSMENT_MODEL_CONFIGS.find((item) => item.model_name === modelName)
      ?.config ?? GPT4_STYLE_CONFIG
  );
}

export function buildDefaultParams(
  modelName: string,
): Record<string, number | string> {
  const definition = getModelConfigDefinition(modelName);
  return Object.fromEntries(
    Object.entries(definition).map(([key, value]) => [key, value.default]),
  );
}

export const ASSESSMENT_DEFAULT_CONFIG: ConfigBlob = {
  completion: {
    provider: "openai",
    type: "text",
    params: {
      model: "gpt-4o-mini",
      instructions: "",
      ...buildDefaultParams("gpt-4o-mini"),
    },
  },
};
