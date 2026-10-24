import "server-only";

import type { NextRequest } from "next/server";
import { readWebhookSecret } from "@/app/lib/webhookSecret";

function getAppBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const protocol = request.headers.get("x-forwarded-proto") ?? "https";
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  return `${protocol}://${host}`;
}

export function buildWebhookCallbackUrl(
  request: NextRequest,
  path: string,
): string {
  const secretResult = readWebhookSecret();
  if (!secretResult.ok || !secretResult.secret) {
    throw new Error(secretResult.reason ?? "webhook_secret_missing");
  }
  const base = getAppBaseUrl(request);
  return `${base}${path}?secret_value=${encodeURIComponent(secretResult.secret)}`;
}

export function isWebhookAuthorized(request: NextRequest): boolean {
  const secretResult = readWebhookSecret();
  if (!secretResult.ok || !secretResult.secret) return false;
  const provided = request.nextUrl.searchParams.get("secret_value");
  return provided === secretResult.secret;
}
