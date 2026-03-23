/**
 * API fetch helpers for Config Management.
 * Contains all network logic — no React, no UI state.
 */

import {
  ConfigPublic,
  ConfigVersionItems,
  ConfigListResponse,
  ConfigVersionListResponse,
  ConfigVersionResponse,
} from "@/app/lib/configTypes";
import { SavedConfig, ConfigCache, FetchResult } from "@/app/lib/types/configs";
import { CACHE_INVALIDATED_EVENT } from "@/app/lib/constants";
import { configState } from "@/app/lib/store/configStore";
import { flattenConfigVersion } from "@/app/lib/utils";
import { apiFetch } from "@/app/lib/apiClient";

/**
 * Schedules a single background validation pass.
 * Only one validation runs at a time; subsequent calls while one is in progress
 * are silently dropped.
 *
 * Uses a single GET /api/configs call and compares only updated_at timestamps —
 * NO per-config GET /api/configs/{id}/versions calls.
 * When a new version is created the backend bumps the parent config's updated_at,
 * so the updated_at check is sufficient to detect all changes.
 */
export function scheduleBackgroundValidation(
  cache: ConfigCache,
  apiKey: string,
): void {
  if (configState.validationInProgress) return;
  configState.validationInProgress = true;

  (async () => {
    try {
      const data = await apiFetch<ConfigListResponse>("/api/configs", apiKey);
      if (!data.success || !data.data) return;

      let needsRefresh = false;
      const currentMeta = cache.configMeta;

      // Check for new or updated configs (updated_at covers version additions too)
      for (const config of data.data) {
        const cached = currentMeta[config.id];
        if (!cached || cached.updated_at !== config.updated_at) {
          needsRefresh = true;
          break;
        }
      }

      // Check for deleted configs
      if (!needsRefresh) {
        const currentIds = new Set(data.data.map((c) => c.id));
        for (const cachedId of Object.keys(currentMeta)) {
          if (!currentIds.has(cachedId)) {
            needsRefresh = true;
            break;
          }
        }
      }

      if (needsRefresh) {
        configState.inMemoryCache = null;
        configState.versionItemsCache = {};
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event(CACHE_INVALIDATED_EVENT));
        }
      }
    } catch {
      // Silent — background validation failure is non-critical
    } finally {
      configState.validationInProgress = false;
    }
  })();
}

/**
 * Fetches configs and their LATEST version detail.
 * Reduces API calls from 1 + N + N*M  →  1 + 2N
 * (configs list) + (versions list per config) + (one latest-version detail per config)
 *
 * When pageSize is provided, only the first N configs get version details fetched.
 * The full lightweight config list is always stored in configState.allConfigMeta.
 */
export async function fetchAllConfigs(
  apiKey: string,
  pageSize?: number,
): Promise<FetchResult> {
  const data = await apiFetch<ConfigListResponse>("/api/configs", apiKey);

  if (!data.success || !data.data) {
    throw new Error(data.error || "Failed to fetch configs");
  }

  // Always store the full lightweight list so loadMoreConfigs knows what's available
  configState.allConfigMeta = data.data;
  const totalConfigCount = data.data.length;

  const allVersions: SavedConfig[] = [];
  const configMeta: Record<
    string,
    { updated_at: string; version_count: number }
  > = {};
  const versionCounts: Record<string, number> = {};

  const configsToFetch =
    pageSize !== undefined ? data.data.slice(0, pageSize) : data.data;

  const BATCH_SIZE = 5;

  for (let i = 0; i < configsToFetch.length; i += BATCH_SIZE) {
    const batch = configsToFetch.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (config) => {
      try {
        const versionsData = await apiFetch<ConfigVersionListResponse>(
          `/api/configs/${config.id}/versions`,
          apiKey,
        );

        if (
          versionsData.success &&
          versionsData.data &&
          versionsData.data.length > 0
        ) {
          const versionCount = versionsData.data.length;
          configMeta[config.id] = {
            updated_at: config.updated_at,
            version_count: versionCount,
          };
          versionCounts[config.id] = versionCount;
          // Cache the lightweight version list so loadVersionsForConfig doesn't re-fetch it
          configState.versionItemsCache[config.id] = versionsData.data;

          const latestItem = versionsData.data.reduce((a, b) =>
            b.version > a.version ? b : a,
          );
          try {
            const versionData = await apiFetch<ConfigVersionResponse>(
              `/api/configs/${config.id}/versions/${latestItem.version}`,
              apiKey,
            );
            if (versionData.success && versionData.data) {
              return [flattenConfigVersion(config, versionData.data)];
            }
          } catch (e) {
            console.error(
              `Failed to fetch latest version for config ${config.id}:`,
              e,
            );
          }
        }
      } catch (e) {
        console.error(`Failed to fetch versions for config ${config.id}:`, e);
      }
      return [];
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach((versions) => allVersions.push(...versions));
  }

  return {
    configs: allVersions,
    configMeta,
    versionCounts,
    totalConfigCount,
    partialFetch: configsToFetch.length < totalConfigCount,
  };
}

/**
 * Lazily fetches all remaining version details for a specific config.
 * Uses in-memory caches to avoid re-fetching the config metadata or the
 * version-list endpoint — those were already called during the initial load.
 */
export async function fetchRemainingVersions(
  config_id: string,
  apiKey: string,
  alreadyLoaded: SavedConfig[],
  configSource: SavedConfig,
): Promise<SavedConfig[]> {
  const config: ConfigPublic = {
    id: config_id,
    name: configSource.name,
    description: configSource.description ?? null,
    project_id: 0,
    inserted_at: "",
    updated_at: "",
  };

  // Use the cached version-items list, falling back to a fresh API call only if
  // the cache was invalidated (e.g. after a force-refetch).
  let versionItems: ConfigVersionItems[] | undefined =
    configState.versionItemsCache[config_id];
  if (!versionItems) {
    const versionsResponse = await fetch(`/api/configs/${config_id}/versions`, {
      headers: { "X-API-KEY": apiKey },
    });
    const versionsData: ConfigVersionListResponse =
      await versionsResponse.json();
    if (!versionsData.success || !versionsData.data) return [];
    versionItems = versionsData.data;
    configState.versionItemsCache[config_id] = versionItems;
  }

  const loadedVersionNumbers = new Set(alreadyLoaded.map((v) => v.version));
  const missingVersions = versionItems.filter(
    (v) => !loadedVersionNumbers.has(v.version),
  );

  if (missingVersions.length === 0) return [];

  const fetchedVersions = await Promise.all(
    missingVersions.map(async (versionItem) => {
      try {
        const versionResponse = await fetch(
          `/api/configs/${config_id}/versions/${versionItem.version}`,
          { headers: { "X-API-KEY": apiKey } },
        );
        const versionData: ConfigVersionResponse = await versionResponse.json();
        if (versionData.success && versionData.data) {
          return flattenConfigVersion(config, versionData.data);
        }
      } catch (e) {
        console.error(
          `Failed to fetch version ${versionItem.version} for config ${config_id}:`,
          e,
        );
      }
      return null;
    }),
  );

  return fetchedVersions.filter((v): v is SavedConfig => v !== null);
}

/**
 * Fetches version details for the next batch of configs not yet loaded.
 * Used by the Config Library "Load More" feature.
 * Mutates configState.inMemoryCache directly and returns new versions + counts.
 */
export async function fetchNextConfigBatch(
  apiKey: string,
  loadedIds: Set<string>,
  batchSize: number,
): Promise<{
  newVersions: SavedConfig[];
  newVersionCounts: Record<string, number>;
  newConfigMeta: Record<string, { updated_at: string; version_count: number }>;
}> {
  const allMeta = configState.allConfigMeta;
  if (!allMeta)
    return { newVersions: [], newVersionCounts: {}, newConfigMeta: {} };

  const remaining = allMeta.filter((c) => !loadedIds.has(c.id));
  const batch = remaining.slice(0, batchSize);

  const newVersions: SavedConfig[] = [];
  const newVersionCounts: Record<string, number> = {};
  const newConfigMeta: Record<
    string,
    { updated_at: string; version_count: number }
  > = {};

  const INNER_BATCH = 5;
  for (let i = 0; i < batch.length; i += INNER_BATCH) {
    const subBatch = batch.slice(i, i + INNER_BATCH);
    const results = await Promise.all(
      subBatch.map(async (config) => {
        try {
          const versionsData = await apiFetch<ConfigVersionListResponse>(
            `/api/configs/${config.id}/versions`,
            apiKey,
          );
          if (
            versionsData.success &&
            versionsData.data &&
            versionsData.data.length > 0
          ) {
            const versionCount = versionsData.data.length;
            newConfigMeta[config.id] = {
              updated_at: config.updated_at,
              version_count: versionCount,
            };
            newVersionCounts[config.id] = versionCount;
            configState.versionItemsCache[config.id] = versionsData.data;
            const latestItem = versionsData.data.reduce((a, b) =>
              b.version > a.version ? b : a,
            );
            const versionData = await apiFetch<ConfigVersionResponse>(
              `/api/configs/${config.id}/versions/${latestItem.version}`,
              apiKey,
            );
            if (versionData.success && versionData.data) {
              return [flattenConfigVersion(config, versionData.data)];
            }
          }
        } catch (e) {
          console.error(`Failed to load more config ${config.id}:`, e);
        }
        return [];
      }),
    );
    results.forEach((v) => newVersions.push(...v));
  }

  return { newVersions, newVersionCounts, newConfigMeta };
}
