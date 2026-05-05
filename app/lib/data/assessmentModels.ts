import type {
  AssessmentModelConfig,
  ConfigParamDefinition,
} from "@/app/lib/types/assessment";
import type { ConfigBlob } from "@/app/lib/types/configs";

export const GPT4_STYLE_CONFIG = {
  top_p: {
    max: 1.0,
    min: 0.0,
    type: "float",
    default: 1.0,
    description: "Nucleus sampling. Use either this or temperature, not both.",
  },
  temperature: {
    max: 2.0,
    min: 0.0,
    type: "float",
    default: 1.0,
    description: "Controls randomness. Lower = more deterministic.",
  },
} as const satisfies Record<string, ConfigParamDefinition>;

export const ASSESSMENT_MODEL_CONFIGS: AssessmentModelConfig[] = [
  { provider: "openai", model_name: "gpt-4o-mini", config: GPT4_STYLE_CONFIG },
  { provider: "openai", model_name: "gpt-4o", config: GPT4_STYLE_CONFIG },
  { provider: "openai", model_name: "gpt-4.1", config: GPT4_STYLE_CONFIG },
  { provider: "openai", model_name: "gpt-4.1-mini", config: GPT4_STYLE_CONFIG },
  { provider: "openai", model_name: "gpt-4.1-nano", config: GPT4_STYLE_CONFIG },
  {
    provider: "openai",
    model_name: "o3-mini",
    config: {
      effort: {
        type: "enum",
        default: "medium",
        options: ["low", "medium", "high"],
        description:
          "How long the model spends reasoning. Higher = better but slower.",
      },
      summary: {
        type: "enum",
        default: "auto",
        options: ["auto", "detailed", "concise"],
        description: "Summarize the reasoning result.",
      },
    },
  },
  {
    provider: "openai",
    model_name: "o3",
    config: {
      effort: {
        type: "enum",
        default: "medium",
        options: ["low", "medium", "high"],
        description:
          "How long the model spends reasoning. Higher = better but slower.",
      },
      summary: {
        type: "enum",
        default: "auto",
        options: ["auto", "detailed", "concise"],
        description: "Summarize the reasoning result.",
      },
    },
  },
  {
    provider: "openai",
    model_name: "o4-mini",
    config: {
      effort: {
        type: "enum",
        default: "medium",
        options: ["low", "medium", "high"],
        description:
          "How long the model spends reasoning. Higher = better but slower.",
      },
      summary: {
        type: "enum",
        default: "auto",
        options: ["auto", "detailed", "concise"],
        description: "Summarize the reasoning result.",
      },
    },
  },
  {
    provider: "openai",
    model_name: "gpt-5",
    config: {
      effort: {
        type: "enum",
        default: "medium",
        options: ["minimal", "low", "medium", "high"],
        description:
          "How long the model spends reasoning. Higher = better but slower.",
      },
      summary: {
        type: "enum",
        default: "auto",
        options: ["auto", "detailed", "concise"],
        description: "Summarize the reasoning result.",
      },
    },
  },
  {
    provider: "openai",
    model_name: "gpt-5-mini",
    config: {
      effort: {
        type: "enum",
        default: "medium",
        options: ["minimal", "low", "medium", "high"],
        description:
          "How long the model spends reasoning. Higher = better but slower.",
      },
      summary: {
        type: "enum",
        default: "auto",
        options: ["auto", "detailed", "concise"],
        description: "Summarize the reasoning result.",
      },
    },
  },
  {
    provider: "openai",
    model_name: "gpt-5-nano",
    config: {
      effort: {
        type: "enum",
        default: "medium",
        options: ["minimal", "low", "medium", "high"],
        description:
          "How long the model spends reasoning. Higher = better but slower.",
      },
      summary: {
        type: "enum",
        default: "auto",
        options: ["auto", "detailed", "concise"],
        description: "Summarize the reasoning result.",
      },
    },
  },
  {
    provider: "openai",
    model_name: "gpt-5.1",
    config: {
      effort: {
        type: "enum",
        default: "medium",
        options: ["none", "low", "medium", "high"],
        description:
          "How long the model spends reasoning. Higher = better but slower.",
      },
      summary: {
        type: "enum",
        default: "auto",
        options: ["auto", "detailed", "concise"],
        description: "Summarize the reasoning result.",
      },
    },
  },
  {
    provider: "openai",
    model_name: "gpt-5.1-chat-latest",
    config: {
      summary: {
        type: "enum",
        default: "auto",
        options: ["auto", "detailed", "concise"],
        description: "Summarize the reasoning result.",
      },
    },
  },
  {
    provider: "openai",
    model_name: "gpt-5.2",
    config: {
      effort: {
        type: "enum",
        default: "medium",
        options: ["none", "low", "medium", "high", "xhigh"],
        description:
          "How long the model spends reasoning. Higher = better but slower.",
      },
      summary: {
        type: "enum",
        default: "auto",
        options: ["auto", "detailed", "concise"],
        description: "Summarize the reasoning result.",
      },
    },
  },
  {
    provider: "openai",
    model_name: "gpt-5.2-chat-latest",
    config: {
      summary: {
        type: "enum",
        default: "auto",
        options: ["auto", "detailed", "concise"],
        description: "Summarize the reasoning result.",
      },
    },
  },
  {
    provider: "openai",
    model_name: "gpt-5.2-pro",
    config: {
      summary: {
        type: "enum",
        default: "auto",
        options: ["auto", "detailed", "concise"],
        description: "Summarize the reasoning result.",
      },
    },
  },
];

export const PROVIDER_OPTIONS = [{ value: "openai", label: "OpenAI" }] as const;

export const DEFAULT_CONFIG: ConfigBlob = {
  completion: {
    provider: "openai",
    type: "text",
    params: {
      model: "gpt-4o-mini",
      instructions: "",
      top_p: GPT4_STYLE_CONFIG.top_p.default,
      temperature: GPT4_STYLE_CONFIG.temperature.default,
    },
  },
};
