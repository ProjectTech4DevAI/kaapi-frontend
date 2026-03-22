/**
 * Constants for Management
 */

/** localStorage key for the config cache */
export const CACHE_KEY = 'kaapi_configs_cache';

/** Cache is considered stale after 5 minutes */
export const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

/** Number of configs to load per page on the Config Library page */
export const PAGE_SIZE = 10;

/** Custom event dispatched when background validation invalidates the in-memory cache */
export const CACHE_INVALIDATED_EVENT = 'kaapi:config-cache-invalidated';
