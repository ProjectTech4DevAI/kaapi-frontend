import { NextRequest } from "next/server";
import { proxyErrorResponse, proxyJsonResponse } from "@/app/api/_routeProxy";
import type { RouteContext } from "@/app/lib/types/assessment";

/**
 * GET /api/assessment/batch/[assessment_id] — status plus every row so far.
 * Safe to poll; stops being worth polling once the status is terminal.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"assessment_id">,
) {
  try {
    const { assessment_id } = await context.params;
    return await proxyJsonResponse(
      request,
      `/api/v1/assessments/${assessment_id}`,
      { method: "GET" },
    );
  } catch (error: unknown) {
    return proxyErrorResponse("Assessment batch detail proxy error:", error);
  }
}
