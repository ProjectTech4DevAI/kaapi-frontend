import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("X-API-KEY");

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing X-API-KEY header" },
        { status: 401 },
      );
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : "";

    const response = await fetch(
      `${backendUrl}/api/v1/assessment/assessments${queryString}`,
      {
        method: "GET",
        headers: {
          "X-API-KEY": apiKey,
        },
      },
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Failed to forward request to backend",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
