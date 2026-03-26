import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sample_id: string }> },
) {
  const { sample_id } = await params;
  try {
    const body = await request.json();

    const { status, data } = await apiClient(
      request,
      `/api/v1/evaluations/stt/samples/${sample_id}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    console.error("Sample update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update sample",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
