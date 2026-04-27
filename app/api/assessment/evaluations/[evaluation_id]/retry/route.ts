import { NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ evaluation_id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const apiKey = request.headers.get("X-API-KEY");

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing X-API-KEY header" },
        { status: 401 },
      );
    }

    const { evaluation_id } = await context.params;
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

    const response = await fetch(
      `${backendUrl}/api/v1/assessment/evaluations/${evaluation_id}/retry`,
      {
        method: "POST",
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
        error: "Failed to forward evaluation retry request",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
