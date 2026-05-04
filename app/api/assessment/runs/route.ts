// BFF proxy for assessment run collection.
// GET  /api/assessment/runs → backend GET  /api/v1/assessment/runs (filterable via query params)
// POST /api/assessment/runs → backend POST /api/v1/assessment/runs (triggers a new run)
import { NextRequest } from "next/server";
import {
  proxyErrorResponse,
  proxyJsonResponse,
  withQueryParams,
} from "@/app/api/_routeProxy";

export async function GET(request: NextRequest) {
  try {
    const queryParams = new URLSearchParams(request.nextUrl.searchParams);
    return await proxyJsonResponse(
      request,
      withQueryParams("/api/v1/assessment/runs", queryParams),
      {
        method: "GET",
      },
    );
  } catch (error: unknown) {
    return proxyErrorResponse("Assessment runs list proxy error:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await proxyJsonResponse(request, "/api/v1/assessment/runs", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error: unknown) {
    return proxyErrorResponse("Assessment runs create proxy error:", error);
  }
}
