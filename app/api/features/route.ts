import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const apiKey =
      request.headers.get("X-API-KEY") ??
      cookieStore.get("kaapi_api_key")?.value;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing X-API-KEY header" },
        { status: 401 },
      );
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const response = await fetch(`${backendUrl}/api/v1/features`, {
      method: "GET",
      headers: { "X-API-KEY": decodeURIComponent(apiKey) },
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch feature flags" },
      { status: 500 },
    );
  }
}
