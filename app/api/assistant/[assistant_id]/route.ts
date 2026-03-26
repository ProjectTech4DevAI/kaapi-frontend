import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

/**
 * GET /api/assistant/:assistant_id
 *
 * Proxy endpoint to fetch assistant configuration from the backend.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assistant_id: string }> },
) {
  try {
    const { assistant_id } = await params;

    const { status, data } = await apiClient(
      request,
      `/api/v1/assistant/${assistant_id}`,
    );

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to forward request to backend",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
