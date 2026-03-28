import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dataset_id: string }> },
) {
  const { dataset_id } = await params;
  try {
    // Forward all query parameters to the backend
    const { searchParams } = new URL(request.url);
    const backendParams = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      backendParams.append(key, value);
    }
    const queryString = backendParams.toString()
      ? `?${backendParams.toString()}`
      : "";

    const { status, data } = await apiClient(
      request,
      `/api/v1/evaluations/stt/datasets/${dataset_id}${queryString}`,
    );
    return NextResponse.json(data, { status });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch dataset", data: null },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ dataset_id: string }> },
) {
  const { dataset_id } = await params;
  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/evaluations/stt/datasets/${dataset_id}`,
      {
        method: "DELETE",
      },
    );
    return NextResponse.json(data, {
      status: status >= 200 && status < 300 ? 200 : status,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete dataset",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
