import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const { status, data } = await apiClient(
      request,
      `/api/v1/projects/${projectId}`,
      {
        method: "DELETE",
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
