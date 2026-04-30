import { NextResponse, type NextRequest } from "next/server";

/** Route protection via `kaapi_role` cookie. Settings requires superuser. */

const PUBLIC_ROUTES = new Set<string>([
  "/",
  "/chat",
  "/invite",
  "/verify",
  "/coming-soon/guardrails",
  "/coming-soon/model-testing",
  "/coming-soon/redteaming",
  "/coming-soon/text-to-speech",
]);

const GUEST_ONLY_ROUTES = new Set<string>(["/keystore"]);

const HOME_ROUTE = "/chat";
const PATHNAME_STARTS_WITH = ["/settings"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get("kaapi_role")?.value;
  const isAuthenticated = role === "superuser" || role === "user";
  const isSuperuser = role === "superuser";

  // Guest-only routes: allowed when unauthenticated, blocked otherwise
  if (GUEST_ONLY_ROUTES.has(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(HOME_ROUTE, request.url));
    }
    return NextResponse.next();
  }

  // Allow public routes for everyone
  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // /settings/* requires superuser
  if (PATHNAME_STARTS_WITH.some((prefix) => pathname.startsWith(prefix))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL(HOME_ROUTE, request.url));
    }
    if (!isSuperuser) {
      return NextResponse.redirect(new URL(HOME_ROUTE, request.url));
    }
    return NextResponse.next();
  }

  // Any other app route requires authentication
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL(HOME_ROUTE, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (/api/*)
     * - _next internals
     * - static files (images, fonts, favicon, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
