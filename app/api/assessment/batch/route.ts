import { NextRequest } from "next/server";
import {
  proxyErrorResponse,
  proxyJsonResponse,
  withQueryParams,
} from "@/app/api/_routeProxy";

const BATCH_ENDPOINT = "/api/v1/assessments";

/** GET /api/assessment/batch — list assessments, optionally by config + version. */
export async function GET(request: NextRequest) {
  try {
    const queryParams = new URLSearchParams(request.nextUrl.searchParams);
    return await proxyJsonResponse(
      request,
      withQueryParams(BATCH_ENDPOINT, queryParams),
      { method: "GET" },
    );
  } catch (error: unknown) {
    return proxyErrorResponse("Assessment batch list proxy error:", error);
  }
}

/** POST /api/assessment/batch — submit a batch assessment run. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await proxyJsonResponse(request, BATCH_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error: unknown) {
    return proxyErrorResponse("Assessment batch create proxy error:", error);
  }
}
