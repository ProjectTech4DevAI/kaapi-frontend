import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ result_id: string }> },
) {
  const { result_id } = await params;

  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/evaluations/stt/results/${result_id}`,
    );
    return NextResponse.json(data, { status });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch results", data: null },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ result_id: string }> },
) {
  const { result_id } = await params;
  try {
    const body = await request.json();

    const { status, data } = await apiClient(
      request,
      `/api/v1/evaluations/stt/results/${result_id}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );

    return NextResponse.json(data, { status });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to update result feedback", data: null },
      { status: 500 },
    );
  }
}
