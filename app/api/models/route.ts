import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = searchParams.get("skip") ?? "0";
    const limit = searchParams.get("limit") ?? "100";
    const endpoint = `/api/v1/models/grouped?skip=${skip}&limit=${limit}`;
    const { status, data } = await apiClient(request, endpoint);
    return NextResponse.json(data, { status });
  } catch (error) {
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
