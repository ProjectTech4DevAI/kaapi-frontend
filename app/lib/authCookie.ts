import type { NextResponse } from "next/server";
import { COOKIE_KEYS, type FeatureFlagKey } from "@/app/lib/constants";

interface UserLike {
  is_superuser?: boolean;
  features?: FeatureFlagKey[];
}

/** Set the role cookie by appending a raw Set-Cookie header (won't overwrite existing cookies). */
export function setRoleCookieFromBody(
  response: NextResponse,
  body: unknown,
): void {
  if (!body || typeof body !== "object") return;

  const user = extractUser(body);
  if (!user) return;

  const value = user.is_superuser ? "superuser" : "user";
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookie = `${COOKIE_KEYS.ROLE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`;

  response.headers.append("Set-Cookie", cookie);
}

export function clearRoleCookie(response: NextResponse): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookie = `${COOKIE_KEYS.ROLE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;

  response.headers.append("Set-Cookie", cookie);
}

export function setFeaturesCookieFromBody(
  response: NextResponse,
  body: unknown,
): void {
  if (!body || typeof body !== "object") return;

  const user = extractUser(body);
  if (!user || !Array.isArray(user.features)) return;

  const features = user.features.filter((f) => typeof f === "string");
  const value = encodeURIComponent(JSON.stringify(features));
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookie = `${COOKIE_KEYS.FEATURES}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`;

  response.headers.append("Set-Cookie", cookie);
}

export function clearFeaturesCookie(response: NextResponse): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookie = `${COOKIE_KEYS.FEATURES}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;

  response.headers.append("Set-Cookie", cookie);
}

function extractUser(body: unknown): UserLike | null {
  if (!body || typeof body !== "object") return null;
  const outer = body as Record<string, unknown>;

  if (outer.data && typeof outer.data === "object") {
    const data = outer.data as Record<string, unknown>;
    if (data.user && typeof data.user === "object") {
      return data.user as UserLike;
    }
    if ("is_superuser" in data) return data as UserLike;
  }

  if ("is_superuser" in outer) return outer as UserLike;

  return null;
}
