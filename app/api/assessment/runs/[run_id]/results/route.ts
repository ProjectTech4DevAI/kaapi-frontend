// BFF proxy for child run results. Supports JSON and file download responses.
// GET /api/assessment/runs/:id/results → backend GET /api/v1/assessment/runs/:id/results
import { NextRequest } from "next/server";
import {
  proxyDownloadOrJsonResponse,
  proxyErrorResponse,
  withQueryParams,
} from "@/app/api/_routeProxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ run_id: string }> },
) {
  try {
    const { run_id } = await params;
    const queryParams = new URLSearchParams(request.nextUrl.searchParams);
    queryParams.set("get_trace_info", "true");
    const endpoint = withQueryParams(
      `/api/v1/assessment/runs/${run_id}/results`,
      queryParams,
    );
    return await proxyDownloadOrJsonResponse(request, endpoint, {
      method: "GET",
    });
  } catch (error: unknown) {
    return proxyErrorResponse(
      "Assessment run results proxy error:",
      error,
      "Failed to forward request",
    );
  }
}
