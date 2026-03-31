import {
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
} from '@/app/lib/configTypes';
import { STORAGE_KEY } from '@/app/keystore/page';
import { ConfigSelection } from '../types';
import { CACHE_INVALIDATED_EVENT } from './constants';

export interface PagedResult<T> {
  items: T[];
  hasMore: boolean;
  nextSkip: number;
}

function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const keys = JSON.parse(stored);
    return keys.length > 0 ? keys[0].key : null;
  } catch (error) {
    console.error('Failed to load API key for assessment config module:', error);
    return null;
  }
}

function normalizeConfigBlobForApi(configBlob: ConfigBlob): ConfigBlob {
  const nextParams: Record<string, unknown> = {};

  Object.entries(configBlob.completion.params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      nextParams[key] = value;
    }
  });

  return {
    completion: {
      provider: configBlob.completion.provider,
      type: 'text',
      params: nextParams,
    },
  };
}

function buildPageResult<T>(items: T[], skip: number, limit: number): PagedResult<T> {
  return {
    items,
    hasMore: items.length === limit,
    nextSkip: skip + items.length,
  };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No API key found. Please add one in the Keystore.');
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      'X-API-KEY': apiKey,
      ...(init?.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }

  return data as T;
}

export function invalidateAssessmentConfigCache(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('kaapi_configs_cache');
  window.dispatchEvent(new CustomEvent(CACHE_INVALIDATED_EVENT));
}

export async function fetchConfigPage(params: {
  skip?: number;
  limit?: number;
}): Promise<PagedResult<ConfigPublic>> {
  const skip = params.skip ?? 0;
  const limit = params.limit ?? 10;
  const query = new URLSearchParams({
    skip: String(skip),
    limit: String(limit),
  });
  const data = await requestJson<ConfigListResponse>(`/api/configs?${query.toString()}`);

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch configs');
  }

  return buildPageResult(data.data, skip, limit);
}

export async function fetchConfigVersionsPage(
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
  );

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch config versions');
  }

  return buildPageResult(data.data, skip, limit);
}

export async function fetchConfigVersionDetail(
  configId: string,
  versionNumber: number,
): Promise<ConfigVersionPublic> {
  const data = await requestJson<ConfigVersionResponse>(
    `/api/configs/${configId}/versions/${versionNumber}`,
  );

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch version details');
  }

  return data.data;
}

export async function fetchConfigSelection(
  config: Pick<ConfigPublic, 'id' | 'name'>,
  versionNumber: number,
): Promise<ConfigSelection> {
  const version = await fetchConfigVersionDetail(config.id, versionNumber);
  const completion = version.config_blob.completion;

  return {
    config_id: config.id,
    config_version: version.version,
    name: config.name,
    provider: completion.provider,
    model: String(completion.params.model || ''),
  };
}

async function findConfigByExactName(name: string): Promise<ConfigPublic | null> {
  const normalizedName = name.trim().toLowerCase();
  const limit = 100;
  let skip = 0;

  while (true) {
    const page = await fetchConfigPage({ skip, limit });
    const match = page.items.find((item) => item.name.trim().toLowerCase() === normalizedName);

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
  configName: string;
  commitMessage: string;
  configBlob: ConfigBlob;
}): Promise<ConfigSelection> {
  const normalizedBlob = normalizeConfigBlobForApi(params.configBlob);
  const trimmedName = params.configName.trim();

  if (!trimmedName) {
    throw new Error('Configuration name is required');
  }

  const existingConfig = await findConfigByExactName(trimmedName);

  if (existingConfig) {
    const versionCreate: ConfigVersionCreate = {
      config_blob: normalizedBlob,
      commit_message: params.commitMessage.trim() || 'Updated assessment configuration',
    };
    const data = await requestJson<ConfigVersionResponse>(
      `/api/configs/${existingConfig.id}/versions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(versionCreate),
      },
    );

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to create config version');
    }

    invalidateAssessmentConfigCache();

    return {
      config_id: existingConfig.id,
      config_version: data.data.version,
      name: existingConfig.name,
      provider: normalizedBlob.completion.provider,
      model: String(normalizedBlob.completion.params.model || ''),
    };
  }

  const configCreate: ConfigCreate = {
    name: trimmedName,
    description: 'Assessment configuration',
    config_blob: normalizedBlob,
    commit_message: params.commitMessage.trim() || 'Initial assessment configuration',
  };
  const data = await requestJson<ConfigWithVersionResponse>('/api/configs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(configCreate),
  });

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to create configuration');
  }

  invalidateAssessmentConfigCache();

  return {
    config_id: data.data.id,
    config_version: data.data.version.version,
    name: data.data.name,
    provider: normalizedBlob.completion.provider,
    model: String(normalizedBlob.completion.params.model || ''),
  };
}
