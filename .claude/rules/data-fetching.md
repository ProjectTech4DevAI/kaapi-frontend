---
paths:
  - "app/api/**"
  - "app/lib/apiClient.ts"
  - "app/lib/guardrailsClient.ts"
  - "app/lib/configFetchers.ts"
---

# API routes & data fetching (BFF layer)

The app uses a **BFF layer**: Next.js route handlers in `app/api/` proxy to the backend (`BACKEND_URL`, default `http://localhost:8000`). The client never calls the backend directly — it calls `/api/...`.

## Server-side: route handlers (`app/api/.../route.ts`)

Route handlers are **thin proxies**. Use `apiClient(request, endpoint, options)` (or `guardrailsClient` for guardrails). It relays `X-API-KEY` + `Cookie` automatically and returns `{ status, data, headers }`.

```ts
import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const endpoint = `/api/v1/configs${queryString ? `?${queryString}` : ""}`;
    const { status, data } = await apiClient(request, endpoint);
    return NextResponse.json(data, { status });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: null,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { status, data } = await apiClient(request, "/api/v1/configs", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(data, { status });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to forward request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
```

Reference: `app/api/configs/route.ts`, `app/lib/apiClient.ts`, `app/lib/guardrailsClient.ts`.

### Rules

- One `route.ts` per endpoint, exporting named HTTP methods (`GET`, `POST`, ...).
- Always wrap in `try/catch`; on error return `NextResponse.json({...error}, { status: 500 })`. Error message via `error instanceof Error ? error.message : String(error)`.
- Forward backend `status` through (`NextResponse.json(data, { status })`) — don't hardcode 200 or swallow non-2xx.
- Build query strings from `new URL(request.url).searchParams`.
- Endpoint paths preserved verbatim — trailing-slash handling is a contract with the backend; don't drift.
- For guardrails endpoints use `guardrailsClient` (env-token auth) / `guardrailsUserClient` (user-key auth).
- Static/health routes set `export const dynamic = "force-dynamic"` and cache headers as needed.
- Don't log request bodies, tokens, or cookies — `console.error("Proxy error:", error)` is the convention.

## Client-side fetching

- Use `apiFetch<T>(url, apiKey, options)` from `app/lib/apiClient.ts` for browser calls. It handles 401 token refresh, dispatches `AUTH_EXPIRED_EVENT` on refresh failure (AuthContext logs out), and throws with a message from `error` / `message` / `detail` (via the internal `extractErrorMessage`). Raw `fetch("/api/...")` in a component bypasses this and is a bug.
- Overload signatures express empty-body handling: a variant returns `Promise<T | null>` with `{ acceptEmpty: true }`.
- File uploads with progress: `uploadWithProgress<T>(url, apiKey, body, onProgress)` returns `{ promise, abort }`.
- **Error extraction**: follow `extractErrorMessage(body, fallback)` → reads `body.error || body.message || body.detail`. Don't reinvent the parser.

## Fetchers are pure (no React)

Network/data logic lives in plain functions in `app/lib/` (e.g. `app/lib/configFetchers.ts`), **with no hooks or UI state**. Hooks (`app/hooks/`) call these fetchers and own the React state. Keep the boundary clean — it's what keeps both layers under 500 LOC and testable.

```ts
/**
 * API fetch helpers for Config Management.
 * Contains all network logic — no React, no UI state.
 */
export async function fetchAllConfigs(apiKey: string, pageSize?: number): Promise<FetchResult> { ... }
```

## SWR

SWR (2.3.6) is available and used **selectively** where its caching/revalidation helps (cached, revalidated reads — lists, dashboards). Default to native fetch + the fetchers/hooks above; one-shot mutations stay on `apiFetch`.
