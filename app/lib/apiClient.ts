import { NextRequest } from "next/server";
import { AUTH_EXPIRED_EVENT } from "@/app/lib/constants";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

/** Coalesces concurrent refresh calls into a single request. */
let refreshPromise: Promise<boolean> | null = null;

/**
 * Forwards a request to the backend, relaying auth headers (X-API-KEY, Cookie).
 * Returns raw { status, data, headers } so the route handler can relay the response.
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

/** Parse an error body into a readable message string. */
function extractErrorMessage(
  body: Record<string, unknown>,
  fallback: string,
): string {
  const msg =
    (body.error as string) ||
    (body.message as string) ||
    (body.detail as string) ||
    "";
  return msg || fallback;
}

/** Dispatch the auth-expired event (client-side only). */
function dispatchAuthExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
}

/** Attempt a silent token refresh. Returns true if new cookies were set. */
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
 *
 * - Attaches X-API-KEY header and `credentials: "include"` for cookie auth.
 * - On **403 "revoked"**: forces immediate logout (no refresh).
 * - On **401**: tries a silent token refresh, retries once, then logs out.
 * - All other errors are thrown as-is.
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

  const doFetch = () =>
    fetch(url, { ...options, headers: buildHeaders(), credentials: "include" });

  const res = await doFetch();

  // Response OK → return parsed JSON
  if (res.ok) return (await res.json()) as T;

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const message = extractErrorMessage(body, `Request failed: ${res.status}`);

  // 403 with "revoked" → force logout, no refresh attempt
  if (res.status === 403 && message.toLowerCase().includes("revoked")) {
    dispatchAuthExpired();
    throw new Error(message.trim() || "Access revoked. Please log in again.");
  }

  // Non-401 errors → throw immediately
  if (res.status !== 401) {
    throw new Error(message);
  }

  // Auth endpoints (login, register, etc.) — never auto-refresh, just throw
  if (url.startsWith("/api/auth/")) {
    throw new Error(message);
  }

  // 401 → attempt silent token refresh, then retry once
  const refreshed = await tryRefreshToken();

  if (refreshed) {
    const retry = await doFetch();
    if (retry.ok) return (await retry.json()) as T;

    const retryBody = (await retry.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    throw new Error(
      extractErrorMessage(retryBody, `Request failed: ${retry.status}`),
    );
  }

  // Refresh failed → both tokens expired, force logout
  dispatchAuthExpired();
  throw new Error("Session expired. Please log in again.");
}
