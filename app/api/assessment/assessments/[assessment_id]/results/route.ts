import { NextRequest, NextResponse } from "next/server";
import {
  assessmentApiFetch,
  safeParseJson,
  toDownloadResponse,
} from "@/app/api/assessment/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assessment_id: string }> },
) {
  try {
    const { assessment_id } = await params;
    const queryParams = new URLSearchParams(request.nextUrl.searchParams);
    queryParams.set("get_trace_info", "true");

    const response = await assessmentApiFetch(
      request,
      `/api/v1/assessment/assessments/${assessment_id}/results?${queryParams.toString()}`,
      { method: "GET" },
    );

    const downloadResponse = await toDownloadResponse(response);
    if (downloadResponse) {
      return downloadResponse;
    }

    const data = await safeParseJson(response);
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    console.error("Assessment results proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to forward request",
      },
      { status: 500 },
    );
  }
}
