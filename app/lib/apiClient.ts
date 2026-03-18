import { NextRequest } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

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

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  // 204 No Content has no body
  const data = response.status === 204 ? null : await response.json();

  return { status: response.status, data };
}
