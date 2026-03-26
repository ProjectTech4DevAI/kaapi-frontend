import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ run_id: string }> },
) {
  const { run_id } = await params;

  // Extract query parameters from the request URL
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();

  try {
    // Forward query parameters to the backend
    const endpoint = queryString
      ? `/api/v1/evaluations/stt/runs/${run_id}?${queryString}`
      : `/api/v1/evaluations/stt/runs/${run_id}`;

    const { status, data } = await apiClient(request, endpoint);
    return NextResponse.json(data, { status });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch the run", data: null },
      { status: 500 },
    );
  }
}
