import { NextRequest } from "next/server";

const GUARDRAILS_URL = process.env.GUARDRAILS_URL || "http://localhost:8001";

/**
 * Server-side passthrough proxy to the Guardrails backend.
 * Used by Next.js route handlers (/api/guardrails/*).
 * Auth priority: GUARDRAILS_TOKEN env var → X-API-KEY + Cookie from request.
 */
export async function guardrailsClient(
  request: NextRequest | Request,
  endpoint: string,
  options: RequestInit & { skipEnvToken?: boolean } = {},
) {
  const { skipEnvToken, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);
  if (!(fetchOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = !skipEnvToken && process.env.GUARDRAILS_TOKEN;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    const apiKey = request.headers.get("X-API-KEY") || "";
    const cookie = request.headers.get("Cookie") || "";
    if (apiKey) headers.set("X-API-KEY", apiKey);
    if (cookie) headers.set("Cookie", cookie);
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
 * Client-side fetch helper for guardrails Next.js route handlers (/api/guardrails/*).
 * Parses JSON and throws on non-OK responses.
 */
export async function guardrailsFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    if (options.body) headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    throw new Error((body?.error as string) ?? `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}
