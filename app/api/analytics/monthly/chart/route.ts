import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const endpoint = `/api/v1/analytics/monthly/chart${qs ? `?${qs}` : ""}`;
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
