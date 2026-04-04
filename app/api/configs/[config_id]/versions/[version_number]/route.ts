import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ config_id: string; version_number: string }> },
) {
  const { config_id, version_number } = await params;

  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/configs/${config_id}/versions/${version_number}`,
    );
    return NextResponse.json(data, { status });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch version", data: null },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: { params: Promise<{ config_id: string; version_number: string }> },
) {
  const { config_id, version_number } = await params;

  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/configs/${config_id}/versions/${version_number}`,
      {
        method: "DELETE",
      },
    );
    return NextResponse.json(data, { status });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete version", data: null },
      { status: 500 },
    );
  }
}
