import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

interface RouteContext {
  params: Promise<{ evaluation_id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { evaluation_id } = await context.params;
    const { status, data } = await apiClient(
      request,
      `/api/v1/assessment/evaluations/${evaluation_id}/retry`,
      { method: "POST" },
    );

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    console.error("Assessment evaluation retry proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to forward evaluation retry request",
      },
      { status: 500 },
    );
  }
}
