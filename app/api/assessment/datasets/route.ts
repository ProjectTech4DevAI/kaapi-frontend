import { NextRequest } from "next/server";
import {
  proxyErrorResponse,
  proxyJsonResponse,
} from "@/app/api/assessment/_utils";

export async function GET(request: NextRequest) {
  try {
    return await proxyJsonResponse(request, "/api/v1/assessment/datasets", {
      method: "GET",
    });
  } catch (error: unknown) {
    return proxyErrorResponse("Assessment datasets list proxy error:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    return await proxyJsonResponse(request, "/api/v1/assessment/datasets", {
      method: "POST",
      body: formData,
    });
  } catch (error: unknown) {
    return proxyErrorResponse("Assessment datasets create proxy error:", error);
  }
}
