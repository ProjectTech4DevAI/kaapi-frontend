import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ job_id: string }> },
) {
  const { job_id } = await params;
  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/llm/call/${job_id}`,
    );
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
