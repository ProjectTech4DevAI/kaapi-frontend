import { apiClient } from "@/app/lib/apiClient";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dataset_id: string }> },
) {
  const { dataset_id } = await params;

  try {
    // Forward query parameters to the backend
    const { searchParams } = new URL(request.url);
    const backendParams = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      backendParams.append(key, value);
    }
    const queryString = backendParams.toString()
      ? `?${backendParams.toString()}`
      : "";

    const { data, status } = await apiClient(
      request,
      `/api/v1/evaluations/tts/datasets/${dataset_id}${queryString}`,
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
        { ...data, csv_content: csvText },
        { status: 200 },
      );
    }

    return NextResponse.json(data, { status });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch dataset", data: null },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ dataset_id: string }> },
) {
  const { dataset_id } = await params;

  try {
    const { data, status } = await apiClient(
      request,
      `/api/v1/evaluations/tts/datasets/${dataset_id}`,
      { method: "DELETE" },
    );
    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete dataset",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
