import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";
import fs from "fs";
import path from "path";

// Set to true to use mock data, false to use real backend
const USE_MOCK_DATA = false;

// === MOCK DATA (remove this section when no longer needed) ===
const MOCK_FILE_MAP: Record<string, string> = {
  "44": "evaluation-sample-2.json",
  "2": "evaluation-sample-2.json",
  "10": "evaluation-sample-3.json",
  "3": "evaluation-sample-3.json",
};

function getMockEvaluation(id: string): NextResponse {
  const mockFileName = MOCK_FILE_MAP[id] || "evaluation-sample-1.json";
  const filePath = path.join(
    process.cwd(),
    "public",
    "mock-data",
    mockFileName,
  );

  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const mockData = JSON.parse(fileContent);
    return NextResponse.json(mockData, { status: 200 });
  } catch (err) {
    console.error("Error reading mock data:", err);
    return NextResponse.json(
      {
        error: "Mock data not found",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 404 },
    );
  }
}

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

    if (USE_MOCK_DATA) {
      return getMockEvaluation(id);
    }

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
