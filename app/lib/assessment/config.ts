import { apiFetch } from "@/app/lib/apiClient";
import {
  CACHE_INVALIDATED_EVENT,
  CACHE_KEY,
  DEFAULT_PAGE_LIMIT,
} from "@/app/lib/constants";
import { ASSESSMENT_CONFIG_TAG } from "@/app/lib/assessment/constants";
import type {
  AssessmentModelConfig,
  ConfigParamDefinition,
  ConfigSelection,
  ModelOption,
  PagedResult,
  VersionListState,
} from "@/app/lib/types/assessment";
import {
  ConfigBlob,
  CompletionParams,
  ConfigCreate,
  ConfigListResponse,
  ConfigPublic,
  ConfigVersionCreate,
  ConfigVersionItems,
  ConfigVersionListResponse,
  ConfigVersionPublic,
  ConfigVersionResponse,
  ConfigWithVersionResponse,
} from "@/app/lib/types/configs";

const GPT4_STYLE_CONFIG = {
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

export function getModelsByProvider(provider: string): ModelOption[] {
  return ASSESSMENT_MODEL_CONFIGS.filter(
    (model) => model.provider === provider,
  ).map(({ model_name }) => ({
    value: model_name,
    label: model_name,
  }));
}

export function getDefaultModelForProvider(provider: string): string {
  return (
    ASSESSMENT_MODEL_CONFIGS.find((model) => model.provider === provider)
      ?.model_name ?? "gpt-4o-mini"
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

export const DEFAULT_CONFIG: ConfigBlob = {
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

export function buildInitialAssessmentConfigDraft(): ConfigBlob {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as ConfigBlob;
}

export function buildInitialAssessmentVersionState(): VersionListState {
  return {
    items: [],
    isLoading: false,
    error: null,
    hasMore: true,
    nextSkip: 0,
  };
}

function normalizeConfigBlobForApi(configBlob: ConfigBlob): ConfigBlob {
  const nextParams: Partial<CompletionParams> = {};

  Object.entries(configBlob.completion.params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      nextParams[key] = value;
    }
  });

  return {
    completion: {
      provider: configBlob.completion.provider,
      type: "text",
      params: nextParams as CompletionParams,
    },
  };
}

function buildPageResult<T>(
  items: T[],
  skip: number,
  limit: number,
): PagedResult<T> {
  return {
    items,
    hasMore: items.length === limit,
    nextSkip: skip + items.length,
  };
}

async function requestJson<T>(
  url: string,
  apiKey: string | null | undefined,
  init?: RequestInit,
): Promise<T> {
  if (!apiKey) {
    throw new Error("No API key selected. Please choose one in the Keystore.");
  }

  return apiFetch<T>(url, apiKey, init);
}

export function invalidateConfigCache(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(CACHE_KEY);
  window.dispatchEvent(new CustomEvent(CACHE_INVALIDATED_EVENT));
}

export async function fetchConfigPage(params: {
  apiKey: string;
  skip?: number;
  limit?: number;
}): Promise<PagedResult<ConfigPublic>> {
  const { apiKey } = params;
  const skip = params.skip ?? 0;
  const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
  const query = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
    tag: ASSESSMENT_CONFIG_TAG,
  });
  const data = await requestJson<ConfigListResponse>(
    `/api/configs?${query.toString()}`,
    apiKey,
  );

  if (!data.success || !data.data) {
    throw new Error(data.error || "Failed to fetch configs");
  }

  return buildPageResult(data.data, skip, limit);
}

export async function fetchConfigVersionsPage(
  apiKey: string,
  configId: string,
  params: {
    skip?: number;
    limit?: number;
  },
): Promise<PagedResult<ConfigVersionItems>> {
  const skip = params.skip ?? 0;
  const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
  const query = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
  });
  const data = await requestJson<ConfigVersionListResponse>(
    `/api/configs/${configId}/versions?${query.toString()}`,
    apiKey,
  );

  if (!data.success || !data.data) {
    throw new Error(data.error || "Failed to fetch config versions");
  }

  return buildPageResult(data.data, skip, limit);
}

export async function fetchConfigVersionDetail(
  apiKey: string,
  configId: string,
  versionNumber: number,
): Promise<ConfigVersionPublic> {
  const data = await requestJson<ConfigVersionResponse>(
    `/api/configs/${configId}/versions/${versionNumber}`,
    apiKey,
  );

  if (!data.success || !data.data) {
    throw new Error(data.error || "Failed to fetch version details");
  }

  return data.data;
}

export async function fetchConfigSelection(
  apiKey: string,
  config: Pick<ConfigPublic, "id" | "name">,
  versionNumber: number,
): Promise<ConfigSelection> {
  const version = await fetchConfigVersionDetail(
    apiKey,
    config.id,
    versionNumber,
  );
  const completion = version.config_blob.completion;

  return {
    config_id: config.id,
    config_version: version.version,
    name: config.name,
    provider: completion.provider,
    model: String(completion.params.model || ""),
  };
}

async function findConfigByExactName(
  apiKey: string,
  name: string,
): Promise<ConfigPublic | null> {
  const normalizedName = name.trim().toLowerCase();
  const limit = 100;
  let skip = 0;

  while (true) {
    const page = await fetchConfigPage({ apiKey, skip, limit });
    const match = page.items.find(
      (item) => item.name.trim().toLowerCase() === normalizedName,
    );

    if (match) {
      return match;
    }

    if (!page.hasMore) {
      return null;
    }

    skip = page.nextSkip;
  }
}

export async function saveConfig(params: {
  apiKey: string;
  configName: string;
  commitMessage: string;
  configBlob: ConfigBlob;
}): Promise<ConfigSelection> {
  const { apiKey } = params;
  const normalizedBlob = normalizeConfigBlobForApi(params.configBlob);
  const trimmedName = params.configName.trim();

  if (!trimmedName) {
    throw new Error("Configuration name is required");
  }

  const existingConfig = await findConfigByExactName(apiKey, trimmedName);

  if (existingConfig) {
    const versionCreate: ConfigVersionCreate = {
      config_blob: normalizedBlob,
      commit_message:
        params.commitMessage.trim() || "Updated assessment configuration",
    };
    const data = await requestJson<ConfigVersionResponse>(
      `/api/configs/${existingConfig.id}/versions`,
      apiKey,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(versionCreate),
      },
    );

    if (!data.success || !data.data) {
      throw new Error(data.error || "Failed to create config version");
    }

    invalidateConfigCache();

    return {
      config_id: existingConfig.id,
      config_version: data.data.version,
      name: existingConfig.name,
      provider: normalizedBlob.completion.provider,
      model: String(normalizedBlob.completion.params.model || ""),
    };
  }

  const configCreate: ConfigCreate = {
    name: trimmedName,
    description: "Assessment configuration",
    tag: ASSESSMENT_CONFIG_TAG,
    config_blob: normalizedBlob,
    commit_message:
      params.commitMessage.trim() || "Initial assessment configuration",
  };
  const data = await requestJson<ConfigWithVersionResponse>(
    "/api/configs",
    apiKey,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(configCreate),
    },
  );

  if (!data.success || !data.data) {
    throw new Error(data.error || "Failed to create configuration");
  }

  invalidateConfigCache();

  return {
    config_id: data.data.id,
    config_version: data.data.version.version,
    name: data.data.name,
    provider: normalizedBlob.completion.provider,
    model: String(normalizedBlob.completion.params.model || ""),
  };
}
