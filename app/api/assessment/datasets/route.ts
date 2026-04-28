import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(request: NextRequest) {
  try {
    const { status, data } = await apiClient(
      request,
      "/api/v1/assessment/datasets",
      { method: "GET" },
    );

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    console.error("Assessment datasets list proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to forward request to backend",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const { status, data } = await apiClient(
      request,
      "/api/v1/assessment/datasets",
      {
        method: "POST",
        body: formData,
      },
    );

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    console.error("Assessment datasets create proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to forward request to backend",
      },
      { status: 500 },
    );
  }
}
