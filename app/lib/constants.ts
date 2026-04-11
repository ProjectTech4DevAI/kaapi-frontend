/**
 * Constants for Management
 */

import { ConfigBlob } from "@/app/lib/types/promptEditor";

export const APP_NAME = "Kaapi Konsole";

export const STORAGE_KEYS = {
  API_KEYS: "kaapi_api_keys",
  SESSION: "kaapi_session",
  CONFIGS_CACHE: "kaapi_configs_cache",
  COLLECTION_CACHE: "collection_job_cache",
  DOCUMENT_SIZES: "document_file_sizes",
  SIDEBAR_MENUS: "sidebar-expanded-menus",
} as const;

/** localStorage key for the config cache */
export const CACHE_KEY = STORAGE_KEYS.CONFIGS_CACHE;

/** Cache is considered stale after 5 minutes */
export const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

export const DEFAULT_PAGE_LIMIT = 10;

export const ACCEPTED_DOCUMENT_TYPES =
  ".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp";

/** Maximum document upload size in bytes (25 MB) */
export const MAX_DOCUMENT_SIZE_MB = 25;
export const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;

/** Custom event dispatched when background validation invalidates the in-memory cache */
export const CACHE_INVALIDATED_EVENT = "kaapi:config-cache-invalidated";

/** Dispatched when the user's session is no longer valid (expired or revoked). */
export const AUTH_EXPIRED_EVENT = "kaapi:auth-expired";

export const PROVIDES_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
];

export const PROVIDER_TYPES = [
  { value: "text", label: "Text Completion" },
  { value: "stt", label: "Speech-to-Text (Coming Soon)" },
  { value: "tts", label: "Text-to-Speech (Coming Soon)" },
];

export const MODEL_OPTIONS = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  // anthropic: [
  //   { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  //   { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
  //   { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
  //   { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  // ],
  // google: [
  //   { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  //   { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  //   { value: 'gemini-pro', label: 'Gemini Pro' },
  // ],
};

export const DEFAULT_CONFIG: ConfigBlob = {
  completion: {
    provider: "openai",
    type: "text",
    params: {
      model: "gpt-4o-mini",
      instructions: "",
      temperature: 0.7,
      tools: [],
    },
  },
};
