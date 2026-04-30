import { NextRequest } from "next/server";
import {
  proxyDownloadOrJsonResponse,
  proxyErrorResponse,
} from "@/app/api/assessment/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assessment_id: string }> },
) {
  try {
    const { assessment_id } = await params;
    const queryParams = new URLSearchParams();
    queryParams.set("get_trace_info", "true");
    return await proxyDownloadOrJsonResponse(
      request,
      `/api/v1/assessment/assessments/${assessment_id}/results?${queryParams.toString()}`,
      { method: "GET" },
    );
  } catch (error: unknown) {
    return proxyErrorResponse(
      "Assessment results proxy error:",
      error,
      "Failed to forward request",
    );
  }
}
