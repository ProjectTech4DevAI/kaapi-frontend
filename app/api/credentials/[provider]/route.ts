import { apiClient } from "@/app/lib/apiClient";
import { NextResponse, NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/credentials/provider/${provider}`,
    );
    return NextResponse.json(data, { status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/credentials/provider/${provider}`,
      { method: "DELETE" },
    );
    if (status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(data, { status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
