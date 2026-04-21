import { ConfigBlob } from '@/app/lib/configTypes';

export type ConfigParamType = 'float' | 'int' | 'enum';

export interface ConfigParamDefinition {
  type: ConfigParamType;
  default: number | string;
  description: string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface AssessmentModelConfig {
  provider: 'openai' | 'google';
  model_name: string;
  config: Record<string, ConfigParamDefinition>;
}

export interface ModelOption {
  value: string;
  label: string;
}

// ── OpenAI param configs ─────────────────────────────────────────

const GPT4_STYLE_CONFIG = {
  top_p: {
    max: 1.0,
    min: 0.0,
    type: 'float',
    default: 1.0,
    description: 'Nucleus sampling. Use either this or temperature, not both.',
  },
  temperature: {
    max: 2.0,
    min: 0.0,
    type: 'float',
    default: 1.0,
    description: 'Controls randomness. Lower = more deterministic.',
  },
} as const satisfies Record<string, ConfigParamDefinition>;

// ── Gemini param configs ─────────────────────────────────────────

const GEMINI_TEMPERATURE_CONFIG = {
  temperature: {
    max: 2.0,
    min: 0.0,
    type: 'float',
    default: 0.4,
    description: 'Controls randomness. Lower = more deterministic.',
  },
} as const satisfies Record<string, ConfigParamDefinition>;

const GEMINI_THINKING_CONFIG = {
  ...GEMINI_TEMPERATURE_CONFIG,
  thinking_level: {
    type: 'enum',
    default: 'LOW',
    options: ['MINIMAL', 'LOW', 'MEDIUM', 'HIGH'],
    description: 'Controls how much the model thinks before responding.',
  },
} as const satisfies Record<string, ConfigParamDefinition>;

const GEMINI_THINKING_NO_MINIMAL_CONFIG = {
  ...GEMINI_TEMPERATURE_CONFIG,
  thinking_level: {
    type: 'enum',
    default: 'LOW',
    options: ['LOW', 'MEDIUM', 'HIGH'],
    description: 'Controls how much the model thinks before responding.',
  },
} as const satisfies Record<string, ConfigParamDefinition>;

// ── All model configs ────────────────────────────────────────────

export const ASSESSMENT_MODEL_CONFIGS: AssessmentModelConfig[] = [
  // OpenAI
  { provider: 'openai', model_name: 'gpt-4o-mini', config: GPT4_STYLE_CONFIG },
  { provider: 'openai', model_name: 'gpt-4o', config: GPT4_STYLE_CONFIG },
  { provider: 'openai', model_name: 'gpt-4.1', config: GPT4_STYLE_CONFIG },
  { provider: 'openai', model_name: 'gpt-4.1-mini', config: GPT4_STYLE_CONFIG },
  { provider: 'openai', model_name: 'gpt-4.1-nano', config: GPT4_STYLE_CONFIG },
  {
    provider: 'openai',
    model_name: 'o3-mini',
    config: {
      effort: {
        type: 'enum',
        default: 'medium',
        options: ['low', 'medium', 'high'],
        description: 'How long the model spends reasoning. Higher = better but slower.',
      },
      summary: {
        type: 'enum',
        default: 'auto',
        options: ['auto', 'detailed', 'concise'],
        description: 'Summarize the reasoning result.',
      },
    },
  },
  {
    provider: 'openai',
    model_name: 'o3',
    config: {
      effort: {
        type: 'enum',
        default: 'medium',
        options: ['low', 'medium', 'high'],
        description: 'How long the model spends reasoning. Higher = better but slower.',
      },
      summary: {
        type: 'enum',
        default: 'auto',
        options: ['auto', 'detailed', 'concise', 'null'],
        description: 'Summarize the reasoning result.',
      },
    },
  },
  {
    provider: 'openai',
    model_name: 'o4-mini',
    config: {
      effort: {
        type: 'enum',
        default: 'medium',
        options: ['low', 'medium', 'high'],
        description: 'How long the model spends reasoning. Higher = better but slower.',
      },
      summary: {
        type: 'enum',
        default: 'auto',
        options: ['auto', 'detailed', 'concise', 'null'],
        description: 'Summarize the reasoning result.',
      },
    },
  },
  {
    provider: 'openai',
    model_name: 'gpt-5',
    config: {
      effort: {
        type: 'enum',
        default: 'medium',
        options: ['minimal', 'low', 'medium', 'high'],
        description: 'How long the model spends reasoning. Higher = better but slower.',
      },
      summary: {
        type: 'enum',
        default: 'auto',
        options: ['auto', 'detailed', 'concise', 'null'],
        description: 'Summarize the reasoning result.',
      },
    },
  },
  {
    provider: 'openai',
    model_name: 'gpt-5-mini',
    config: {
      effort: {
        type: 'enum',
        default: 'medium',
        options: ['minimal', 'low', 'medium', 'high'],
        description: 'How long the model spends reasoning. Higher = better but slower.',
      },
      summary: {
        type: 'enum',
        default: 'auto',
        options: ['auto', 'detailed', 'concise', 'null'],
        description: 'Summarize the reasoning result.',
      },
    },
  },
  {
    provider: 'openai',
    model_name: 'gpt-5-nano',
    config: {
      effort: {
        type: 'enum',
        default: 'medium',
        options: ['minimal', 'low', 'medium', 'high'],
        description: 'How long the model spends reasoning. Higher = better but slower.',
      },
      summary: {
        type: 'enum',
        default: 'auto',
        options: ['auto', 'detailed', 'concise', 'null'],
        description: 'Summarize the reasoning result.',
      },
    },
  },
  {
    provider: 'openai',
    model_name: 'gpt-5.1',
    config: {
      effort: {
        type: 'enum',
        default: 'medium',
        options: ['none', 'low', 'medium', 'high'],
        description: 'How long the model spends reasoning. Higher = better but slower.',
      },
      summary: {
        type: 'enum',
        default: 'auto',
        options: ['auto', 'detailed', 'concise', 'null'],
        description: 'Summarize the reasoning result.',
      },
    },
  },
  {
    provider: 'openai',
    model_name: 'gpt-5.1-chat-latest',
    config: {
      summary: {
        type: 'enum',
        default: 'auto',
        options: ['auto', 'detailed', 'concise', 'null'],
        description: 'Summarize the reasoning result.',
      },
    },
  },
  {
    provider: 'openai',
    model_name: 'gpt-5.2',
    config: {
      effort: {
        type: 'enum',
        default: 'medium',
        options: ['none', 'low', 'medium', 'high', 'xhigh'],
        description: 'How long the model spends reasoning. Higher = better but slower.',
      },
      summary: {
        type: 'enum',
        default: 'auto',
        options: ['auto', 'detailed', 'concise', 'null'],
        description: 'Summarize the reasoning result.',
      },
    },
  },
  {
    provider: 'openai',
    model_name: 'gpt-5.2-chat-latest',
    config: {
      summary: {
        type: 'enum',
        default: 'auto',
        options: ['auto', 'detailed', 'concise', 'null'],
        description: 'Summarize the reasoning result.',
      },
    },
  },
  {
    provider: 'openai',
    model_name: 'gpt-5.2-pro',
    config: {
      summary: {
        type: 'enum',
        default: 'auto',
        options: ['auto', 'detailed', 'concise', 'null'],
        description: 'Summarize the reasoning result.',
      },
    },
  },
  // Google (Gemini)
  { provider: 'google', model_name: 'gemini-2.0-flash-lite', config: GEMINI_TEMPERATURE_CONFIG },
  { provider: 'google', model_name: 'gemini-2.0-flash', config: GEMINI_TEMPERATURE_CONFIG },
  { provider: 'google', model_name: 'gemini-2.5-flash-lite', config: GEMINI_TEMPERATURE_CONFIG },
  { provider: 'google', model_name: 'gemini-2.5-flash', config: GEMINI_TEMPERATURE_CONFIG },
  { provider: 'google', model_name: 'gemini-2.5-pro', config: GEMINI_TEMPERATURE_CONFIG },
  { provider: 'google', model_name: 'gemini-3.1-flash-lite-preview', config: GEMINI_THINKING_CONFIG },
  { provider: 'google', model_name: 'gemini-3.1-pro-preview', config: GEMINI_THINKING_NO_MINIMAL_CONFIG },
  { provider: 'google', model_name: 'gemini-3-flash-preview', config: GEMINI_THINKING_CONFIG },
];

export const CACHE_KEY = 'kaapi_configs_cache';
export const CACHE_MAX_AGE_MS = 5 * 60 * 1000;
export const PAGE_SIZE = 10;
export const CACHE_INVALIDATED_EVENT = 'kaapi:config-cache-invalidated';

export const PROVIDER_OPTIONS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google (Gemini)' },
] as const;

export function getModelsByProvider(provider: string): ModelOption[] {
  return ASSESSMENT_MODEL_CONFIGS.filter((m) => m.provider === provider).map(({ model_name }) => ({
    value: model_name,
    label: model_name,
  }));
}

export function getDefaultModelForProvider(provider: string): string {
  return ASSESSMENT_MODEL_CONFIGS.find((m) => m.provider === provider)?.model_name ?? 'gpt-4o-mini';
}

export function getModelConfigDefinition(modelName: string): Record<string, ConfigParamDefinition> {
  return ASSESSMENT_MODEL_CONFIGS.find((item) => item.model_name === modelName)?.config ?? GPT4_STYLE_CONFIG;
}

export function buildDefaultParams(modelName: string): Record<string, number | string> {
  const definition = getModelConfigDefinition(modelName);
  return Object.fromEntries(
    Object.entries(definition).map(([key, value]) => [key, value.default]),
  );
}

export const DEFAULT_CONFIG: ConfigBlob = {
  completion: {
    provider: 'openai',
    type: 'text',
    params: {
      model: 'gpt-4o-mini',
      instructions: '',
      ...buildDefaultParams('gpt-4o-mini'),
    },
  },
};
