import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dataset_id: string }> },
) {
  try {
    const { dataset_id } = await params;
    const fetchContent =
      request.nextUrl.searchParams.get("fetch_content") === "true";

    // Always request signed URL when fetch_content is needed
    const backendParams = new URLSearchParams(request.nextUrl.searchParams);
    if (fetchContent) {
      backendParams.set("include_signed_url", "true");
    }
    const endpoint = `/api/v1/assessment/datasets/${dataset_id}${
      backendParams.toString() ? `?${backendParams.toString()}` : ""
    }`;

    const { status, data } = await apiClient(request, endpoint, {
      method: "GET",
    });

    if (status >= 400) {
      return NextResponse.json(data, { status });
    }

    // Download file from S3 server-side and return as base64
    if (fetchContent) {
      const signedUrl =
        (data as { data?: { signed_url?: string }; signed_url?: string })?.data
          ?.signed_url ||
        (data as { data?: { signed_url?: string }; signed_url?: string })
          ?.signed_url;

      if (!signedUrl) {
        return NextResponse.json(
          { error: "No signed URL available" },
          { status: 404 },
        );
      }

      const fileResponse = await fetch(signedUrl);
      if (!fileResponse.ok) {
        return NextResponse.json(
          { error: "Failed to fetch file from storage" },
          { status: 502 },
        );
      }

      const arrayBuffer = await fileResponse.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return NextResponse.json(
        { ...(data as Record<string, unknown>), file_content: base64 },
        { status: 200 },
      );
    }

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    console.error("Assessment dataset details proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to forward request to backend",
      },
      { status: 500 },
    );
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

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    console.error("Assessment dataset delete proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to forward request to backend",
      },
      { status: 500 },
    );
  }
}
