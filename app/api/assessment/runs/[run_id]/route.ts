// BFF proxy for a single assessment child run.
// GET /api/assessment/runs/:id → backend GET /api/v1/assessment/runs/:id
import { NextRequest } from "next/server";
import { proxyErrorResponse, proxyJsonResponse } from "@/app/api/_routeProxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ run_id: string }> },
) {
  try {
    const { run_id } = await params;
    return await proxyJsonResponse(
      request,
      `/api/v1/assessment/runs/${run_id}`,
      {
        method: "GET",
      },
    );
  } catch (error: unknown) {
    return proxyErrorResponse("Assessment run proxy error:", error);
  }
}
