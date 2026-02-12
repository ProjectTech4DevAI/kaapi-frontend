/**
 * TypeScript types for Config Management API
 * Based on CONFIG_MGMT.md specification
 */

// Config Blob Structure
export interface Tool {
  type: 'file_search';
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
  [key: string]: any; // Allow additional provider-specific params
}

export interface CompletionConfig {
  provider: 'openai'; // | 'anthropic' | 'google'; // Only OpenAI supported for now
  type?: 'text' | 'stt' | 'tts'; // Config type - optional for backward compatibility
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
  metadata?: Record<string, any> | null;
}

// Helper type for list responses
export type ConfigListResponse = APIResponse<ConfigPublic[]>;
export type ConfigResponse = APIResponse<ConfigPublic>;
export type ConfigWithVersionResponse = APIResponse<ConfigWithVersion>;
export type ConfigVersionListResponse = APIResponse<ConfigVersionItems[]>;
export type ConfigVersionResponse = APIResponse<ConfigVersionPublic>;
