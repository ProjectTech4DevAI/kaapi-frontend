import { NextRequest } from "next/server";
import {
  proxyErrorResponse,
  proxyJsonResponse,
  withQueryParams,
} from "@/app/api/_routeProxy";

/** Creates a chatbot session (stores the prompt + config pin server-side). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await proxyJsonResponse(request, "/api/v1/chatbot/sessions", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    return proxyErrorResponse("chatbot create-session error:", error);
  }
}

/** Latest session for a `contact_ref`. */
export async function GET(request: NextRequest) {
  try {
    return await proxyJsonResponse(
      request,
      withQueryParams("/api/v1/chatbot/sessions", request.nextUrl.searchParams),
    );
  } catch (error) {
    return proxyErrorResponse("chatbot get-session error:", error);
  }
}
