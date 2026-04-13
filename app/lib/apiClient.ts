import { NextRequest } from "next/server";
import { AUTH_EXPIRED_EVENT } from "@/app/lib/constants";

const BACKEND_URL = process.env.BACKEND_URL || "http://0.0.0.0:8000";
const GUARDRAILS_URL = process.env.GUARDRAILS_URL || "http://localhost:8001";
export type UploadPhase = "uploading" | "processing" | "done";

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
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
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
      const res = await fetch("/api/v1/auth/refresh", {
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
 * Upload a file with real-time progress tracking.
 *
 * Works with a streaming proxy endpoint that sends newline-delimited JSON:
 *   { phase: "uploading", progress: 42 }   — bytes consumed by backend
 *   { phase: "processing" }                 — backend is processing the file
 *   { done: true, status, data }            — final response
 *   { error: "message" }                    — failure
 *
 * Returns `{ promise, abort }` so callers can cancel in-flight uploads.
 */
export function uploadWithProgress<T>(
  url: string,
  apiKey: string,
  body: FormData,
  onProgress: (percent: number, phase: UploadPhase) => void,
): { promise: Promise<T>; abort: () => void } {
  const controller = new AbortController();

  const promise = (async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "X-API-KEY": apiKey },
      body,
      signal: controller.signal,
    });

    if (!res.body) throw new Error("No response stream");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: T | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);

        if (event.error) {
          throw new Error(event.error);
        }
        if (event.phase === "uploading" && event.progress !== undefined) {
          onProgress(event.progress, "uploading");
        }
        if (event.phase === "processing") {
          onProgress(100, "processing");
        }
        if (event.done) {
          onProgress(100, "done");
          if (event.status >= 400) {
            const msg =
              event.data?.error ||
              event.data?.message ||
              event.data?.detail ||
              `Upload failed: ${event.status}`;
            throw new Error(msg);
          }
          result = event.data as T;
        }
      }
    }

    if (!result) throw new Error("No response received from server");
    return result;
  })();

  return { promise, abort: () => controller.abort() };
}

/**
 * Passthrough proxy helper for the Guardrails backend.
 * By default uses X-API-KEY from the incoming request.
 * Pass `authHeader` to override (e.g. "Bearer <token>" for env-based auth).
 */
export async function guardrailsClient(
  request: NextRequest | Request,
  endpoint: string,
  options: RequestInit & { authHeader?: string } = {},
) {
  const { authHeader, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  if (!(fetchOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (authHeader) {
    headers.set("Authorization", authHeader);
  } else {
    headers.set("X-API-KEY", request.headers.get("X-API-KEY") || "");
  }

  const response = await fetch(`${GUARDRAILS_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  const text = response.status === 204 ? "" : await response.text();
  const data = text ? JSON.parse(text) : null;

  return { status: response.status, data };
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
