import { NextRequest } from "next/server";
import {
  proxyErrorResponse,
  proxyJsonResponse,
  withQueryParams,
} from "@/app/api/assessment/utils";

export async function GET(request: NextRequest) {
  try {
    const queryParams = new URLSearchParams();
    const assessmentId = request.nextUrl.searchParams.get("assessment_id");
    const limit = request.nextUrl.searchParams.get("limit");
    if (assessmentId) {
      queryParams.set("assessment_id", assessmentId);
    }
    if (limit) {
      queryParams.set("limit", limit);
    }
    return await proxyJsonResponse(
      request,
      withQueryParams("/api/v1/assessment/evaluations", queryParams),
      {
        method: "GET",
      },
    );
  } catch (error: unknown) {
    return proxyErrorResponse(
      "Assessment evaluations list proxy error:",
      error,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await proxyJsonResponse(request, "/api/v1/assessment/evaluations", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error: unknown) {
    return proxyErrorResponse(
      "Assessment evaluations create proxy error:",
      error,
    );
  }
}
