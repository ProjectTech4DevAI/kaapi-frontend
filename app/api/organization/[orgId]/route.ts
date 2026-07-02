import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const { status, data } = await apiClient(
      request,
      `/api/v1/organizations/${orgId}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const { status, data } = await apiClient(
      request,
      `/api/v1/organizations/${orgId}`,
      {
        method: "DELETE",
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
