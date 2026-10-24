import { NextRequest, NextResponse } from "next/server";
import { saveSessionEvent } from "@/app/lib/store/chatbotSessionStore";
import { isWebhookAuthorized } from "@/app/lib/webhookCallback";
import type {
  ChatbotSessionEvent,
  ChatbotWebhookPayload,
} from "@/app/lib/types/chatbot";

function toSessionEvent(
  body: ChatbotWebhookPayload,
): Omit<ChatbotSessionEvent, "seq"> | null {
  const data = body.data;
  if (!data?.session_id) return null;
  return {
    sessionId: data.session_id,
    success: body.success === true,
    reply: data.reply ?? null,
    status: data.status ?? null,
    completionStatus: data.completion_status ?? null,
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
    const event = toSessionEvent(
      (await request.json()) as ChatbotWebhookPayload,
    );
    if (!event) {
      return NextResponse.json(
        { success: false, error: "invalid_payload" },
        { status: 400 },
      );
    }
    saveSessionEvent(event);
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
