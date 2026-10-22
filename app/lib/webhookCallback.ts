import "server-only";

import type { NextRequest } from "next/server";
import { readWebhookSecret } from "@/app/lib/webhookSecret";

/**
 * Builds the public HTTPS URL the backend should POST async results to.
 * The shared secret rides along as `secret_value` so the receiving route
 * can reject forged deliveries.
 */
export function buildWebhookCallbackUrl(
  request: NextRequest,
  path: string,
): string {
  const secretResult = readWebhookSecret();
  if (!secretResult.ok || !secretResult.secret) {
    throw new Error(secretResult.reason ?? "webhook_secret_missing");
  }
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? null;
  const base = configured
    ? configured.replace(/\/$/, "")
    : `${request.headers.get("x-forwarded-proto") ?? "https"}://${
        request.headers.get("x-forwarded-host") ??
        request.headers.get("host") ??
        request.nextUrl.host
      }`;
  return `${base}${path}?secret_value=${encodeURIComponent(secretResult.secret)}`;
}

/** True when the incoming webhook carries our shared secret. */
export function isWebhookAuthorized(request: NextRequest): boolean {
  const secretResult = readWebhookSecret();
  if (!secretResult.ok || !secretResult.secret) return false;
  const provided = request.nextUrl.searchParams.get("secret_value");
  return provided === secretResult.secret;
}
