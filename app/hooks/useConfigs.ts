'use client';

/**
 * useConfigs — shared React hook for fetching and managing configurations.
 * Used by Config Library, Prompt Editor, and Evaluations pages.
 *
 * Responsibilities (hook-only layer):
 * - Manages React state (configs, loading flags, error)
 * - Reads from / writes to the shared in-memory + localStorage cache
 * - Exposes stable callbacks for lazy-loading version lists and individual versions
 * - Schedules background cache validation after serving cached data
 *
 * Heavy lifting (API calls, cache I/O, pure transforms) lives in:
 *   lib/configFetchers.ts, lib/store.ts, lib/utils.ts
 */

import { useState, useEffect, useCallback } from 'react';
import { ConfigPublic, ConfigVersionItems, ConfigVersionResponse } from '../lib/configTypes';
import { SavedConfig, ConfigGroup, ConfigCache } from '../lib/types/configs';
import { CACHE_MAX_AGE_MS, CACHE_INVALIDATED_EVENT, PAGE_SIZE } from '../lib/constants';
import {
  configState,
  pendingVersionLoads,
  pendingSingleVersionLoads,
  loadCache,
  saveCache,
} from '../lib/store/configStore';
import {
  fetchAllConfigs,
  fetchNextConfigBatch,
  scheduleBackgroundValidation,
} from '../lib/configFetchers';
import { getApiKey, flattenConfigVersion, groupConfigs } from '../lib/utils';

export interface UseConfigsResult {
  configs: SavedConfig[];
  configGroups: ConfigGroup[];
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<void>;
  isCached: boolean;
  /**
   * Ensures the lightweight version list (no config_blob) is cached for a config.
   * O(1) – either a no-op (already cached) or a single GET /versions call.
   * Does NOT fetch full version details; use loadSingleVersion for that.
   */
  loadVersionsForConfig: (config_id: string) => Promise<void>;
  /** Load the next batch of configs (only relevant when pageSize option is used) */
  loadMoreConfigs: () => Promise<void>;
  /** True when there are more configs available that haven't been loaded yet */
  hasMoreConfigs: boolean;
  /** True while loadMoreConfigs is in progress */
  isLoadingMore: boolean;
  /**
   * Fetches the full details (config_blob) for a single version on demand.
   * Returns the SavedConfig immediately if already loaded; makes 1 GET call otherwise.
   * Safe to call concurrently – duplicate in-flight requests are coalesced.
   */
  loadSingleVersion: (config_id: string, version: number) => Promise<SavedConfig | null>;
  /** Lightweight version items per config, indexed by config_id. */
  versionItemsMap: Record<string, ConfigVersionItems[]>;
}

export function useConfigs(options?: { pageSize?: number }): UseConfigsResult {
  const pageSize = options?.pageSize;
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [versionCounts, setVersionCounts] = useState<Record<string, number>>({});
  const [versionItemsMap, setVersionItemsMap] = useState<Record<string, ConfigVersionItems[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [totalKnownCount, setTotalKnownCount] = useState<number>(0);

  const fetchConfigs = useCallback(async (force: boolean = false) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setError('No API key found. Please add an API key in the Keystore.');
      setIsLoading(false);
      return;
    }

    // ── Fast paths (skipped when force=true) ──
    if (!force) {
      // In-memory cache (fastest — no I/O)
      if (configState.inMemoryCache) {
        const cacheAge = Date.now() - configState.inMemoryCache.cachedAt;
        if (cacheAge < CACHE_MAX_AGE_MS) {
          const cacheUsable = !configState.inMemoryCache.partialFetch || pageSize !== undefined;
          if (cacheUsable) {
            setConfigs(configState.inMemoryCache.configs);
            setVersionCounts(configState.inMemoryCache.versionCounts || {});
            setVersionItemsMap({ ...configState.versionItemsCache });
            setTotalKnownCount(
              configState.inMemoryCache.totalConfigCount ?? configState.inMemoryCache.configs.length,
            );
            setIsCached(true);
            setIsLoading(false);
            scheduleBackgroundValidation(configState.inMemoryCache, apiKey);
            return;
          }
        }
      }

      // localStorage cache
      const lsCache = loadCache();
      if (lsCache) {
        const cacheAge = Date.now() - lsCache.cachedAt;
        if (cacheAge < CACHE_MAX_AGE_MS) {
          const cacheUsable = !lsCache.partialFetch || pageSize !== undefined;
          if (cacheUsable) {
            setConfigs(lsCache.configs);
            setVersionCounts(lsCache.versionCounts || {});
            // versionItemsCache may be empty on cold start; loadVersionsForConfig will
            // populate it on demand (1 GET /versions call) when a config is opened.
            setVersionItemsMap({ ...configState.versionItemsCache });
            setTotalKnownCount(lsCache.totalConfigCount ?? lsCache.configs.length);
            setIsCached(true);
            setIsLoading(false);
            configState.inMemoryCache = lsCache;
            scheduleBackgroundValidation(lsCache, apiKey);
            return;
          }
        }
      }
    }

    // ── Deduplication: join an existing in-flight fetch ───────────────────
    if (configState.pendingFetch) {
      setIsLoading(true);
      await configState.pendingFetch.catch(() => { /* error handled by originator */ });
      if (configState.inMemoryCache) {
        setConfigs(configState.inMemoryCache.configs);
        setVersionCounts(configState.inMemoryCache.versionCounts || {});
        setVersionItemsMap({ ...configState.versionItemsCache });
        setTotalKnownCount(
          configState.inMemoryCache.totalConfigCount ?? configState.inMemoryCache.configs.length,
        );
        setIsCached(false);
      } else {
        setError('Failed to load configurations. Please try again.');
      }
      setIsLoading(false);
      return;
    }

    // ── Primary fetch ── 
    setIsLoading(true);
    setError(null);
    setIsCached(false);

    configState.pendingFetch = (async () => {
      const result = await fetchAllConfigs(apiKey, pageSize);
      const newCache: ConfigCache = {
        configs: result.configs,
        configMeta: result.configMeta,
        cachedAt: Date.now(),
        versionCounts: result.versionCounts,
        totalConfigCount: result.totalConfigCount,
        partialFetch: result.partialFetch,
      };
      saveCache(newCache);
      configState.inMemoryCache = newCache;
      setConfigs(result.configs);
      setVersionCounts(result.versionCounts);
      setVersionItemsMap({ ...configState.versionItemsCache });
      setTotalKnownCount(result.totalConfigCount);
    })().finally(() => {
      configState.pendingFetch = null;
    });

    try {
      await configState.pendingFetch;
    } catch {
      setError('Failed to load configurations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  // ── Lazy-load lightweight version list ── 

  /**
   * Ensures the lightweight version list (ConfigVersionItems, no config_blob) is
   * cached for a given config_id and reflected in versionItemsMap state.
   *
   * Cost: 0 network calls when already cached, otherwise exactly 1 GET /versions.
   * Does NOT fetch full version details — use loadSingleVersion for that.
   */
  const loadVersionsForConfig = useCallback(async (config_id: string) => {
    if (configState.versionItemsCache[config_id]) {
      setVersionItemsMap(prev =>
        prev[config_id] ? prev : { ...prev, [config_id]: configState.versionItemsCache[config_id] },
      );
      return;
    }

    const existing = pendingVersionLoads.get(config_id);
    if (existing) {
      await existing;
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) return;

    const loadPromise = (async () => {
      const versionsResponse = await fetch(`/api/configs/${config_id}/versions`, {
        headers: { 'X-API-KEY': apiKey },
      });
      const versionsData = await versionsResponse.json();
      if (!versionsData.success || !versionsData.data) return;

      configState.versionItemsCache[config_id] = versionsData.data;
      setVersionItemsMap(prev => ({ ...prev, [config_id]: versionsData.data }));
      setVersionCounts(prev => ({ ...prev, [config_id]: versionsData.data.length }));
    })().finally(() => {
      pendingVersionLoads.delete(config_id);
    });

    pendingVersionLoads.set(config_id, loadPromise);
    try {
      await loadPromise;
    } catch {
      console.error(`Failed to load version list for config ${config_id}`);
    }
  }, []);

  // ── On-demand single version detail fetch ──

  /**
   * Fetches the full details (config_blob) for a single version on demand.
   * Returns an already-loaded SavedConfig immediately (0 network calls).
   * Otherwise makes exactly 1 GET /versions/{version} call.
   * Concurrent calls for the same config_id:version share one in-flight request.
   */
  const loadSingleVersion = useCallback(async (
    config_id: string,
    version: number,
  ): Promise<SavedConfig | null> => {
    const loaded = configs.find(c => c.config_id === config_id && c.version === version);
    if (loaded) return loaded;

    const key = `${config_id}:${version}`;
    const existing = pendingSingleVersionLoads.get(key);
    if (existing) return existing;

    const apiKey = getApiKey();
    if (!apiKey) return null;

    const configSource = configs.find(c => c.config_id === config_id);
    if (!configSource) return null;

    const configPublic: ConfigPublic = {
      id: config_id,
      name: configSource.name,
      description: configSource.description ?? null,
      project_id: 0,
      inserted_at: '',
      updated_at: '',
    };

    const loadPromise: Promise<SavedConfig | null> = (async () => {
      try {
        const versionResponse = await fetch(
          `/api/configs/${config_id}/versions/${version}`,
          { headers: { 'X-API-KEY': apiKey } },
        );
        const versionData: ConfigVersionResponse = await versionResponse.json();
        if (!versionData.success || !versionData.data) return null;

        const savedConfig = flattenConfigVersion(configPublic, versionData.data);

        setConfigs(prev => {
          if (prev.some(c => c.config_id === config_id && c.version === version)) return prev;
          const updated = [...prev, savedConfig];
          if (configState.inMemoryCache) {
            configState.inMemoryCache = { ...configState.inMemoryCache, configs: updated };
            saveCache(configState.inMemoryCache);
          }
          return updated;
        });

        return savedConfig;
      } catch (e) {
        console.error(`Failed to fetch version ${version} for config ${config_id}:`, e);
        return null;
      }
    })().finally(() => {
      pendingSingleVersionLoads.delete(key);
    });

    pendingSingleVersionLoads.set(key, loadPromise);
    return loadPromise;
  }, [configs]);

  // ── Paginated load more ──

  /**
   * Loads the next batch of configs (version list + latest detail) for configs
   * not yet represented in the loaded set. Used by the Config Library Load More button.
   */
  const loadMoreConfigs = useCallback(async () => {
    if (!configState.allConfigMeta || configState.allConfigMeta.length === 0) return;
    const apiKey = getApiKey();
    if (!apiKey) return;

    const loadedIds = new Set(
      (configState.inMemoryCache?.configs ?? configs).map(c => c.config_id),
    );
    const remaining = configState.allConfigMeta.filter(c => !loadedIds.has(c.id));
    if (remaining.length === 0) return;

    if (configState.pendingLoadMore) {
      await configState.pendingLoadMore;
      return;
    }

    setIsLoadingMore(true);

    configState.pendingLoadMore = (async () => {
      const { newVersions, newVersionCounts, newConfigMeta } = await fetchNextConfigBatch(
        apiKey,
        loadedIds,
        pageSize ?? PAGE_SIZE,
      );

      setConfigs(prev => {
        const merged = [...prev, ...newVersions];
        if (configState.inMemoryCache) {
          const mergedIds = new Set(merged.map(c => c.config_id));
          const stillPartial = configState.allConfigMeta!.some(c => !mergedIds.has(c.id));
          configState.inMemoryCache = {
            ...configState.inMemoryCache,
            configs: merged,
            versionCounts: { ...configState.inMemoryCache.versionCounts, ...newVersionCounts },
            configMeta: { ...configState.inMemoryCache.configMeta, ...newConfigMeta },
            partialFetch: stillPartial,
          };
          saveCache(configState.inMemoryCache);
        }
        return merged;
      });
      setVersionCounts(prev => ({ ...prev, ...newVersionCounts }));
    })().finally(() => {
      configState.pendingLoadMore = null;
      setIsLoadingMore(false);
    });

    try {
      await configState.pendingLoadMore;
    } catch {
      console.error('Failed to load more configs');
      setIsLoadingMore(false);
    }
  }, [configs, pageSize]);

  // ── Effects ──

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => fetchConfigs(true);
    window.addEventListener(CACHE_INVALIDATED_EVENT, handler);
    return () => window.removeEventListener(CACHE_INVALIDATED_EVENT, handler);
  }, [fetchConfigs]);

  // ── Return ──

  const loadedConfigIds = new Set(configs.map(c => c.config_id));
  const hasMoreConfigs = totalKnownCount > 0 && loadedConfigIds.size < totalKnownCount;

  return {
    configs,
    configGroups: groupConfigs(configs, versionCounts, versionItemsMap),
    isLoading,
    error,
    refetch: fetchConfigs,
    isCached,
    loadVersionsForConfig,
    loadMoreConfigs,
    hasMoreConfigs,
    isLoadingMore,
    loadSingleVersion,
    versionItemsMap,
  };
}
