import { Credential, ProviderDef } from "@/app/lib/types/credentials";
import { formatDistanceToNow } from "date-fns";
import { clearConfigCache } from "@/app/lib/store/configStore";
import {
  ConfigPublic,
  ConfigVersionPublic,
  ConfigVersionItems,
  Tool,
} from "@/app/lib/types/configs";
import { SavedConfig, ConfigGroup } from "./types/configs";
import { isGpt5Model } from "@/app/lib/models";
import { STORAGE_KEYS } from "@/app/lib/constants";
import { TraceScore } from "@/app/lib/components/evaluations/types";

export function timeAgo(dateStr: string): string {
  const date =
    dateStr.includes("Z") || dateStr.includes("+")
      ? new Date(dateStr)
      : new Date(dateStr + "Z");

  return formatDistanceToNow(date, { addSuffix: true });
}

export function getExistingForProvider(
  provider: ProviderDef,
  creds: Credential[],
): Credential | null {
  return creds.find((c) => c.provider === provider.credentialKey) || null;
}

export const formatRelativeTime = (timestamp: string | number): string => {
  const now = Date.now();

  let date: number;
  if (typeof timestamp === "string") {
    // If timestamp doesn't include timezone info, assume it's UTC
    // and append 'Z' to ensure it's interpreted as UTC
    const utcTimestamp =
      timestamp.endsWith("Z") ||
      timestamp.includes("+") ||
      (timestamp.includes("T") && timestamp.split("T")[1].includes("-"))
        ? timestamp
        : timestamp + "Z";
    date = new Date(utcTimestamp).getTime();
  } else {
    date = timestamp;
  }

  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

/** Clear all app-related localStorage */
export function clearAllStorage() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

export const invalidateConfigCache = (): void => {
  clearConfigCache();
};

/** Reads the first stored API key from localStorage. */
export const getApiKey = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
    if (stored) {
      const keys = JSON.parse(stored);
      return keys.length > 0 ? keys[0].key : null;
    }
  } catch (e) {
    console.error("Failed to get API key:", e);
  }
  return null;
};

/**
 * Flattens a raw API config version into the UI's SavedConfig shape.
 * Converts backend flattened `knowledge_base_ids` / `max_num_results` fields
 * into the `tools` array expected by the frontend.
 */
export const flattenConfigVersion = (
  config: ConfigPublic,
  version: ConfigVersionPublic,
): SavedConfig => {
  const blob = version.config_blob;
  const params = blob.completion.params;

  const tools: Tool[] = params.tools || [];

  if (tools.length === 0 && params.knowledge_base_ids) {
    const kbIds = Array.isArray(params.knowledge_base_ids)
      ? params.knowledge_base_ids
      : [params.knowledge_base_ids];

    kbIds.forEach((kbId: string) => {
      if (kbId) {
        tools.push({
          type: "file_search",
          knowledge_base_ids: [kbId],
          max_num_results: params.max_num_results || 20,
        });
      }
    });
  }

  return {
    id: version.id,
    config_id: config.id,
    name: config.name,
    description: config.description,
    version: version.version,
    timestamp: version.inserted_at,
    instructions: params.instructions || "",
    promptContent: params.instructions || "",
    modelName: params.model || "",
    provider: blob.completion.provider,
    type: blob.completion.type || "text",
    temperature: isGpt5Model(params.model)
      ? params.temperature
      : (params.temperature ?? 0.7),
    vectorStoreIds: tools[0]?.knowledge_base_ids?.[0] || "",
    tools,
    commit_message: version.commit_message,
  };
};

/**
 * Groups a flat array of SavedConfig versions by config_id.
 *
 * @param versionCounts - optional map of config_id → actual total version count from the API
 * @param vItemsMap     - optional lightweight version items per config (from versionItemsCache)
 */
export const groupConfigs = (
  configs: SavedConfig[],
  versionCounts?: Record<string, number>,
  vItemsMap?: Record<string, ConfigVersionItems[]>,
): ConfigGroup[] => {
  const grouped = new Map<string, SavedConfig[]>();

  configs.forEach((config) => {
    const existing = grouped.get(config.config_id) || [];
    existing.push(config);
    grouped.set(config.config_id, existing);
  });

  return Array.from(grouped.entries()).map(([config_id, versions]) => {
    const sortedVersions = versions.sort((a, b) => b.version - a.version);
    const totalVersions = versionCounts?.[config_id] ?? sortedVersions.length;
    return {
      config_id,
      name: sortedVersions[0].name,
      description: sortedVersions[0].description,
      versions: sortedVersions,
      latestVersion: sortedVersions[0],
      totalVersions,
      versionsFullyLoaded: sortedVersions.length >= totalVersions,
      versionItems: vItemsMap?.[config_id] ?? [],
    };
  });
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export const isValidEmail = (email: string): boolean => EMAIL_REGEX.test(email);

export const isValidPassword = (password: string): boolean =>
  password.length >= MIN_PASSWORD_LENGTH;

export const isNonEmpty = (value: string): boolean => value.trim().length > 0;

export const escapeCSVValue = (value: string): string => {
  return value.replace(/"/g, '""').replace(/\n/g, " ");
};

export const sanitizeCSVCell = (
  value: string,
  preventFormulaInjection = false,
): string => {
  let sanitized = escapeCSVValue(value);
  if (preventFormulaInjection && /^[=+\-@]/.test(sanitized)) {
    sanitized = " " + sanitized;
  }
  return `"${sanitized}"`;
};

export const formatScoreValue = (score: TraceScore | undefined) => {
  if (!score) return { value: "N/A", color: "#737373", bg: "transparent" };

  if (score.data_type === "CATEGORICAL") {
    const catValue = String(score.value);
    let color = "#171717";
    let bg = "#fafafa";

    if (catValue === "CORRECT") {
      color = "#15803d";
      bg = "#dcfce7";
    } else if (catValue === "PARTIAL") {
      color = "#92400e";
      bg = "#fef3c7";
    } else if (catValue === "INCORRECT") {
      color = "#dc2626";
      bg = "#fee2e2";
    }

    return { value: catValue, color, bg };
  }

  const numValue = Number(score.value);
  const formattedValue = numValue.toFixed(2);
  let color = "#171717";
  let bg = "transparent";

  if (numValue >= 0.7) {
    color = "#15803d";
    bg = "#dcfce7";
  } else if (numValue >= 0.5) {
    color = "#92400e";
    bg = "#fef3c7";
  } else {
    color = "#dc2626";
    bg = "#fee2e2";
  }

  return { value: formattedValue, color, bg };
};

export const getScoreByName = (
  scores: TraceScore[],
  name: string,
): TraceScore | undefined => {
  if (!scores || !Array.isArray(scores)) return undefined;
  return scores.find((s) => s?.name === name);
};
