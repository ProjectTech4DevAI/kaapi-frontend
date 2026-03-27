/**
 * Types for Config Management
 * These types represent configs as they are consumed by the frontend,
 */

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
  type: "text" | "stt" | "tts"; // Config type - always present in UI (defaults to 'text')
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
  allConfigMeta?: ConfigPublic[]; // Full lightweight config list.
}

// Result shape returned by fetchAllConfigs
export interface FetchResult {
  configs: SavedConfig[];
  configMeta: Record<string, { updated_at: string; version_count: number }>;
  versionCounts: Record<string, number>;
  totalConfigCount: number;
  partialFetch: boolean;
}

// Config Blob Structure
export interface Tool {
  type: "file_search";
  knowledge_base_ids: string[];
  max_num_results: number;
}

export interface CompletionParams {
  model: string;
  instructions: string;
  temperature?: number;
  // Frontend uses tools array for UI, but backend expects flattened fields
  tools?: Tool[];
  // Backend expects these as direct fields (flattened from tools array)
  knowledge_base_ids?: string[];
  max_num_results?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow additional provider-specific params
}

export interface CompletionConfig {
  provider: "openai"; // | 'anthropic' | 'google'; // Only OpenAI supported for now
  type?: "text" | "stt" | "tts"; // Config type - optional for backward compatibility
  params: CompletionParams;
}

export interface ConfigBlob {
  completion: CompletionConfig;
}

// Request Types
export interface ConfigCreate {
  name: string; // 1-128 chars, unique per project
  description?: string | null; // max 512 chars
  config_blob: ConfigBlob;
  commit_message?: string | null; // max 512 chars
}

export interface ConfigUpdate {
  name?: string | null; // 1-128 chars
  description?: string | null; // max 512 chars
}

export interface ConfigVersionCreate {
  config_blob: ConfigBlob;
  commit_message?: string | null; // max 512 chars
}

// Response Types
export interface ConfigPublic {
  id: string; // UUID
  name: string;
  description: string | null;
  project_id: number;
  inserted_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export interface ConfigVersionPublic {
  id: string; // UUID
  config_id: string; // UUID
  version: number; // starts at 1, auto-increments
  config_blob: ConfigBlob;
  commit_message: string | null;
  inserted_at: string;
  updated_at: string;
}

export interface ConfigWithVersion extends ConfigPublic {
  version: ConfigVersionPublic;
}

export interface ConfigVersionItems {
  id: string; // UUID
  config_id: string; // UUID
  version: number;
  commit_message: string | null;
  inserted_at: string;
  updated_at: string;
  // Note: config_blob excluded for list performance
}

// API Response Wrapper
export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
}

// Helper type for list responses
export type ConfigListResponse = APIResponse<ConfigPublic[]>;
export type ConfigResponse = APIResponse<ConfigPublic>;
export type ConfigWithVersionResponse = APIResponse<ConfigWithVersion>;
export type ConfigVersionListResponse = APIResponse<ConfigVersionItems[]>;
export type ConfigVersionResponse = APIResponse<ConfigVersionPublic>;
