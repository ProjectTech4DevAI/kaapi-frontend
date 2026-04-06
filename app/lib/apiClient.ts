import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
export type UploadPhase = "uploading" | "processing" | "done";

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
  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
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
