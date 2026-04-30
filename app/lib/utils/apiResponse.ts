import "server-only";

import { NextResponse } from "next/server";

const DOWNLOAD_CONTENT_TYPE_HINTS = [
  "text/csv",
  "spreadsheetml",
  "octet-stream",
  "application/zip",
];

export function isDownloadContentType(contentType: string): boolean {
  return DOWNLOAD_CONTENT_TYPE_HINTS.some((hint) => contentType.includes(hint));
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
