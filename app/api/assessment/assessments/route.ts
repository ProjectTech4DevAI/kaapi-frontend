import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(request: NextRequest) {
  try {
    const queryString = request.nextUrl.searchParams.toString();
    const endpoint = `/api/v1/assessment/assessments${
      queryString ? `?${queryString}` : ""
    }`;

    const { status, data } = await apiClient(request, endpoint, {
      method: "GET",
    });

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    console.error("Assessment list proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to forward request to backend",
      },
      { status: 500 },
    );
  }
}
