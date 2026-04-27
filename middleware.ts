import { NextResponse, type NextRequest } from "next/server";
import {
  FeatureFlag,
  type FeatureFlagKey,
} from "@/app/lib/constants/featureFlags";

const PUBLIC_ROUTES = new Set<string>([
  "/evaluations",
  "/invite",
  "/verify",
  "/coming-soon/guardrails",
  "/coming-soon/model-testing",
  "/coming-soon/redteaming",
  "/coming-soon/text-to-speech",
]);

const FEATURE_GATED_PREFIXES: Array<{
  prefix: string;
  flag: FeatureFlagKey;
}> = [{ prefix: "/assessment", flag: FeatureFlag.ASSESSMENT }];

const GUEST_ONLY_ROUTES = new Set<string>(["/keystore"]);

const HOME_ROUTE = "/evaluations";
const PATHNAME_STARTS_WITH = ["/settings"];
const FEATURES_COOKIE = "kaapi_features";

function parseFeatures(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((f): f is string => typeof f === "string"));
    }
  } catch {
    /* ignore malformed cookie */
  }
  return new Set();
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get("kaapi_role")?.value;
  const features = parseFeatures(request.cookies.get(FEATURES_COOKIE)?.value);
  const isAuthenticated = role === "superuser" || role === "user";
  const isSuperuser = role === "superuser";

  if (GUEST_ONLY_ROUTES.has(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(HOME_ROUTE, request.url));
    }
    return NextResponse.next();
  }

  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  if (PATHNAME_STARTS_WITH.some((prefix) => pathname.startsWith(prefix))) {
    if (!isAuthenticated || !isSuperuser) {
      return NextResponse.redirect(new URL(HOME_ROUTE, request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL(HOME_ROUTE, request.url));
  }

  const gated = FEATURE_GATED_PREFIXES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (gated && !features.has(gated.flag)) {
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
