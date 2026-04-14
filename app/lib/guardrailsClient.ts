import { NextRequest } from "next/server";

const GUARDRAILS_URL = process.env.GUARDRAILS_URL || "http://localhost:8001";

export function getAuthHeader(): string | undefined {
  const token = process.env.GUARDRAILS_TOKEN;
  return token ? `Bearer ${token}` : undefined;
}

/**
 * Server-side passthrough proxy to the Guardrails backend.
 * Used by Next.js route handlers (/api/guardrails/*).
 * Forwards the Cookie from the incoming request (contains org/project context).
 * Pass `authHeader` to override auth (e.g. "Bearer <token>" from env).
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
    const cookie = request.headers.get("Cookie") || "";
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

  const res = await fetch(path, { ...options, headers });

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
