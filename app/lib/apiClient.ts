import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

/**
 * Passthrough proxy helper for Next.js route handlers.
 * Extracts X-API-KEY and cookies from the incoming request and forwards them to the backend.
 * Returns raw { status, data, headers } so the route handler can relay the exact HTTP status.
 */
export async function apiClient(
  request: NextRequest | Request,
  endpoint: string,
  options: RequestInit = {},
) {
  const apiKey = request.headers.get("X-API-KEY") || "";
  const cookie = request.headers.get("Cookie") || "";
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-API-KEY", apiKey);
  if (cookie) headers.set("Cookie", cookie);

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const text = response.status === 204 ? "" : await response.text();
  const data = text ? JSON.parse(text) : null;

  return { status: response.status, data, headers: response.headers };
}

/**
 * Dispatched when both the access token AND refresh token are expired /
 * invalid.  AuthContext listens for this and triggers logout.
 */
export const AUTH_EXPIRED_EVENT = "kaapi:auth-expired";

/**
 * Singleton refresh promise so concurrent 401s don't fire multiple
 * refresh requests — they all await the same in-flight call.
 */
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * Client-side fetch helper for Next.js route handlers (/api/*).
 * Attaches the X-API-KEY header and includes credentials for cookie-based auth.
 *
 * On a 401 response it automatically attempts a token refresh via
 * `/api/auth/refresh`.  If the refresh succeeds the original request is
 * retried once.  If the refresh also fails, a `kaapi:auth-expired` event
 * is dispatched so AuthContext can trigger logout.
 */
export async function apiFetch<T>(
  url: string,
  apiKey: string,
  options: RequestInit = {},
): Promise<T> {
  const buildHeaders = () => {
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("X-API-KEY", apiKey);
    return headers;
  };

  const res = await fetch(url, {
    ...options,
    headers: buildHeaders(),
    credentials: "include",
  });

  // Happy path
  if (res.ok) return (await res.json()) as T;

  // 403 "access revoked" — force logout immediately, no refresh attempt
  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    const msg =
      (data as Record<string, string>).error ||
      (data as Record<string, string>).message ||
      "";
    if (msg.toLowerCase().includes("access revoked")) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
      }
      throw new Error(msg || "Access revoked. Please log in again.");
    }
    throw new Error(msg || `Request failed: ${res.status}`);
  }

  // Not a 401 — throw immediately
  if (res.status !== 401) {
    const data = await res.json();
    throw new Error(
      data.error || data.message || `Request failed: ${res.status}`,
    );
  }

  // 401 — attempt a silent token refresh
  const refreshed = await tryRefreshToken();

  if (refreshed) {
    const retry = await fetch(url, {
      ...options,
      headers: buildHeaders(),
      credentials: "include",
    });
    const retryData = await retry.json();
    if (retry.ok) return retryData as T;

    throw new Error(
      retryData.error || retryData.message || `Request failed: ${retry.status}`,
    );
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
  const data = await res.json().catch(() => ({}));
  throw new Error(
    (data as Record<string, string>).error ||
      (data as Record<string, string>).message ||
      "Session expired. Please log in again.",
  );
}
