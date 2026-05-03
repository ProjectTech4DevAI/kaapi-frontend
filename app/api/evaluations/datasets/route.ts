import { NextRequest } from "next/server";
import { proxyErrorResponse, proxyJsonResponse } from "@/app/api/_routeProxy";

/**
 * GET /api/evaluations/datasets
 *
 * Proxy endpoint to fetch all datasets from the backend.
 */
export async function GET(request: NextRequest) {
  try {
    return await proxyJsonResponse(request, "/api/v1/evaluations/datasets");
  } catch (error: unknown) {
    return proxyErrorResponse("Evaluations datasets list proxy error:", error);
  }
}

/**
 * POST /api/evaluations/datasets
 * Forwards multipart/form-data (CSV upload) to the backend.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    return await proxyJsonResponse(request, "/api/v1/evaluations/datasets", {
      method: "POST",
      body: formData,
    });
  } catch (error: unknown) {
    return proxyErrorResponse(
      "Evaluations datasets create proxy error:",
      error,
    );
  }
}
