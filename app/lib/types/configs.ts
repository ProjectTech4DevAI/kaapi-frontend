/**
 * UI-specific types for Config Management
 * These types represent configs as they are consumed by the frontend,
 * flattened from the raw API response shapes in configTypes.ts.
 */

import { ConfigVersionItems, Tool } from '@/app/lib/configTypes';

// Re-export so consumers don't need to reach into configTypes directly
export type { ConfigVersionItems, Tool };

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
  type: 'text' | 'stt' | 'tts'; // Config type - always present in UI (defaults to 'text')
  temperature: number;
  vectorStoreIds: string;
  tools?: Tool[];
  commit_message?: string | null;
}

// Config grouped by config_id with all its versions
export interface ConfigGroup {
  config_id: string;
  name: string;
  description?: string | null;
  versions: SavedConfig[]; // fully-loaded entries (have config_blob)
  latestVersion: SavedConfig;
  totalVersions: number;
  /** True once all historical versions have been fetched (lazy-loaded on demand) */
  versionsFullyLoaded: boolean;
  /** Lightweight version list (no config_blob). Populated after initial load; used for history display. */
  versionItems: ConfigVersionItems[];
}

// Cache structure stored in localStorage
export interface ConfigCache {
  configs: SavedConfig[];
  // Map of config_id -> { updated_at, version_count }
  configMeta: Record<string, { updated_at: string; version_count: number }>;
  cachedAt: number; // timestamp when cache was created
  // Actual total version count per config (populated on first fetch)
  versionCounts: Record<string, number>;
  /** Total number of configs available on the server (from GET /api/configs) */
  totalConfigCount?: number;
  /** True when only a subset of configs have had their version details fetched */
  partialFetch?: boolean;
}

// Result shape returned by fetchAllConfigs
export interface FetchResult {
  configs: SavedConfig[];
  configMeta: Record<string, { updated_at: string; version_count: number }>;
  versionCounts: Record<string, number>;
  totalConfigCount: number;
  partialFetch: boolean;
}
