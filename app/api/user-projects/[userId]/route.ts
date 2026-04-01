import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    const { status, data } = await apiClient(
      request,
      `/api/v1/user-projects/${userId}${queryString ? `?${queryString}` : ""}`,
      { method: "DELETE" },
    );
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to connect to backend" },
      { status: 500 },
    );
  }
}
