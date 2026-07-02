import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params;
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const endpoint = `/api/v1/projects/organization/${orgId}${qs ? `?${qs}` : ""}`;
    const { status, data } = await apiClient(request, endpoint);
    return NextResponse.json(data, { status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to connect to backend" },
      { status: 500 },
    );
  }
}
