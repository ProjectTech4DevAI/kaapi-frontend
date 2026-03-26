"use client";

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

import { useState, useEffect, useCallback } from "react";
import {
  ConfigPublic,
  ConfigVersionItems,
  ConfigVersionResponse,
} from "@/app/lib/configTypes";
import { SavedConfig, ConfigGroup, ConfigCache } from "@/app/lib/types/configs";
import {
  CACHE_MAX_AGE_MS,
  CACHE_INVALIDATED_EVENT,
  PAGE_SIZE,
} from "@/app/lib/constants";
import {
  configState,
  pendingVersionLoads,
  pendingSingleVersionLoads,
  loadCache,
  saveCache,
} from "@/app/lib/store/configStore";
import {
  fetchAllConfigs,
  fetchNextConfigBatch,
  scheduleBackgroundValidation,
} from "@/app/lib/configFetchers";
import { flattenConfigVersion, groupConfigs } from "@/app/lib/utils";
import { apiFetch } from "@/app/lib/apiClient";
import { useAuth } from "@/app/lib/context/AuthContext";

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
  /** Fetches the full details (config_blob) for a single version on demand.
   * Returns the SavedConfig immediately if already loaded; makes 1 GET call otherwise.
   * Safe to call concurrently – duplicate in-flight requests are coalesced.
   */
  loadSingleVersion: (
    config_id: string,
    version: number,
  ) => Promise<SavedConfig | null>;
  /** Lightweight version items per config, indexed by config_id. */
  versionItemsMap: Record<string, ConfigVersionItems[]>;
  allConfigMeta: ConfigPublic[]; // Full lightweight config list from GET /api/configs.
}

export function useConfigs(options?: { pageSize?: number }): UseConfigsResult {
  const pageSize = options?.pageSize;
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [versionCounts, setVersionCounts] = useState<Record<string, number>>(
    {},
  );
  const [versionItemsMap, setVersionItemsMap] = useState<
    Record<string, ConfigVersionItems[]>
  >({});
  const [allConfigMeta, setAllConfigMeta] = useState<ConfigPublic[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [totalKnownCount, setTotalKnownCount] = useState<number>(0);
  const { activeKey, isHydrated } = useAuth();
  const apiKey = activeKey?.key;

  const fetchConfigs = useCallback(
    async (force: boolean = false) => {
      // Wait for AuthContext to load apiKey from localStorage to avoid premature "No API key" error on refresh.
      if (!isHydrated) return;

      if (!apiKey) {
        setError("No API key found. Please add an API key in the Keystore.");
        setIsLoading(false);
        return;
      }

      // ── Fast paths (skipped when force=true) ──
      if (!force) {
        // In-memory cache (fastest — no I/O)
        if (configState.inMemoryCache) {
          const cacheAge = Date.now() - configState.inMemoryCache.cachedAt;
          if (cacheAge < CACHE_MAX_AGE_MS) {
            // A cache saved with pageSize:0 (ConfigSelector) has configs:[] — don't let it
            // satisfy a caller that needs actual config data (e.g. Library with pageSize:10).
            const cachedCount = configState.inMemoryCache.configs.length;
            const cacheUsable =
              !configState.inMemoryCache.partialFetch ||
              (pageSize !== undefined && cachedCount >= pageSize);
            const resolvedMeta =
              configState.allConfigMeta ??
              configState.inMemoryCache.allConfigMeta ??
              null;
            const totalCount = configState.inMemoryCache.totalConfigCount ?? 0;
            // Skip cache if allConfigMeta is missing but configs exist (stale/old cache schema).
            const cacheHasUsableMeta =
              resolvedMeta !== null || totalCount === 0;
            if (cacheUsable && cacheHasUsableMeta) {
              configState.allConfigMeta = resolvedMeta;
              setConfigs(configState.inMemoryCache.configs);
              setVersionCounts(configState.inMemoryCache.versionCounts || {});
              setVersionItemsMap({ ...configState.versionItemsCache });
              setTotalKnownCount(
                configState.inMemoryCache.totalConfigCount ??
                  configState.inMemoryCache.configs.length,
              );
              setAllConfigMeta(resolvedMeta ?? []);
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
            // Ignore cache with empty configs (pageSize:0) when actual data (e.g. pageSize:10) is required.
            const cachedCount = lsCache.configs.length;
            const cacheUsable =
              !lsCache.partialFetch ||
              (pageSize !== undefined && cachedCount >= pageSize);
            const resolvedMeta =
              configState.allConfigMeta ?? lsCache.allConfigMeta ?? null;
            const totalCount = lsCache.totalConfigCount ?? 0;
            const cacheHasUsableMeta =
              resolvedMeta !== null || totalCount === 0;
            if (cacheUsable && cacheHasUsableMeta) {
              configState.allConfigMeta = resolvedMeta;
              configState.inMemoryCache = lsCache;
              setConfigs(lsCache.configs);
              setVersionCounts(lsCache.versionCounts || {});
              // versionItemsCache may be empty on cold start; loadVersionsForConfig will
              // populate it on demand (1 GET /versions call) when a config is opened.
              setVersionItemsMap({ ...configState.versionItemsCache });
              setTotalKnownCount(
                lsCache.totalConfigCount ?? lsCache.configs.length,
              );
              setAllConfigMeta(resolvedMeta ?? []);
              setIsCached(true);
              setIsLoading(false);
              scheduleBackgroundValidation(lsCache, apiKey);
              return;
            }
          }
        }
      }

      if (configState.pendingFetch) {
        setIsLoading(true);
        await configState.pendingFetch.catch(() => {
          /* error handled by originator */
        });
        if (configState.inMemoryCache) {
          setConfigs(configState.inMemoryCache.configs);
          setVersionCounts(configState.inMemoryCache.versionCounts || {});
          setVersionItemsMap({ ...configState.versionItemsCache });
          setTotalKnownCount(
            configState.inMemoryCache.totalConfigCount ??
              configState.inMemoryCache.configs.length,
          );
          setAllConfigMeta(configState.allConfigMeta ?? []);
          setIsCached(false);
        } else {
          setError("Failed to load configurations. Please try again.");
        }
        setIsLoading(false);
        return;
      }

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
          allConfigMeta: configState.allConfigMeta ?? [],
        };
        saveCache(newCache);
        configState.inMemoryCache = newCache;
        setConfigs(result.configs);
        setVersionCounts(result.versionCounts);
        setVersionItemsMap({ ...configState.versionItemsCache });
        setTotalKnownCount(result.totalConfigCount);
        setAllConfigMeta(configState.allConfigMeta ?? []);
      })().finally(() => {
        configState.pendingFetch = null;
      });

      try {
        await configState.pendingFetch;
      } catch {
        setError("Failed to load configurations. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize, apiKey, isHydrated],
  );

  /**
   * Ensures the lightweight version list (ConfigVersionItems, no config_blob) is
   * cached for a given config_id and reflected in versionItemsMap state.
   *
   * Cost: 0 network calls when already cached, otherwise exactly 1 GET /versions.
   * Does NOT fetch full version details — use loadSingleVersion for that.
   */
  const loadVersionsForConfig = useCallback(
    async (config_id: string) => {
      if (configState.versionItemsCache[config_id]) {
        setVersionItemsMap((prev) =>
          prev[config_id]
            ? prev
            : {
                ...prev,
                [config_id]: configState.versionItemsCache[config_id],
              },
        );
        return;
      }

      const existing = pendingVersionLoads.get(config_id);
      if (existing) {
        await existing;
        return;
      }

      if (!apiKey) return;

      const loadPromise = (async () => {
        const versionsData = await apiFetch<{
          success: boolean;
          data: ConfigVersionItems[];
        }>(`/api/configs/${config_id}/versions`, apiKey);
        if (!versionsData.success || !versionsData.data) return;

        configState.versionItemsCache[config_id] = versionsData.data;
        setVersionItemsMap((prev) => ({
          ...prev,
          [config_id]: versionsData.data,
        }));
        setVersionCounts((prev) => ({
          ...prev,
          [config_id]: versionsData.data.length,
        }));
      })().finally(() => {
        pendingVersionLoads.delete(config_id);
      });

      pendingVersionLoads.set(config_id, loadPromise);
      try {
        await loadPromise;
      } catch {
        console.error(`Failed to load version list for config ${config_id}`);
      }
    },
    [apiKey],
  );

  /**
   * Fetches the full details (config_blob) for a single version on demand.
   * Returns an already-loaded SavedConfig immediately (0 network calls).
   * Otherwise makes exactly 1 GET /versions/{version} call.
   * Concurrent calls for the same config_id:version share one in-flight request.
   */
  const loadSingleVersion = useCallback(
    async (config_id: string, version: number): Promise<SavedConfig | null> => {
      const loaded = configs.find(
        (c) => c.config_id === config_id && c.version === version,
      );
      if (loaded) return loaded;

      const key = `${config_id}:${version}`;
      const existing = pendingSingleVersionLoads.get(key);
      if (existing) return existing;

      if (!apiKey) return null;

      const configSource = configs.find((c) => c.config_id === config_id);
      // Fall back to the lightweight allConfigMeta when the config hasn't been detail-fetched yet
      const metaSource = configState.allConfigMeta?.find(
        (m) => m.id === config_id,
      );
      if (!configSource && !metaSource) return null;

      const configPublic: ConfigPublic = configSource
        ? {
            id: config_id,
            name: configSource.name,
            description: configSource.description ?? null,
            project_id: 0,
            inserted_at: "",
            updated_at: "",
          }
        : metaSource!;

      const loadPromise: Promise<SavedConfig | null> = (async () => {
        try {
          const versionData = await apiFetch<ConfigVersionResponse>(
            `/api/configs/${config_id}/versions/${version}`,
            apiKey,
          );
          if (!versionData.success || !versionData.data) return null;

          const savedConfig = flattenConfigVersion(
            configPublic,
            versionData.data,
          );

          setConfigs((prev) => {
            if (
              prev.some(
                (c) => c.config_id === config_id && c.version === version,
              )
            )
              return prev;
            const updated = [...prev, savedConfig];
            if (configState.inMemoryCache) {
              configState.inMemoryCache = {
                ...configState.inMemoryCache,
                configs: updated,
              };
              saveCache(configState.inMemoryCache);
            }
            return updated;
          });

          return savedConfig;
        } catch (e) {
          console.error(
            `Failed to fetch version ${version} for config ${config_id}:`,
            e,
          );
          return null;
        }
      })().finally(() => {
        pendingSingleVersionLoads.delete(key);
      });

      pendingSingleVersionLoads.set(key, loadPromise);
      return loadPromise;
    },
    [configs],
  );

  /**
   * Loads the next batch of configs (version list + latest detail) for configs
   * not yet represented in the loaded set. Used by the Config Library Load More button.
   */
  const loadMoreConfigs = useCallback(async () => {
    if (!configState.allConfigMeta || configState.allConfigMeta.length === 0)
      return;
    const apiKey = activeKey?.key;
    if (!apiKey) return;

    const loadedIds = new Set(
      (configState.inMemoryCache?.configs ?? configs).map((c) => c.config_id),
    );
    const remaining = configState.allConfigMeta.filter(
      (c) => !loadedIds.has(c.id),
    );
    if (remaining.length === 0) return;

    if (configState.pendingLoadMore) {
      await configState.pendingLoadMore;
      return;
    }

    setIsLoadingMore(true);

    configState.pendingLoadMore = (async () => {
      const { newVersions, newVersionCounts, newConfigMeta } =
        await fetchNextConfigBatch(apiKey, loadedIds, pageSize ?? PAGE_SIZE);

      setConfigs((prev) => {
        const merged = [...prev, ...newVersions];
        if (configState.inMemoryCache) {
          const mergedIds = new Set(merged.map((c) => c.config_id));
          const stillPartial = configState.allConfigMeta!.some(
            (c) => !mergedIds.has(c.id),
          );
          configState.inMemoryCache = {
            ...configState.inMemoryCache,
            configs: merged,
            versionCounts: {
              ...configState.inMemoryCache.versionCounts,
              ...newVersionCounts,
            },
            configMeta: {
              ...configState.inMemoryCache.configMeta,
              ...newConfigMeta,
            },
            partialFetch: stillPartial,
          };
          saveCache(configState.inMemoryCache);
        }
        return merged;
      });
      setVersionCounts((prev) => ({ ...prev, ...newVersionCounts }));
    })().finally(() => {
      configState.pendingLoadMore = null;
      setIsLoadingMore(false);
    });

    try {
      await configState.pendingLoadMore;
    } catch {
      console.error("Failed to load more configs");
      setIsLoadingMore(false);
    }
  }, [configs, pageSize]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => fetchConfigs(true);
    window.addEventListener(CACHE_INVALIDATED_EVENT, handler);
    return () => window.removeEventListener(CACHE_INVALIDATED_EVENT, handler);
  }, [fetchConfigs]);

  const loadedConfigIds = new Set(configs.map((c) => c.config_id));
  const hasMoreConfigs =
    totalKnownCount > 0 && loadedConfigIds.size < totalKnownCount;

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
    allConfigMeta,
  };
}
