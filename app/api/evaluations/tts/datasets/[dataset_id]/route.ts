import { apiClient } from "@/app/lib/apiClient";
import { NextResponse } from "next/server";
import {
  proxyErrorResponse,
  proxyJsonResponse,
  withQueryParams,
} from "@/app/api/_routeProxy";

type DatasetDetailsPayload = Record<string, unknown> & {
  data?: { signed_url?: string } | null;
  signed_url?: string;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dataset_id: string }> },
) {
  const { dataset_id } = await params;

  try {
    const { data, status } = await apiClient<DatasetDetailsPayload>(
      request,
      withQueryParams(
        `/api/v1/evaluations/tts/datasets/${dataset_id}`,
        new URL(request.url).searchParams,
      ),
    );

    // If fetch_content=true, download the CSV from the signed URL and return it
    const fetchContent = new URL(request.url).searchParams.get("fetch_content");
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

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    return proxyErrorResponse("TTS dataset details proxy error:", error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ dataset_id: string }> },
) {
  const { dataset_id } = await params;

  try {
    return await proxyJsonResponse(
      request,
      `/api/v1/evaluations/tts/datasets/${dataset_id}`,
      { method: "DELETE" },
    );
  } catch (error: unknown) {
    return proxyErrorResponse("TTS dataset delete proxy error:", error);
  }
}
