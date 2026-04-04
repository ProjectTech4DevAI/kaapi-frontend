import { cookies } from "next/headers";

type FeatureFlags = Record<string, boolean>;

/**
 * Fetch feature flags server-side using the API key from the cookie.
 * Returns resolved flags or empty object if unavailable.
 * Safe to call in any server component — never throws.
 */
export async function getServerFeatureFlags(): Promise<FeatureFlags> {
  try {
    const cookieStore = await cookies();
    const apiKey = cookieStore.get("kaapi_api_key")?.value;
    if (!apiKey) return {};

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const response = await fetch(`${backendUrl}/api/v1/features`, {
      method: "GET",
      headers: { "X-API-KEY": decodeURIComponent(apiKey) },
      cache: "no-store",
    });

    if (!response.ok) return {};
    return (await response.json()) as FeatureFlags;
  } catch {
    return {};
  }
}
