import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function POST(request: Request) {
  try {
    const { status, data } = await apiClient(request, "/api/v1/onboard", {
      method: "POST",
      body: JSON.stringify(await request.json()),
    });
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to connect to backend" },
      { status: 500 },
    );
  }
}
