import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

/**
 * GET /api/evaluations/datasets
 *
 * Proxy endpoint to fetch all datasets from the backend.
 */
export async function GET(request: NextRequest) {
  try {
    const { status, data } = await apiClient(
      request,
      "/api/v1/evaluations/datasets",
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

/**
 * POST /api/evaluations/datasets
 * Forwards multipart/form-data (CSV upload) to the backend.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const { status, data } = await apiClient(
      request,
      "/api/v1/evaluations/datasets",
      {
        method: "POST",
        body: formData,
      },
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
