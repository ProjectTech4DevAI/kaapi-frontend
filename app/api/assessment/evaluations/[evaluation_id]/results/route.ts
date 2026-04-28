import { NextRequest, NextResponse } from "next/server";
import {
  assessmentApiFetch,
  safeParseJson,
  toDownloadResponse,
} from "@/app/api/assessment/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ evaluation_id: string }> },
) {
  try {
    const { evaluation_id } = await params;
    const queryString = request.nextUrl.searchParams.toString();
    const endpoint = `/api/v1/assessment/evaluations/${evaluation_id}/results${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await assessmentApiFetch(request, endpoint, {
      method: "GET",
    });

    const downloadResponse = await toDownloadResponse(response);
    if (downloadResponse) {
      return downloadResponse;
    }

    const data = await safeParseJson(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    console.error("Assessment evaluation results proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to forward request",
      },
      { status: 500 },
    );
  }
}
