import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";
import { proxyErrorResponse, withQueryParams } from "@/app/api/_routeProxy";

const MAX_DATASET_PROXY_BYTES = 10 * 1024 * 1024;

async function readFileAsBase64WithLimit(response: Response): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const size = Number.parseInt(contentLength, 10);
    if (Number.isFinite(size) && size > MAX_DATASET_PROXY_BYTES) {
      throw new Error("FILE_TOO_LARGE");
    }
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("FILE_STREAM_UNAVAILABLE");
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_DATASET_PROXY_BYTES) {
      throw new Error("FILE_TOO_LARGE");
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString("base64");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dataset_id: string }> },
) {
  try {
    const { dataset_id } = await params;
    const fetchContent =
      request.nextUrl.searchParams.get("fetch_content") === "true";

    // Always request signed URL when fetch_content is needed
    const backendParams = new URLSearchParams();
    if (fetchContent) {
      backendParams.set("fetch_content", "true");
    }
    if (fetchContent) {
      backendParams.set("include_signed_url", "true");
    }
    const endpoint = withQueryParams(
      `/api/v1/assessment/datasets/${dataset_id}`,
      backendParams,
    );

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

      let base64: string;
      try {
        base64 = await readFileAsBase64WithLimit(fileResponse);
      } catch (error) {
        if (error instanceof Error && error.message === "FILE_TOO_LARGE") {
          return NextResponse.json(
            { error: "File too large" },
            { status: 413 },
          );
        }

        return NextResponse.json(
          { error: "Failed to read file from storage" },
          { status: 502 },
        );
      }

      return NextResponse.json(
        { ...(data as Record<string, unknown>), file_content: base64 },
        { status: 200 },
      );
    }

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
