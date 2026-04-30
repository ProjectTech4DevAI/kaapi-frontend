import { NextRequest } from "next/server";
import {
  proxyDownloadOrJsonResponse,
  proxyErrorResponse,
} from "@/app/api/assessment/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ evaluation_id: string }> },
) {
  try {
    const { evaluation_id } = await params;
    const queryParams = new URLSearchParams();
    queryParams.set("get_trace_info", "true");
    const exportFormat = request.nextUrl.searchParams.get("export_format");
    if (exportFormat) {
      queryParams.set("export_format", exportFormat);
    }
    const endpoint = `/api/v1/assessment/evaluations/${evaluation_id}/results?${queryParams.toString()}`;
    return await proxyDownloadOrJsonResponse(request, endpoint, {
      method: "GET",
    });
  } catch (error: unknown) {
    return proxyErrorResponse(
      "Assessment evaluation results proxy error:",
      error,
      "Failed to forward request",
    );
  }
}
