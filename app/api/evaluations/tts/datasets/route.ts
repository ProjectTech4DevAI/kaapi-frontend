import { apiClient } from "@/app/lib/apiClient";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: Request) {
  try {
    const { status, data } = await apiClient(
      request,
      "/api/v1/evaluations/tts/datasets",
    );
    return NextResponse.json(data, { status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error, data: null },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { status, data } = await apiClient(
      request,
      "/api/v1/evaluations/tts/datasets",
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
