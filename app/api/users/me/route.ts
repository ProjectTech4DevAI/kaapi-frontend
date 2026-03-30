import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(request: NextRequest) {
  try {
    const { status, data } = await apiClient(request, "/api/v1/users/me");
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to backend" },
      { status: 500 },
    );
  }
}
