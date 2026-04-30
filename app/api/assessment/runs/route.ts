import { NextRequest } from "next/server";
import {
  proxyErrorResponse,
  proxyJsonResponse,
  withQueryParams,
} from "@/app/api/assessment/_utils";

export async function GET(request: NextRequest) {
  try {
    const queryParams = new URLSearchParams();
    queryParams.set("get_trace_info", "true");
    return await proxyJsonResponse(
      request,
      withQueryParams("/api/v1/assessment/assessments", queryParams),
      {
        method: "GET",
      },
    );
  } catch (error: unknown) {
    return proxyErrorResponse("Assessment list proxy error:", error);
  }
}
