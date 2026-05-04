import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ document_id: string }> },
) {
  const { document_id } = await params;
  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/documents/${document_id}?include_url=true`,
    );
    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: null,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ document_id: string }> },
) {
  const { document_id } = await params;

  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/documents/${document_id}`,
      {
        method: "DELETE",
      },
    );

    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    console.error("Delete error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete document",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
