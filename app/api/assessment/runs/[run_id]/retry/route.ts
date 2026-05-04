// BFF proxy to retry a failed child run.
// POST /api/assessment/runs/:id/retry → backend POST /api/v1/assessment/runs/:id/retry
import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";
import type { RouteContext } from "@/app/lib/types/assessment";

export async function POST(
  request: NextRequest,
  context: RouteContext<"run_id">,
) {
  try {
    const { run_id } = await context.params;
    const { status, data } = await apiClient(
      request,
      `/api/v1/assessment/runs/${run_id}/retry`,
      { method: "POST" },
    );

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    console.error("Assessment run retry proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to forward assessment run retry request",
      },
      { status: 500 },
    );
  }
}
