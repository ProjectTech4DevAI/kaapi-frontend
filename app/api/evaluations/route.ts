import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

/**
 * GET /api/evaluations
 * Fetches all evaluation jobs
 */
export async function GET(request: NextRequest) {
  try {
    const { status, data } = await apiClient(request, "/api/v1/evaluations");

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch evaluations",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/evaluations
 * Creates a new evaluation job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { status, data } = await apiClient(request, "/api/v1/evaluations", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return NextResponse.json(data, { status });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to forward request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
