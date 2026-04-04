import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(request: Request) {
  try {
    const { status, data } = await apiClient(
      request,
      "/api/v1/evaluations/stt/runs",
    );
    return NextResponse.json(data, { status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error, data: null },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get("X-API-KEY");
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Missing X-API-KEY. Either generate an API Key. Contact Kaapi team for more details",
        },
        { status: 401 },
      );
    }
    const body = await request.json();

    const { status, data } = await apiClient(
      request,
      "/api/v1/evaluations/stt/runs",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json(data, { status });
  } catch (error) {
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
