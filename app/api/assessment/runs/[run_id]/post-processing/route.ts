import { NextRequest } from "next/server";
import { proxyErrorResponse, proxyJsonResponse } from "@/app/api/_routeProxy";
import type { RouteContext } from "@/app/lib/types/assessment";

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"run_id">,
) {
  try {
    const { run_id } = await context.params;
    const body = await request.json();
    return await proxyJsonResponse(
      request,
      `/api/v1/assessment/runs/${run_id}/post-processing`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
  } catch (error: unknown) {
    return proxyErrorResponse(
      "Assessment run post-processing proxy error:",
      error,
    );
  }
}
