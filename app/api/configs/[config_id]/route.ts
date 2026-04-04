import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ config_id: string }> },
) {
  const { config_id } = await params;

  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/configs/${config_id}`,
    );
    return NextResponse.json(data, { status });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch config", data: null },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ config_id: string }> },
) {
  const { config_id } = await params;

  try {
    const body = await request.json();

    const { status, data } = await apiClient(
      request,
      `/api/v1/configs/${config_id}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );

    return NextResponse.json(data, { status });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to update config", data: null },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ config_id: string }> },
) {
  const { config_id } = await params;

  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/configs/${config_id}`,
      {
        method: "DELETE",
      },
    );

    return NextResponse.json(data, { status });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete config", data: null },
      { status: 500 },
    );
  }
}
