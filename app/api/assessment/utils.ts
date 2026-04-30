import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";
import { safeParseJson, toDownloadResponse } from "@/app/lib/utils/apiResponse";

export function withQueryParams(
  endpoint: string,
  queryParams: URLSearchParams,
): string {
  const query = queryParams.toString();
  return query ? `${endpoint}?${query}` : endpoint;
}

export async function proxyJsonResponse(
  request: NextRequest,
  endpoint: string,
  init: RequestInit = {},
): Promise<NextResponse> {
  const { status, data } = await apiClient(request, endpoint, init);
  return NextResponse.json(data, { status });
}

export async function proxyDownloadOrJsonResponse(
  request: NextRequest,
  endpoint: string,
  init: RequestInit = {},
): Promise<NextResponse> {
  const response = await apiClient(request, endpoint, {
    ...init,
    responseType: "raw",
  });

  const downloadResponse = await toDownloadResponse(response);
  if (downloadResponse) {
    return downloadResponse;
  }

  const data = await safeParseJson(response);
  return NextResponse.json(data, { status: response.status });
}

export function proxyErrorResponse(
  logLabel: string,
  error: unknown,
  message = "Failed to forward request to backend",
): NextResponse {
  console.error(logLabel, error);
  return NextResponse.json({ error: message }, { status: 500 });
}
