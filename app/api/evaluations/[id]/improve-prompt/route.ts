import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    let body: unknown = undefined;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { status, data } = await apiClient(
      request,
      `/api/v1/evaluations/${id}/improve-prompt`,
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      },
    );

    return NextResponse.json(data ?? { error: "Backend error" }, { status });
  } catch (error: unknown) {
    console.error("improve-prompt proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to improve prompt",
      },
      { status: 500 },
    );
  }
}
