import { NextRequest } from "next/server";
import {
  proxyErrorResponse,
  proxyJsonResponse,
  withQueryParams,
} from "@/app/api/_routeProxy";

export async function GET(request: NextRequest) {
  try {
    return await proxyJsonResponse(
      request,
      withQueryParams("/api/v1/chatbots", request.nextUrl.searchParams),
    );
  } catch (error) {
    return proxyErrorResponse("chatbot list error:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await proxyJsonResponse(request, "/api/v1/chatbots", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    return proxyErrorResponse("chatbot create error:", error);
  }
}
