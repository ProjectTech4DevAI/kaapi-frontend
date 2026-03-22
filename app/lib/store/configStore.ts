/**
 * Module-level mutable state and localStorage cache utilities for Config Management.
 *
 * All shared state is held on a single exported object (`configState`) so that
 * other modules (configFetchers, the hook) can mutate it via property assignment—
 * which works correctly with ES module semantics, unlike reassigning named exports.
 */

import { ConfigPublic, ConfigVersionItems } from '@/app/lib/configTypes';
import { ConfigCache, SavedConfig } from '@/app/lib/types/configs';
import { CACHE_KEY } from '@/app/lib/constants';

/**
 * All module-level mutable singletons in one object.
 * Properties can be read and reassigned from any importing module.
 */
export const configState = {
  /** In-memory cache for the current session (avoids localStorage reads). */
  inMemoryCache: null as ConfigCache | null,

  /**
   * In-memory lightweight version-item list per config (no config_blob).
   * Populated during initial fetchAllConfigs so loadVersionsForConfig can skip
   * the extra GET /api/configs/{id}/versions re-fetches.
   */
  versionItemsCache: {} as Record<string, ConfigVersionItems[]>,

  /**
   * Full lightweight config list from GET /api/configs (no version details).
   * Used by loadMoreConfigs to know which configs still need version details fetched.
   */
  allConfigMeta: null as ConfigPublic[] | null,

  /** Deduplication guard for concurrent loadMoreConfigs calls. */
  pendingLoadMore: null as Promise<void> | null,

  /**
   * A single in-flight fetch promise shared by every useConfigs() instance.
   * When a second component calls fetchConfigs() while a fetch is already running,
   * it awaits this promise instead of starting its own request.
   */
  pendingFetch: null as Promise<void> | null,

  /**
   * Prevents concurrent background validations.
   * A single GET /api/configs call is all that's needed.
   */
  validationInProgress: false,
};

/**
 * Per-version in-flight fetch promises for single on-demand version detail loads.
 * Key is `${config_id}:${version}`. Prevents duplicate fetches when the user
 * rapidly clicks the same history entry.
 */
export const pendingSingleVersionLoads = new Map<string, Promise<SavedConfig | null>>();

/**
 * Per-config in-flight version-load promises.
 * Deduplicates concurrent loadVersionsForConfig(config_id) calls.
 */
export const pendingVersionLoads = new Map<string, Promise<void>>();

export const loadCache = (): ConfigCache | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.error('Failed to load config cache:', e);
  }
  return null;
};

export const saveCache = (cache: ConfigCache): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to save config cache:', e);
  }
};

export const clearConfigCache = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CACHE_KEY);
    configState.inMemoryCache = null;
    configState.versionItemsCache = {};
  } catch (e) {
    console.error('Failed to clear config cache:', e);
  }
};
