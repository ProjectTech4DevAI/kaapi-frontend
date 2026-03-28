import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

// GET /api/collections/[collection_id] - Get a specific collection
export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection_id: string }> },
) {
  const { collection_id } = await params;
  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/collections/${collection_id}?include_docs=true&include_url=true`,
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

// DELETE /api/collection/[collection_id] - Delete a collection
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ collection_id: string }> },
) {
  const { collection_id } = await params;

  try {
    const { status, data } = await apiClient(
      request,
      `/api/v1/collections/${collection_id}`,
      {
        method: "DELETE",
      },
    );

    return NextResponse.json(data ?? { success: true }, { status });
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
