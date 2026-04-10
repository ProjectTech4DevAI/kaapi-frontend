import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://0.0.0.0:8000";
const GUARDRAILS_URL = process.env.GUARDRAILS_URL || "http://localhost:8001";

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
  // Don't set Content-Type for FormData — the browser sets it with the boundary
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("X-API-KEY", apiKey);

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 204 No Content has no body
  const text = response.status === 204 ? "" : await response.text();
  const data = text ? JSON.parse(text) : null;

  return { status: response.status, data };
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
 * Attaches the X-API-KEY header and throws on non-OK responses.
 * Use this in "use client" pages instead of raw fetch calls.
 */
export async function apiFetch<T>(
  url: string,
  apiKey: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
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
