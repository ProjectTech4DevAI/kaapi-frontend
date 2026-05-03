import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";
import {
  proxyErrorResponse,
  proxyJsonResponse,
  withQueryParams,
} from "@/app/api/_routeProxy";

type DatasetDetailsPayload = Record<string, unknown> & {
  data?: { signed_url?: string } | null;
  signed_url?: string;
};

/**
 * GET /api/evaluations/datasets/:dataset_id
 *
 * Proxy endpoint to get dataset details (with optional signed URL).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dataset_id: string }> },
) {
  try {
    const { dataset_id } = await params;

    const { status, data } = await apiClient<DatasetDetailsPayload>(
      request,
      withQueryParams(
        `/api/v1/evaluations/datasets/${dataset_id}`,
        request.nextUrl.searchParams,
      ),
    );

    if (status < 200 || status >= 300) {
      return NextResponse.json(data, { status });
    }

    // If fetch_content=true, download the CSV from the signed URL and return it
    const fetchContent = request.nextUrl.searchParams.get("fetch_content");
    if (fetchContent === "true") {
      const signedUrl = data?.data?.signed_url || data?.signed_url;
      if (!signedUrl) {
        return NextResponse.json(
          { error: "No signed URL available" },
          { status: 404 },
        );
      }
      const csvResponse = await fetch(signedUrl);
      if (!csvResponse.ok) {
        return NextResponse.json(
          { error: "Failed to fetch CSV file" },
          { status: 502 },
        );
      }
      const csvText = await csvResponse.text();
      return NextResponse.json(
        { ...(data ?? {}), csv_content: csvText },
        { status: 200 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    return proxyErrorResponse(
      "Evaluations dataset details proxy error:",
      error,
    );
  }
}

/**
 * DELETE /api/evaluations/datasets/:dataset_id
 *
 * Proxy endpoint to delete a dataset from the backend.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ dataset_id: string }> },
) {
  try {
    const { dataset_id } = await params;

    return await proxyJsonResponse(
      request,
      `/api/v1/evaluations/datasets/${dataset_id}`,
      {
        method: "DELETE",
      },
    );
  } catch (error: unknown) {
    return proxyErrorResponse("Evaluations dataset delete proxy error:", error);
  }
}
