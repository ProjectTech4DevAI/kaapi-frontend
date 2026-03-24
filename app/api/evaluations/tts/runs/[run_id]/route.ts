import { apiClient } from "@/app/lib/apiClient";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ run_id: string }> },
) {
  const { run_id } = await params;
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();

  const endpoint = queryString
    ? `/api/v1/evaluations/tts/runs/${run_id}?${queryString}`
    : `/api/v1/evaluations/tts/runs/${run_id}`;

  try {
    const { status, data } = await apiClient(request, endpoint);
    return NextResponse.json(data, { status });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch the run", data: null },
      { status: 500 },
    );
  }
}
