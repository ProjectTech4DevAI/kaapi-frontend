import { apiClient } from "@/app/lib/apiClient";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { status, data } = await apiClient(request, "/api/v1/apikeys/verify");
    return NextResponse.json(data, { status });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
