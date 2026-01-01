/**
 * Shared hook for fetching and managing configurations
 * Used by Config Library, Prompt Editor, and Evaluations pages
 *
 * Features:
 * - localStorage caching for fast subsequent loads
 * - Cache invalidation based on config updated_at timestamps
 * - In-memory cache to avoid redundant fetches within same session
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ConfigPublic,
  ConfigVersionPublic,
  Tool,
  ConfigListResponse,
  ConfigVersionListResponse,
  ConfigVersionResponse,
} from './configTypes';

// ============ TYPES ============

// UI representation of a config version (flattened for easier display)
export interface SavedConfig {
  id: string; // version id
  config_id: string; // parent config id
  name: string;
  description?: string | null;
  version: number;
  timestamp: string; // ISO datetime from backend
  instructions: string;
  promptContent: string; // Same as instructions for compatibility
  modelName: string;
  provider: string;
  temperature: number;
  vectorStoreIds: string;
  tools?: Tool[];
  commit_message?: string | null;
}

// Config grouped by name with all its versions
export interface ConfigGroup {
  config_id: string;
  name: string;
  description?: string | null;
  versions: SavedConfig[];
  latestVersion: SavedConfig;
  totalVersions: number;
}

// Cache structure stored in localStorage
interface ConfigCache {
  configs: SavedConfig[];
  // Map of config_id -> { updated_at, version_count }
  configMeta: Record<string, { updated_at: string; version_count: number }>;
  cachedAt: number; // timestamp when cache was created
}

// ============ CONSTANTS ============

const CACHE_KEY = 'kaapi_configs_cache';
const CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes - cache is considered stale after this

// ============ HELPER FUNCTIONS ============

// Get API key from localStorage
const getApiKey = (): string | null => {
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

// Flatten config version for UI
const flattenConfigVersion = (
  config: ConfigPublic,
  version: ConfigVersionPublic
): SavedConfig => {
  const blob = version.config_blob;
  const params = blob.completion.params;

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
    temperature: params.temperature || 0.7,
    vectorStoreIds: params.tools?.[0]?.vector_store_ids?.[0] || '',
    tools: params.tools || [],
    commit_message: version.commit_message,
  };
};

// Group configs by name
const groupConfigs = (configs: SavedConfig[]): ConfigGroup[] => {
  const grouped = new Map<string, SavedConfig[]>();

  configs.forEach((config) => {
    const existing = grouped.get(config.config_id) || [];
    existing.push(config);
    grouped.set(config.config_id, existing);
  });

  return Array.from(grouped.entries()).map(([config_id, versions]) => {
    // Sort versions by version number descending
    const sortedVersions = versions.sort((a, b) => b.version - a.version);
    return {
      config_id,
      name: sortedVersions[0].name,
      description: sortedVersions[0].description,
      versions: sortedVersions,
      latestVersion: sortedVersions[0],
      totalVersions: sortedVersions.length,
    };
  });
};

// ============ CACHE FUNCTIONS ============

// Load cache from localStorage
const loadCache = (): ConfigCache | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Failed to load config cache:', e);
  }
  return null;
};

// Save cache to localStorage
const saveCache = (cache: ConfigCache): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to save config cache:', e);
  }
};

// Clear cache
export const clearConfigCache = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CACHE_KEY);
    // Also clear in-memory cache
    inMemoryCache = null;
  } catch (e) {
    console.error('Failed to clear config cache:', e);
  }
};

// In-memory cache for current session (avoids localStorage reads)
let inMemoryCache: ConfigCache | null = null;

// ============ MAIN HOOK ============

export interface UseConfigsResult {
  configs: SavedConfig[];
  configGroups: ConfigGroup[];
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<void>;
  isCached: boolean;
}

export function useConfigs(): UseConfigsResult {
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);
  const fetchInProgress = useRef<boolean>(false);

  // Store refetch function in ref for background validation
  const refetchRef = useRef<((force: boolean) => Promise<void>) | undefined>(undefined);

  const fetchConfigs = useCallback(async (force: boolean = false) => {
    // Prevent concurrent fetches
    if (fetchInProgress.current) return;

    const apiKey = getApiKey();
    if (!apiKey) {
      setError('No API key found. Please add an API key in the Keystore.');
      setIsLoading(false);
      return;
    }

    // Validate cache in background without blocking UI
    const validateCacheInBackground = async (cache: ConfigCache) => {
      try {
        // Fetch just the config list (lightweight call)
        const response = await fetch('/api/configs', {
          headers: { 'X-API-KEY': apiKey },
        });
        const data: ConfigListResponse = await response.json();

        if (!data.success || !data.data) return;

        // Check if any config has been updated or new configs added
        let needsRefresh = false;
        const currentMeta = cache.configMeta;

        // Check for new or updated configs
        for (const config of data.data) {
          const cached = currentMeta[config.id];
          if (!cached) {
            needsRefresh = true;
            break;
          }
          if (cached.updated_at !== config.updated_at) {
            needsRefresh = true;
            break;
          }
        }

        // Check for deleted configs
        if (!needsRefresh) {
          const currentIds = new Set(data.data.map(c => c.id));
          for (const cachedId of Object.keys(currentMeta)) {
            if (!currentIds.has(cachedId)) {
              needsRefresh = true;
              break;
            }
          }
        }

        // Also check version counts by fetching version lists
        if (!needsRefresh) {
          for (const config of data.data) {
            const cached = currentMeta[config.id];
            if (cached) {
              try {
                const versionsResponse = await fetch(`/api/configs/${config.id}/versions`, {
                  headers: { 'X-API-KEY': apiKey },
                });
                const versionsData: ConfigVersionListResponse = await versionsResponse.json();
                if (versionsData.success && versionsData.data) {
                  if (versionsData.data.length !== cached.version_count) {
                    needsRefresh = true;
                    break;
                  }
                }
              } catch {
                // If we can't check, assume we need refresh to be safe
                needsRefresh = true;
                break;
              }
            }
          }
        }

        if (needsRefresh) {
          console.log('Cache invalidated, refreshing configs...');
          inMemoryCache = null;
          fetchInProgress.current = false;
          if (refetchRef.current) {
            await refetchRef.current(true);
          }
        }
      } catch {
        console.error('Failed to validate cache');
      }
    };

    // Check in-memory cache first (fastest)
    if (!force && inMemoryCache) {
      const cacheAge = Date.now() - inMemoryCache.cachedAt;
      if (cacheAge < CACHE_MAX_AGE_MS) {
        setConfigs(inMemoryCache.configs);
        setIsCached(true);
        setIsLoading(false);
        // Validate cache in background
        validateCacheInBackground(inMemoryCache);
        return;
      }
    }

    // Check localStorage cache
    if (!force) {
      const cache = loadCache();
      if (cache) {
        const cacheAge = Date.now() - cache.cachedAt;
        if (cacheAge < CACHE_MAX_AGE_MS) {
          setConfigs(cache.configs);
          setIsCached(true);
          setIsLoading(false);
          inMemoryCache = cache;
          // Validate cache in background
          validateCacheInBackground(cache);
          return;
        }
      }
    }

    // No valid cache, fetch from API
    fetchInProgress.current = true;
    setIsLoading(true);
    setError(null);
    setIsCached(false);

    try {
      const result = await fetchAllConfigs(apiKey);
      setConfigs(result.configs);

      // Save to cache
      const newCache: ConfigCache = {
        configs: result.configs,
        configMeta: result.configMeta,
        cachedAt: Date.now(),
      };
      saveCache(newCache);
      inMemoryCache = newCache;
    } catch {
      console.error('Failed to load saved configs');
      setError('Failed to load configurations. Please try again.');
    } finally {
      setIsLoading(false);
      fetchInProgress.current = false;
    }
  }, []);

  // Store refetch in ref for background validation
  refetchRef.current = fetchConfigs;

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  return {
    configs,
    configGroups: groupConfigs(configs),
    isLoading,
    error,
    refetch: fetchConfigs,
    isCached,
  };
}

// ============ FETCH HELPERS ============

interface FetchResult {
  configs: SavedConfig[];
  configMeta: Record<string, { updated_at: string; version_count: number }>;
}

async function fetchAllConfigs(apiKey: string): Promise<FetchResult> {
  // Fetch all configs
  const response = await fetch('/api/configs', {
    headers: { 'X-API-KEY': apiKey },
  });
  const data: ConfigListResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch configs');
  }

  const allVersions: SavedConfig[] = [];
  const configMeta: Record<string, { updated_at: string; version_count: number }> = {};

  // Fetch versions for all configs in parallel (batched)
  const BATCH_SIZE = 5; // Fetch 5 configs at a time
  const configs = data.data;

  for (let i = 0; i < configs.length; i += BATCH_SIZE) {
    const batch = configs.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (config) => {
      try {
        const versionsResponse = await fetch(`/api/configs/${config.id}/versions`, {
          headers: { 'X-API-KEY': apiKey },
        });
        const versionsData: ConfigVersionListResponse = await versionsResponse.json();

        if (versionsData.success && versionsData.data) {
          // Store metadata for cache validation
          configMeta[config.id] = {
            updated_at: config.updated_at,
            version_count: versionsData.data.length,
          };

          // Fetch all version details in parallel
          const versionPromises = versionsData.data.map(async (versionItem) => {
            try {
              const versionResponse = await fetch(
                `/api/configs/${config.id}/versions/${versionItem.version}`,
                { headers: { 'X-API-KEY': apiKey } }
              );
              const versionData: ConfigVersionResponse = await versionResponse.json();

              if (versionData.success && versionData.data) {
                return flattenConfigVersion(config, versionData.data);
              }
            } catch (e) {
              console.error(`Failed to fetch version ${versionItem.version}:`, e);
            }
            return null;
          });

          const versions = await Promise.all(versionPromises);
          return versions.filter((v): v is SavedConfig => v !== null);
        }
      } catch (e) {
        console.error(`Failed to fetch versions for config ${config.id}:`, e);
      }
      return [];
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(versions => allVersions.push(...versions));
  }

  return { configs: allVersions, configMeta };
}

// ============ UTILITY FUNCTIONS ============

// Format timestamp as relative time
export const formatRelativeTime = (timestamp: string | number): string => {
  const now = Date.now();
  const date = typeof timestamp === 'string'
    ? new Date(timestamp).getTime()
    : timestamp;

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

// ============ CACHE INVALIDATION HELPERS ============

// Call this when a config is saved/updated to invalidate cache
export const invalidateConfigCache = (): void => {
  clearConfigCache();
};
