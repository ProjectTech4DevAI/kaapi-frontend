import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

const DOWNLOAD_CONTENT_TYPE_HINTS = [
  "text/csv",
  "spreadsheetml",
  "octet-stream",
  "application/zip",
];

export function isDownloadContentType(contentType: string): boolean {
  return DOWNLOAD_CONTENT_TYPE_HINTS.some((hint) => contentType.includes(hint));
}

export function withQueryParams(
  endpoint: string,
  queryParams: URLSearchParams,
): string {
  const query = queryParams.toString();
  return query ? `${endpoint}?${query}` : endpoint;
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

export async function proxyJsonResponse(
  request: NextRequest,
  endpoint: string,
  init: RequestInit = {},
): Promise<NextResponse> {
  const { status, data } = await apiClient(request, endpoint, init);
  return NextResponse.json(data, { status });
}

export async function proxyDownloadOrJsonResponse(
  request: NextRequest,
  endpoint: string,
  init: RequestInit = {},
): Promise<NextResponse> {
  const response = await apiClient(request, endpoint, {
    ...init,
    responseType: "raw",
  });

  const downloadResponse = await toDownloadResponse(response);
  if (downloadResponse) {
    return downloadResponse;
  }

  const data = await safeParseJson(response);
  return NextResponse.json(data, { status: response.status });
}

export function proxyErrorResponse(
  logLabel: string,
  error: unknown,
  message = "Failed to forward request to backend",
): NextResponse {
  console.error(logLabel, error);
  return NextResponse.json({ error: message }, { status: 500 });
}
