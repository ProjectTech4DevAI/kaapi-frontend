// Assessment-scoped config fetchers, model helpers, and save logic.
import { apiFetch } from "@/app/lib/apiClient";
import { invalidateConfigCache } from "@/app/lib/configFetchers";
import { ASSESSMENT_TAG } from "@/app/lib/assessment/constants";
import {
  ASSESSMENT_DEFAULT_CONFIG,
  ASSESSMENT_MODEL_CONFIGS,
  GPT4_STYLE_CONFIG,
} from "@/app/lib/data/assessmentModels";
import { DEFAULT_PAGE_LIMIT } from "@/app/lib/constants";
import type {
  ConfigParamDefinition,
  ConfigSelection,
  ModelOption,
  PagedResult,
  VersionListState,
} from "@/app/lib/types/assessment";
import type {
  CompletionParams,
  ConfigBlob,
  ConfigCreate,
  ConfigListResponse,
  ConfigPublic,
  ConfigVersionCreate,
  ConfigVersionItems,
  ConfigVersionListResponse,
  ConfigVersionPublic,
  ConfigVersionResponse,
  ConfigWithVersionResponse,
  SavedConfig,
} from "@/app/lib/types/configs";

export function getModelsByProvider(provider: string): ModelOption[] {
  return ASSESSMENT_MODEL_CONFIGS.filter(
    (model) => model.provider === provider,
  ).map(({ model_name }) => ({ value: model_name, label: model_name }));
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

export function buildInitialAssessmentConfigDraft(): ConfigBlob {
  return JSON.parse(JSON.stringify(ASSESSMENT_DEFAULT_CONFIG)) as ConfigBlob;
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

export function toConfigSelection(saved: SavedConfig): ConfigSelection {
  return {
    config_id: saved.config_id,
    config_version: saved.version,
    name: saved.name,
    provider: saved.provider,
    model: saved.modelName,
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

export async function fetchConfigPage(params: {
  apiKey: string;
  skip?: number;
  limit?: number;
}): Promise<PagedResult<ConfigPublic>> {
  const skip = params.skip ?? 0;
  const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
  const query = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
    tag: ASSESSMENT_TAG,
  });
  const data = await apiFetch<ConfigListResponse>(
    `/api/configs?${query.toString()}`,
    params.apiKey,
  );
  if (!data.success || !data.data) {
    throw new Error(data.error || "Failed to fetch configs");
  }
  return buildPageResult(data.data, skip, limit);
}

export async function fetchConfigVersionsPage(
  apiKey: string,
  configId: string,
  params: { skip?: number; limit?: number },
): Promise<PagedResult<ConfigVersionItems>> {
  const skip = params.skip ?? 0;
  const limit = params.limit ?? DEFAULT_PAGE_LIMIT;
  const query = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
    tag: ASSESSMENT_TAG,
  });
  const data = await apiFetch<ConfigVersionListResponse>(
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
  const query = new URLSearchParams({ tag: ASSESSMENT_TAG });
  const data = await apiFetch<ConfigVersionResponse>(
    `/api/configs/${configId}/versions/${versionNumber}?${query.toString()}`,
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

export async function saveAssessmentConfig(params: {
  apiKey: string;
  configName: string;
  commitMessage: string;
  configBlob: ConfigBlob;
  existingConfig: { id: string; name: string } | null;
}): Promise<ConfigSelection> {
  const { apiKey, existingConfig } = params;

  if (!apiKey) {
    throw new Error("No API key selected. Please choose one in the Keystore.");
  }

  const trimmedName = params.configName.trim();
  if (!trimmedName) {
    throw new Error("Configuration name is required");
  }

  const normalizedBlob = normalizeConfigBlobForApi(params.configBlob);
  const provider = normalizedBlob.completion.provider;
  const model = String(normalizedBlob.completion.params.model || "");

  if (existingConfig) {
    const versionCreate: ConfigVersionCreate = {
      config_blob: normalizedBlob,
      commit_message:
        params.commitMessage.trim() || "Updated assessment configuration",
    };
    const data = await apiFetch<ConfigVersionResponse>(
      `/api/configs/${existingConfig.id}/versions`,
      apiKey,
      { method: "POST", body: JSON.stringify(versionCreate) },
    );
    if (!data.success || !data.data) {
      throw new Error(data.error || "Failed to create config version");
    }
    invalidateConfigCache();
    return {
      config_id: existingConfig.id,
      config_version: data.data.version,
      name: existingConfig.name,
      provider,
      model,
    };
  }

  const configCreate: ConfigCreate = {
    name: trimmedName,
    description: "Assessment configuration",
    tag: ASSESSMENT_TAG,
    config_blob: normalizedBlob,
    commit_message:
      params.commitMessage.trim() || "Initial assessment configuration",
  };
  const data = await apiFetch<ConfigWithVersionResponse>(
    "/api/configs",
    apiKey,
    {
      method: "POST",
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
    provider,
    model,
  };
}
