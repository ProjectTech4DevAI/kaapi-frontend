import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

/**
 * GET /api/evaluations/[id]
 * Fetches a single evaluation job by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const searchParams = request.nextUrl.searchParams;
    const exportFormat = searchParams.get("export_format") || "row";
    const resyncScore = searchParams.get("resync_score") || "false";

    const queryParams = new URLSearchParams();
    queryParams.set("get_trace_info", "true");
    queryParams.set("resync_score", resyncScore);
    queryParams.set("export_format", exportFormat);

    const { status, data } = await apiClient(
      request,
      `/api/v1/evaluations/${id}?${queryParams.toString()}`,
    );

    if (status < 200 || status >= 300) {
      return NextResponse.json(data ?? { error: "Backend error" }, { status });
    }

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Invalid response format from backend" },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch evaluation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
