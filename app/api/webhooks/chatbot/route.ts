import { NextRequest, NextResponse } from "next/server";
import { chatbotReplyChannel } from "@/app/lib/store/chatbotSessionStore";
import { isWebhookAuthorized } from "@/app/lib/webhookCallback";
import type {
  ChatbotSessionEvent,
  ChatbotWebhookPayload,
} from "@/app/lib/types/chatbot";

function toSessionEvent(body: ChatbotWebhookPayload): ChatbotSessionEvent {
  return {
    success: body.success === true,
    reply: body.data?.reply ?? null,
    status: body.data?.status ?? null,
    completionStatus: body.data?.completion_status ?? null,
    error: body.error ?? null,
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!isWebhookAuthorized(request)) {
      return NextResponse.json(
        { success: false, error: "unauthorized" },
        { status: 401 },
      );
    }
    const body = (await request.json()) as ChatbotWebhookPayload;
    const sessionId = body.data?.session_id;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "invalid_payload" },
        { status: 400 },
      );
    }
    chatbotReplyChannel.publish(sessionId, toSessionEvent(body));
    return NextResponse.json({ success: true, data: { received: true } });
  } catch (error) {
    console.error("chatbot webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "webhook_processing_failed",
      },
      { status: 500 },
    );
  }
}
