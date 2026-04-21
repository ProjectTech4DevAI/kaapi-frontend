import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const { status, data } = await apiClient(
      request,
      `/api/v1/organizations/${queryString ? `?${queryString}` : ""}`,
    );
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to connect to backend" },
      { status: 500 },
    );
  }
}
