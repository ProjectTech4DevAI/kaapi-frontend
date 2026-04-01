import { apiClient } from "@/app/lib/apiClient";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const { status, data: responseData } = await apiClient(
      request,
      "/api/v1/evaluations/stt/files",
      {
        method: "POST",
        body: formData,
      },
    );

    return NextResponse.json(responseData, { status });
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
