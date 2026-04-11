import { NextResponse } from "next/server";

/**
 * Shared name for the non-httpOnly role cookie that middleware uses
 * to gate routes. Values: "superuser" | "user". Absence = unauthenticated.
 */
export const ROLE_COOKIE = "kaapi_role";

interface UserLike {
  is_superuser?: boolean;
}

/**
 * Parse the backend response body and set the role cookie if a user is present.
 * Accepts both `{ data: { user } }` and `{ user }` shapes used across the auth
 * endpoints so callers don't need to reshape.
 */
export function setRoleCookieFromBody(
  response: NextResponse,
  body: unknown,
): void {
  if (!body || typeof body !== "object") return;

  const user = extractUser(body);
  if (!user) return;

  response.cookies.set(ROLE_COOKIE, user.is_superuser ? "superuser" : "user", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearRoleCookie(response: NextResponse): void {
  response.cookies.set(ROLE_COOKIE, "", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

function extractUser(body: unknown): UserLike | null {
  if (!body || typeof body !== "object") return null;
  const outer = body as Record<string, unknown>;

  // Shape: { data: { user: {...} } }
  if (outer.data && typeof outer.data === "object") {
    const data = outer.data as Record<string, unknown>;
    if (data.user && typeof data.user === "object") {
      return data.user as UserLike;
    }
    // Shape: { data: {...user fields...} } (e.g. /users/me)
    if ("is_superuser" in data) return data as UserLike;
  }

  // Shape: {...user fields...}
  if ("is_superuser" in outer) return outer as UserLike;

  return null;
}
