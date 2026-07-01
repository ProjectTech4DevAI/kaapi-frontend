import { ConfigBlob } from "@/app/lib/types/promptEditor";
import { ToastType } from "@/app/components/ui";
import { ASSESSMENT_FEATURE_FLAG } from "@/app/lib/assessment/constants";
import {
  AnalyticsGroupBy,
  AnalyticsMetric,
  AnalyticsModality,
} from "@/app/lib/types/analytics";

export const APP_NAME = "Kaapi Konsole";

export const FeatureFlag = {
  ASSESSMENT: ASSESSMENT_FEATURE_FLAG,
} as const;

export type FeatureFlagKey = (typeof FeatureFlag)[keyof typeof FeatureFlag];

export const STORAGE_KEYS = {
  API_KEYS: "kaapi_api_keys",
  SESSION: "kaapi_session",
  CONFIGS_CACHE: "kaapi_configs_cache",
  COLLECTION_CACHE: "collection_job_cache",
  DOCUMENT_SIZES: "document_file_sizes",
  SIDEBAR_MENUS: "sidebar-expanded-menus",
  CHAT_STATE: "kaapi_chat_state",
} as const;

export const COOKIE_KEYS = {
  ROLE: "kaapi_role",
  FEATURES: "kaapi_features",
} as const;

/** localStorage key for the config cache */
export const CACHE_KEY = STORAGE_KEYS.CONFIGS_CACHE;

/** Cache is considered stale after 5 minutes */
export const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

export const DEFAULT_PAGE_LIMIT = 10;

export const MAX_NAME_LENGTH = 64;

export const ACCEPTED_DOCUMENT_TYPES =
  ".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp";

/** Maximum document upload size in bytes (25 MB) */
export const MAX_DOCUMENT_SIZE_MB = 25;
export const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024;

/** Maximum number of documents that can be selected for one upload batch */
export const MAX_DOCUMENT_UPLOAD_BATCH = 5;

/** Backend-enforced limits on collection fields */
export const COLLECTION_NAME_MAX = 255;
export const COLLECTION_DESCRIPTION_MAX = 2000;

/** Custom event dispatched when background validation invalidates the in-memory cache */
export const CACHE_INVALIDATED_EVENT = "kaapi:config-cache-invalidated";

/** Dispatched when the user's session is no longer valid (expired or revoked). */
export const AUTH_EXPIRED_EVENT = "kaapi:auth-expired";
/** Dispatched when client-side feature flags are updated. */
export const FEATURES_UPDATED_EVENT = "kaapi:features-updated";

export const PROVIDES_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google" },
];

export const ANALYTICS_METRIC_OPTIONS: {
  value: AnalyticsMetric;
  label: string;
}[] = [
  { value: "cost_all", label: "Cost (USD)" },
  { value: "volume", label: "Volume" },
];

export const ANALYTICS_GROUP_BY_OPTIONS: {
  value: AnalyticsGroupBy;
  label: string;
}[] = [
  { value: "total", label: "Total (no breakdown)" },
  { value: "provider", label: "Provider" },
  { value: "modality", label: "Request type" },
  { value: "modality_provider", label: "Request type + Provider" },
];

export const ANALYTICS_MODALITY_OPTIONS: {
  value: AnalyticsModality;
  label: string;
}[] = [
  { value: "T-FS-T", label: "Text → Text" },
  { value: "S-FS-S", label: "Speech → Speech" },
  { value: "STT", label: "Speech → Text" },
  { value: "TTS", label: "Text → Speech" },
  { value: "OTHER", label: "Other" },
];

export const MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function getRecentYearOptions(
  count = 2,
): { value: string; label: string }[] {
  const now = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => {
    const y = String(now - i);
    return { value: y, label: y };
  });
}

export const PROVIDER_TYPES = [
  {
    value: "text",
    label: "Text Completion",
    description: "Standard text-based LLM completion",
  },
  {
    value: "stt",
    label: "Speech-to-Text",
    description: "Transcribe audio input into text",
  },
  {
    value: "tts",
    label: "Text-to-Speech",
    description: "Synthesise audio from a text prompt",
  },
];

export const MODEL_OPTIONS = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  google: [{ value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" }],
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

export const TOAST_CONFIG: Record<
  ToastType,
  {
    accent: string;
    bg: string;
    icon: string;
    progressBg: string;
  }
> = {
  success: {
    accent: "#07bc0c",
    bg: "#ffffff",
    icon: "#07bc0c",
    progressBg: "#07bc0c",
  },
  error: {
    accent: "#e74c3c",
    bg: "#ffffff",
    icon: "#e74c3c",
    progressBg: "#e74c3c",
  },
  warning: {
    accent: "#f1c40f",
    bg: "#ffffff",
    icon: "#f1c40f",
    progressBg: "#f1c40f",
  },
  info: {
    accent: "#3498db",
    bg: "#ffffff",
    icon: "#3498db",
    progressBg: "#3498db",
  },
};

export const STATUS_TABS = [
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];
