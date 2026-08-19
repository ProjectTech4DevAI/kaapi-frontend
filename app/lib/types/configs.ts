import type { AssessmentTag } from "@/app/lib/types/assessment";

export type ProviderType =
  | "openai"
  | "google"
  | "google-aistudio"
  | "anthropic";

export interface SavedConfig {
  id: string;
  config_id: string;
  name: string;
  description?: string | null;
  version: number;
  timestamp: string;
  instructions: string;
  promptContent: string;
  modelName: string;
  provider: string;
  type: "text" | "stt" | "tts";
  modelParams?: Record<string, unknown>;
  vectorStoreIds: string;
  tools?: Tool[];
  commit_message?: string | null;
  input_guardrails?: GuardrailRef[];
  output_guardrails?: GuardrailRef[];
}

export interface ConfigGroup {
  config_id: string;
  name: string;
  description?: string | null;
  versions: SavedConfig[]; // fully-loaded entries (have config_blob)
  latestVersion: SavedConfig;
  totalVersions: number;
  versionsFullyLoaded: boolean;
  versionItems: ConfigVersionItems[];
}

export interface ConfigCache {
  configs: SavedConfig[];
  configMeta: Record<string, { updated_at: string; version_count: number }>;
  cachedAt: number;
  versionCounts: Record<string, number>;
  totalConfigCount?: number;
  partialFetch?: boolean;
  allConfigMeta?: ConfigPublic[];
}

export interface FetchResult {
  configs: SavedConfig[];
  configMeta: Record<string, { updated_at: string; version_count: number }>;
  versionCounts: Record<string, number>;
  totalConfigCount: number;
  partialFetch: boolean;
}

export interface Tool {
  type: "file_search";
  knowledge_base_ids: string[];
  max_num_results: number;
}

export interface CompletionParams {
  model: string;
  instructions: string;
  tools?: Tool[];
  knowledge_base_ids?: string[];
  max_num_results?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface CompletionConfig {
  provider: ProviderType;
  type?: "text" | "stt" | "tts";
  params: CompletionParams;
}

export interface GuardrailRef {
  validator_config_id: string;
}

export interface ConfigBlob {
  completion: CompletionConfig;
  prompt_template?: {
    template: string;
  };
  input_guardrails?: GuardrailRef[];
  output_guardrails?: GuardrailRef[];
}

export type AssessmentColumnType = "text" | "image" | "pdf";

export interface AssessmentInputSchemaColumn {
  type: AssessmentColumnType;
  format?: "url";
  // Whether the column must be present in every submission row (default false).
  strict?: boolean;
}

export interface AssessmentParams {
  model: string;
  instructions: string;
  input_schema: Record<string, AssessmentInputSchemaColumn>;
  json_output_schema?: object | null;
  // Submission template with {column} placeholders (the run's input.query).
  // Sent for forward compatibility — the backend does not persist it yet, so
  // it is mirrored to localStorage per saved version (see assessmentTemplate).
  query_template?: string;
  [key: string]: unknown;
}

export interface AssessmentModelBlock {
  provider: ProviderType;
  type: "text";
  params: AssessmentParams;
}

export interface AssessmentPreFilterParams {
  model?: string;
  instructions: string;
  [key: string]: unknown;
}

export interface AssessmentPreFilter {
  provider: ProviderType;
  params: AssessmentPreFilterParams;
  stop_on_fail: boolean;
  knowledge_base_id?: string;
  // Per-row Submission text; sent for forward compatibility (the backend
  // ignores unknown top-level keys today — it must NOT go in params, which
  // reject unknown keys). Also embedded into instructions (see
  // PREFILTER_SUBMISSION_MARKER) so the model receives it now.
  query_template?: string;
}

export interface AssessmentPreFilters {
  topic_relevance?: AssessmentPreFilter;
  duplicate_detection?: AssessmentPreFilter;
}

export interface AssessmentConfigBlob {
  pre_filters?: AssessmentPreFilters;
  assessment: AssessmentModelBlock;
}

export interface ConfigCreate {
  name: string;
  description?: string | null;
  config_blob: ConfigBlob | AssessmentConfigBlob;
  commit_message?: string | null;
  tag?: ConfigTag | null;
}

export interface ConfigUpdate {
  name?: string | null; // 1-128 chars
  description?: string | null;
  tag?: ConfigTag | null;
}

export interface ConfigVersionCreate {
  config_blob: ConfigBlob | AssessmentConfigBlob;
  commit_message?: string | null;
}

export interface ConfigPublic {
  id: string;
  name: string;
  description: string | null;
  tag?: ConfigTag | null;
  project_id: number;
  inserted_at: string;
  updated_at: string;
}

export interface ConfigVersionPublic {
  id: string;
  config_id: string;
  version: number;
  config_blob: ConfigBlob;
  commit_message: string | null;
  inserted_at: string;
  updated_at: string;
}

export interface ConfigWithVersion extends ConfigPublic {
  version: ConfigVersionPublic;
}

export interface ConfigVersionItems {
  id: string;
  config_id: string;
  version: number;
  commit_message: string | null;
  inserted_at: string;
  updated_at: string;
}

export interface ConfigVersionInfo {
  name: string;
  version: number;
  model?: string;
  instructions?: string;
  modelParams?: Record<string, unknown>;
  tools?: Tool[];
  provider?: string;
  type?: "text" | "stt" | "tts";
  knowledge_base_ids?: string[];
}

export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type ConfigListResponse = APIResponse<ConfigPublic[]>;
export type ConfigResponse = APIResponse<ConfigPublic>;
export type ConfigWithVersionResponse = APIResponse<ConfigWithVersion>;
export type ConfigVersionListResponse = APIResponse<ConfigVersionItems[]>;
export type ConfigVersionResponse = APIResponse<ConfigVersionPublic>;
export type ConfigTag = AssessmentTag;
