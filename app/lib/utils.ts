import { Credential, ProviderDef } from "@/app/lib/types/credentials";
import { formatDistanceToNow } from "date-fns";
import { clearConfigCache } from "@/app/lib/store/configStore";
import {
  ConfigPublic,
  ConfigVersionPublic,
  ConfigVersionItems,
  Tool,
} from './configTypes';
import { SavedConfig, ConfigGroup } from './types/configs';

export function timeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

// Format timestamp as relative time
// Handles UTC timestamps from the database and converts them to local time
export function getExistingForProvider(
  provider: ProviderDef,
  creds: Credential[],
): Credential | null {
  return creds.find((c) => c.provider === provider.credentialKey) || null;
}

export const formatRelativeTime = (timestamp: string | number): string => {
  const now = Date.now();

  let date: number;
  if (typeof timestamp === 'string') {
    // If timestamp doesn't include timezone info, assume it's UTC
    // and append 'Z' to ensure it's interpreted as UTC
    const utcTimestamp = timestamp.endsWith('Z') || timestamp.includes('+') || timestamp.includes('T') && timestamp.split('T')[1].includes('-')
      ? timestamp
      : timestamp + 'Z';
    date = new Date(utcTimestamp).getTime();
  } else {
    date = timestamp;
  }

  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

// Call this when a config is saved/updated to invalidate cache
export const invalidateConfigCache = (): void => {
  clearConfigCache();
};

// ============ CONFIG HELPERS ============

/** Reads the first stored API key from localStorage. */
export const getApiKey = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('kaapi_api_keys');
    if (stored) {
      const keys = JSON.parse(stored);
      return keys.length > 0 ? keys[0].key : null;
    }
  } catch (e) {
    console.error('Failed to get API key:', e);
  }
  return null;
};

/**
 * Flattens a raw API config version into the UI's SavedConfig shape.
 * Converts backend flattened `knowledge_base_ids` / `max_num_results` fields
 * into the `tools` array expected by the frontend.
 */
export const flattenConfigVersion = (
  config: ConfigPublic,
  version: ConfigVersionPublic,
): SavedConfig => {
  const blob = version.config_blob;
  const params = blob.completion.params;

  const tools: Tool[] = params.tools || [];

  if (tools.length === 0 && params.knowledge_base_ids) {
    const kbIds = Array.isArray(params.knowledge_base_ids)
      ? params.knowledge_base_ids
      : [params.knowledge_base_ids];

    kbIds.forEach((kbId: string) => {
      if (kbId) {
        tools.push({
          type: 'file_search',
          knowledge_base_ids: [kbId],
          max_num_results: params.max_num_results || 20,
        });
      }
    });
  }

  return {
    id: version.id,
    config_id: config.id,
    name: config.name,
    description: config.description,
    version: version.version,
    timestamp: version.inserted_at,
    instructions: params.instructions || '',
    promptContent: params.instructions || '',
    modelName: params.model || '',
    provider: blob.completion.provider,
    type: blob.completion.type || 'text',
    temperature: params.temperature ?? 0.7,
    vectorStoreIds: tools[0]?.knowledge_base_ids?.[0] || '',
    tools,
    commit_message: version.commit_message,
  };
};

/**
 * Groups a flat array of SavedConfig versions by config_id.
 *
 * @param versionCounts - optional map of config_id → actual total version count from the API
 * @param vItemsMap     - optional lightweight version items per config (from versionItemsCache)
 */
export const groupConfigs = (
  configs: SavedConfig[],
  versionCounts?: Record<string, number>,
  vItemsMap?: Record<string, ConfigVersionItems[]>,
): ConfigGroup[] => {
  const grouped = new Map<string, SavedConfig[]>();

  configs.forEach((config) => {
    const existing = grouped.get(config.config_id) || [];
    existing.push(config);
    grouped.set(config.config_id, existing);
  });

  return Array.from(grouped.entries()).map(([config_id, versions]) => {
    const sortedVersions = versions.sort((a, b) => b.version - a.version);
    const totalVersions = versionCounts?.[config_id] ?? sortedVersions.length;
    return {
      config_id,
      name: sortedVersions[0].name,
      description: sortedVersions[0].description,
      versions: sortedVersions,
      latestVersion: sortedVersions[0],
      totalVersions,
      versionsFullyLoaded: sortedVersions.length >= totalVersions,
      versionItems: vItemsMap?.[config_id] ?? [],
    };
  });
};
