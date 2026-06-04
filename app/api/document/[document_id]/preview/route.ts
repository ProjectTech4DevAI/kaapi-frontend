import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

/**
 * Same-origin proxy for document content.
 *
 * Object-storage signed URLs are typically public for GET, but they (a) live
 * on a different origin so the browser blocks fetch() via CORS, and (b) often
 * set Content-Disposition: attachment so the browser downloads instead of
 * rendering. Both problems disappear when the bytes come from our own origin.
 *
 * The route fetches the document's signed URL server-side and streams the
 * bytes back with the upstream Content-Type intact (no attachment header).
 */

interface DocumentDetail {
  signed_url?: string;
  fname?: string;
}

interface DocumentDetailEnvelope {
  data?: DocumentDetail;
  signed_url?: string;
  fname?: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ document_id: string }> },
) {
  const { document_id } = await params;
  try {
    const { data } = await apiClient(
      request,
      `/api/v1/documents/${document_id}?include_url=true`,
    );
    const detail = (data as DocumentDetailEnvelope) || {};
    const signedUrl = detail.data?.signed_url || detail.signed_url;
    if (!signedUrl) {
      return NextResponse.json(
        { error: "Document has no signed URL" },
        { status: 404 },
      );
    }

    const upstream = await fetch(signedUrl);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Failed to fetch document (status ${upstream.status})` },
        { status: upstream.status },
      );
    }

    const contentType =
      upstream.headers.get("Content-Type") || "application/octet-stream";
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
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
