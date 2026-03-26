import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = new URLSearchParams();

    const skip = searchParams.get("skip");
    const limit = searchParams.get("limit");
    const include_url = searchParams.get("include_url");

    if (skip !== null) params.set("skip", skip);
    if (limit !== null) params.set("limit", limit);
    if (include_url !== null) params.set("include_url", include_url);

    const queryString = params.toString();
    const endpoint = queryString
      ? `/api/v1/documents/?${queryString}`
      : "/api/v1/documents/";

    const { status, data } = await apiClient(request, endpoint);
    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: null,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const { status, data } = await apiClient(request, "/api/v1/documents/", {
      method: "POST",
      body: formData,
    });

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
