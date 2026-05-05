import {
  ConfigCache,
  SavedConfig,
  ConfigPublic,
  ConfigVersionItems,
} from "@/app/lib/types/configs";
import { CACHE_KEY } from "@/app/lib/constants";

export const configState = {
  inMemoryCache: null as ConfigCache | null,

  versionItemsCache: {} as Record<string, ConfigVersionItems[]>,

  allConfigMeta: null as ConfigPublic[] | null,

  pendingLoadMore: null as Promise<void> | null,

  pendingFetch: null as Promise<void> | null,

  validationInProgress: false,
};

export const pendingSingleVersionLoads = new Map<
  string,
  Promise<SavedConfig | null>
>();

export const pendingVersionLoads = new Map<string, Promise<void>>();

export const loadCache = (): ConfigCache | null => {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.error("Failed to load config cache:", e);
  }
  return null;
};

export const saveCache = (cache: ConfigCache): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error("Failed to save config cache:", e);
  }
};

export const clearConfigCache = (): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CACHE_KEY);
    configState.inMemoryCache = null;
    configState.versionItemsCache = {};
  } catch (e) {
    console.error("Failed to clear config cache:", e);
  }
};
