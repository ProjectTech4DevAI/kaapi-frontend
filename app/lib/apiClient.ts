import { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * Passthrough proxy helper for Next.js route handlers.
 * Extracts X-API-KEY from the incoming request and forwards it to the backend.
 * Returns raw { status, data } so the route handler can relay the exact HTTP status.
 */
export async function apiClient(
  request: NextRequest | Request,
  endpoint: string,
  options: RequestInit = {},
) {
  const apiKey = request.headers.get("X-API-KEY") || "";
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("X-API-KEY", apiKey);

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 204 No Content has no body
  const data = response.status === 204 ? null : await response.json();

  return { status: response.status, data };
}

/**
 * Client-side fetch helper for Next.js route handlers (/api/*).
 * Attaches the X-API-KEY header and throws on non-OK responses.
 * Use this in "use client" pages instead of raw fetch calls.
 */
export async function apiFetch<T>(
  url: string,
  apiKey: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("X-API-KEY", apiKey);
  const res = await fetch(url, {
    ...options,
    headers,
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      data.error || data.message || `Request failed: ${res.status}`,
    );
  return data as T;
}
