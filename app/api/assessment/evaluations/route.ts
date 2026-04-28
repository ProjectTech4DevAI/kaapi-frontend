import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(request: NextRequest) {
  try {
    const queryString = request.nextUrl.searchParams.toString();
    const endpoint = `/api/v1/assessment/evaluations${
      queryString ? `?${queryString}` : ""
    }`;

    const { status, data } = await apiClient(request, endpoint, {
      method: "GET",
    });

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    console.error("Assessment evaluations list proxy error:", error);
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
    const body = await request.json();

    const { status, data } = await apiClient(
      request,
      "/api/v1/assessment/evaluations",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    console.error("Assessment evaluations create proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to forward request to backend",
      },
      { status: 500 },
    );
  }
}
