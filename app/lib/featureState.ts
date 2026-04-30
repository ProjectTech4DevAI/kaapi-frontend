import { FEATURES_UPDATED_EVENT, STORAGE_KEYS } from "@/app/lib/constants";

const FEATURES_COOKIE = "kaapi_features";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function parseFeatures(raw: string | undefined): string[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (feature): feature is string => typeof feature === "string",
    );
  } catch {
    return null;
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return entry?.slice(prefix.length);
}

function writeFeaturesCookie(features: string[]): void {
  if (typeof document === "undefined") return;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const value = encodeURIComponent(JSON.stringify(features));
  document.cookie = `${FEATURES_COOKIE}=${value}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

function readSessionFeatures(): string[] | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    const features = (parsed as { user?: { features?: unknown } } | null)?.user
      ?.features;
    if (!Array.isArray(features)) return null;
    return features.filter(
      (feature): feature is string => typeof feature === "string",
    );
  } catch {
    return null;
  }
}

function syncSessionFeatures(features: string[]): void {
  if (typeof localStorage === "undefined") return;
  const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.user && typeof parsed.user === "object") {
      parsed.user.features = features;
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(parsed));
    }
  } catch {
    // ignore malformed session payload
  }
}

function broadcastFeatures(features: string[]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(FEATURES_UPDATED_EVENT, {
      detail: { features },
    }),
  );
}

export function removeFeatureFromClient(feature: string): void {
  const currentFeatures =
    parseFeatures(readCookie(FEATURES_COOKIE)) ?? readSessionFeatures();
  if (!currentFeatures) return;

  const nextFeatures = currentFeatures.filter((value) => value !== feature);
  writeFeaturesCookie(nextFeatures);
  syncSessionFeatures(nextFeatures);
  broadcastFeatures(nextFeatures);
}
