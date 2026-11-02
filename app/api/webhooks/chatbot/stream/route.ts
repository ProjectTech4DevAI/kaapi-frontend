import { NextRequest } from "next/server";
import { createSseResponse } from "@/app/api/_sse";
import { chatbotReplyChannel } from "@/app/lib/store/chatbotSessionStore";
import type { ChannelEvent } from "@/app/lib/types/eventChannel";
import type { ChatbotSessionEvent } from "@/app/lib/types/chatbot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return new Response("session_id_required", { status: 400 });
  }

  return createSseResponse(request, (send) => {
    const sendReply = ({ seq, data }: ChannelEvent<ChatbotSessionEvent>) =>
      send("reply", data, seq);

    const unsubscribe = chatbotReplyChannel.subscribe(sessionId, sendReply);

    // On reconnect, the browser sends the last id it got; resend what it missed.
    const lastSeenId = Number(request.headers.get("last-event-id"));
    if (lastSeenId) {
      chatbotReplyChannel.after(sessionId, lastSeenId).forEach(sendReply);
    }
    return unsubscribe;
  });
}
