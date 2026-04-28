import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const DOWNLOAD_CONTENT_TYPE_HINTS = [
  "text/csv",
  "spreadsheetml",
  "octet-stream",
  "application/zip",
];

export function isDownloadContentType(contentType: string): boolean {
  return DOWNLOAD_CONTENT_TYPE_HINTS.some((hint) => contentType.includes(hint));
}

function buildAssessmentAuthHeaders(
  request: NextRequest | Request,
  headers: Headers = new Headers(),
): Headers {
  const apiKey = request.headers.get("X-API-KEY") || "";
  const cookie = request.headers.get("Cookie") || "";

  if (apiKey) {
    headers.set("X-API-KEY", apiKey);
  }
  if (cookie) {
    headers.set("Cookie", cookie);
  }

  return headers;
}

export async function assessmentApiFetch(
  request: NextRequest | Request,
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = buildAssessmentAuthHeaders(
    request,
    new Headers(options.headers),
  );
  if (
    options.body !== undefined &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });
}

export async function safeParseJson(
  response: Response,
): Promise<Record<string, unknown> | unknown[] | null> {
  const text = response.status === 204 ? "" : await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown> | unknown[];
  } catch {
    return null;
  }
}

export async function toDownloadResponse(
  response: Response,
): Promise<NextResponse | null> {
  const contentType = response.headers.get("content-type") || "";
  if (!isDownloadContentType(contentType)) {
    return null;
  }

  const blob = await response.blob();
  const headers = new Headers();
  headers.set("Content-Type", contentType);

  const disposition = response.headers.get("content-disposition");
  if (disposition) {
    headers.set("Content-Disposition", disposition);
  }

  return new NextResponse(blob, { status: response.status, headers });
}
