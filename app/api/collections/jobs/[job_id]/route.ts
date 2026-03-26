import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

// GET /api/collections/jobs/[job_id] - Get collection job status
export async function GET(
  request: Request,
  { params }: { params: Promise<{ job_id: string }> },
) {
  const { job_id } = await params;

  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/collections/jobs/${job_id}`,
    );

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
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
