import { apiClient } from "@/app/lib/apiClient";
import { NextResponse, NextRequest } from "next/server";

type Params = { params: Promise<{ orgId: string; projectId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { orgId, projectId } = await params;
  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/credentials/${orgId}/${projectId}`,
    );
    return NextResponse.json(data, { status });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { orgId, projectId } = await params;
  try {
    const body = await request.json();
    const { status, data } = await apiClient(
      request,
      `/api/v1/credentials/${orgId}/${projectId}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    return NextResponse.json(data, { status });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { orgId, projectId } = await params;
  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/credentials/${orgId}/${projectId}`,
      { method: "DELETE" },
    );
    if (status === 204) return new NextResponse(null, { status: 204 });
    return NextResponse.json(data, { status });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
