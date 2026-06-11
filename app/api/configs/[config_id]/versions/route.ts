import { NextResponse } from "next/server";
import { withQueryParams } from "@/app/api/_routeProxy";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ config_id: string }> },
) {
  const { config_id } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const endpoint = withQueryParams(
      `/api/v1/configs/${config_id}/versions`,
      searchParams,
    );
    const { status, data } = await apiClient(request, endpoint);

    return NextResponse.json(data, { status });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch versions", data: null },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ config_id: string }> },
) {
  const { config_id } = await params;

  try {
    const body = await request.json();
    const { status, data } = await apiClient(
      request,
      `/api/v1/configs/${config_id}/versions`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    return NextResponse.json(data, { status });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to create version", data: null },
      { status: 500 },
    );
  }
}
