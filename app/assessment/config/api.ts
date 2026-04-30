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
import { apiFetch } from "@/app/lib/apiClient";
import { ConfigSelection } from "../types";
import { CACHE_INVALIDATED_EVENT } from "./constants";

export interface PagedResult<T> {
  items: T[];
  hasMore: boolean;
  nextSkip: number;
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

export function invalidateAssessmentConfigCache(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("kaapi_configs_cache");
  window.dispatchEvent(new CustomEvent(CACHE_INVALIDATED_EVENT));
}

export async function fetchConfigPage(params: {
  apiKey: string;
  skip?: number;
  limit?: number;
}): Promise<PagedResult<ConfigPublic>> {
  const { apiKey } = params;
  const skip = params.skip ?? 0;
  const limit = params.limit ?? 10;
  const query = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
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
  const limit = params.limit ?? 10;
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

export async function saveAssessmentConfig(params: {
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

    invalidateAssessmentConfigCache();

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

  invalidateAssessmentConfigCache();

  return {
    config_id: data.data.id,
    config_version: data.data.version.version,
    name: data.data.name,
    provider: normalizedBlob.completion.provider,
    model: String(normalizedBlob.completion.params.model || ""),
  };
}
