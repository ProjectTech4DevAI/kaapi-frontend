import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";
import { DocumentDetailEnvelope } from "@/app/lib/types/document";

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
