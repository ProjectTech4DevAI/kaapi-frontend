// BFF proxy for assessment results. Supports JSON and file download responses.
// GET /api/assessment/assessments/:id/results → backend GET /api/v1/assessment/assessments/:id/results
import { NextRequest } from "next/server";
import {
  proxyDownloadOrJsonResponse,
  proxyErrorResponse,
  withQueryParams,
} from "@/app/api/_routeProxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assessment_id: string }> },
) {
  try {
    const { assessment_id } = await params;
    const queryParams = new URLSearchParams(request.nextUrl.searchParams);
    queryParams.set("get_trace_info", "true");
    return await proxyDownloadOrJsonResponse(
      request,
      withQueryParams(
        `/api/v1/assessment/assessments/${assessment_id}/results`,
        queryParams,
      ),
      { method: "GET" },
    );
  } catch (error: unknown) {
    return proxyErrorResponse(
      "Assessment results proxy error:",
      error,
      "Failed to forward request",
    );
  }
}
