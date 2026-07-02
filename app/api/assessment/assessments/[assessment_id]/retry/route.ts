import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";
import type { RouteContext } from "@/app/lib/types/assessment";

export async function POST(
  request: NextRequest,
  context: RouteContext<"assessment_id">,
) {
  try {
    const { assessment_id } = await context.params;
    const { status, data } = await apiClient(
      request,
      `/api/v1/assessment/assessments/${assessment_id}/retry`,
      { method: "POST" },
    );

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    console.error("Assessment retry proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to forward assessment retry request",
      },
      { status: 500 },
    );
  }
}
