import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/assessment/datasets/:dataset_id
 *
 * Proxy endpoint to get assessment dataset details.
 * When fetch_content=true, downloads the raw file from S3 server-side
 * and returns it as base64 in file_content (avoids browser CORS issues).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dataset_id: string }> },
) {
  try {
    const apiKey = request.headers.get("X-API-KEY");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing X-API-KEY header" },
        { status: 401 },
      );
    }

    const { dataset_id } = await params;
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const fetchContent =
      request.nextUrl.searchParams.get("fetch_content") === "true";

    // Always request signed URL when fetch_content is needed
    const backendParams = new URLSearchParams(request.nextUrl.searchParams);
    if (fetchContent) {
      backendParams.set("include_signed_url", "true");
    }
    const queryString = backendParams.toString()
      ? `?${backendParams.toString()}`
      : "";

    const response = await fetch(
      `${backendUrl}/api/v1/assessment/datasets/${dataset_id}${queryString}`,
      {
        method: "GET",
        headers: { "X-API-KEY": apiKey },
      },
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Download file from S3 server-side and return as base64
    if (fetchContent) {
      const signedUrl = data?.data?.signed_url || data?.signed_url;
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
        { ...data, file_content: base64 },
        { status: 200 },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to forward request to backend",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/assessment/datasets/:dataset_id
 *
 * Proxy endpoint to delete an assessment dataset from the backend.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ dataset_id: string }> },
) {
  try {
    const apiKey = request.headers.get("X-API-KEY");

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing X-API-KEY header" },
        { status: 401 },
      );
    }

    const { dataset_id } = await params;
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

    const response = await fetch(
      `${backendUrl}/api/v1/assessment/datasets/${dataset_id}`,
      {
        method: "DELETE",
        headers: {
          "X-API-KEY": apiKey,
        },
      },
    );

    let data;
    try {
      data = await response.json();
    } catch (_e) {
      data = { success: true };
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to forward request to backend",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
