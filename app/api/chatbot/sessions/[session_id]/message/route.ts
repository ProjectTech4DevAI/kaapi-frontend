import { NextRequest, NextResponse } from "next/server";
import { proxyErrorResponse, proxyJsonResponse } from "@/app/api/_routeProxy";
import { buildWebhookCallbackUrl } from "@/app/lib/webhookCallback";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ session_id: string }> },
) {
  const { session_id } = await params;

  let webhookUrl: string;
  try {
    webhookUrl = buildWebhookCallbackUrl(request, "/api/webhooks/chatbot");
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Webhook is not configured: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      message?: string;
    };
    return await proxyJsonResponse(
      request,
      `/api/v1/chatbot/sessions/${encodeURIComponent(session_id)}/message`,
      {
        method: "POST",
        body: JSON.stringify({
          ...(body.message ? { message: body.message } : {}),
          webhook_url: webhookUrl,
        }),
      },
    );
  } catch (error) {
    return proxyErrorResponse("chatbot send-message error:", error);
  }
}
