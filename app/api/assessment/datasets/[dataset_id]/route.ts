// BFF proxy — GET (optional preview via limit_rows) + DELETE /api/v1/assessment/datasets/:id
import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";
import { proxyErrorResponse, withQueryParams } from "@/app/api/_routeProxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dataset_id: string }> },
) {
  try {
    const { dataset_id } = await params;
    const limitRows = request.nextUrl.searchParams.get("limit_rows");

    const backendParams = new URLSearchParams();
    if (limitRows) {
      backendParams.set("limit_rows", limitRows);
    }
    const endpoint = withQueryParams(
      `/api/v1/assessment/datasets/${dataset_id}`,
      backendParams,
    );

    const { status, data } = await apiClient(request, endpoint, {
      method: "GET",
    });

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    return proxyErrorResponse("Assessment dataset details proxy error:", error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ dataset_id: string }> },
) {
  try {
    const { dataset_id } = await params;
    const { status, data } = await apiClient(
      request,
      `/api/v1/assessment/datasets/${dataset_id}`,
      { method: "DELETE" },
    );

    if (status === 204) {
      return new NextResponse(null, { status });
    }

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    return proxyErrorResponse("Assessment dataset delete proxy error:", error);
  }
}
