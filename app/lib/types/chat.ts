/**
 * Types for the Chat feature.
 */

import { ConfigBlob } from "@/app/lib/types/configs";

export type ChatRole = "user" | "assistant";

export type ChatMessageStatus = "pending" | "complete" | "error";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  status?: ChatMessageStatus;
  jobId?: string;
  error?: string;
}

export interface ChatConfigSelection {
  configId: string;
  version: number;
}

export type LLMCallConfigSelector =
  | { id: string; version: number }
  | { blob: ConfigBlob };

export interface LLMCallRequest {
  query: {
    input: string;
    conversation?: {
      id?: string;
      auto_create?: boolean;
    };
  };
  config: LLMCallConfigSelector;
  callback_url?: string;
  include_provider_raw_response?: boolean;
  request_metadata?: Record<string, unknown>;
}

export interface LLMCallJobData {
  job_id: string;
  status: string;
  message?: string;
  job_inserted_at?: string;
  job_updated_at?: string;
}

export interface LLMResponseUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  reasoning_tokens?: number;
}

export interface LLMResponseBody {
  provider_response_id?: string;
  conversation_id?: string;
  provider?: string;
  model?: string;
  output?: unknown;
}

export interface LLMResponse {
  response?: LLMResponseBody;
  usage?: LLMResponseUsage;
  provider_raw_response?: Record<string, unknown>;
}

export interface LLMCallStatusData {
  job_id: string;
  status: string;
  llm_response?: LLMResponse | null;
  error_message?: string | null;
}

export interface APIEnvelope<T> {
  success: boolean;
  data: T | null;
  error?: string | null;
  errors?: Array<{ field?: string; message?: string }>;
  metadata?: Record<string, unknown> | null;
}

export type LLMCallCreateResponse = APIEnvelope<LLMCallJobData>;
export type LLMCallStatusResponse = APIEnvelope<LLMCallStatusData>;
