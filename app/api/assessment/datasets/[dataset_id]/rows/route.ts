import { NextRequest } from "next/server";
import { proxyErrorResponse, proxyJsonResponse } from "@/app/api/_routeProxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dataset_id: string }> },
) {
  try {
    const { dataset_id } = await params;
    return await proxyJsonResponse(
      request,
      `/api/v1/assessment/datasets/${dataset_id}/rows`,
      { method: "GET" },
    );
  } catch (error: unknown) {
    return proxyErrorResponse("Assessment dataset rows proxy error:", error);
  }
}
