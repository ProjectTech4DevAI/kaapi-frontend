import { apiClient } from "@/app/lib/apiClient";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { status, data } = await apiClient(request, "/api/v1/languages");
    return NextResponse.json(data, { status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error, data: null },
      { status: 500 },
    );
  }
}
