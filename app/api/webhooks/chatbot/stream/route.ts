import { NextRequest } from "next/server";
import {
  getSessionEventsAfter,
  subscribeSessionEvents,
} from "@/app/lib/store/chatbotSessionStore";
import type { ChatbotSessionEvent } from "@/app/lib/types/chatbot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 20_000;

function parseSeq(value: string | null): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * SSE stream of webhook replies for one chatbot session. Each event carries
 * its `seq` as the SSE id, so a reconnecting EventSource resumes via
 * `Last-Event-ID`; `after` lets a fresh page load skip replies it already has.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return new Response("session_id_required", { status: 400 });
  }
  const afterSeq = Math.max(
    parseSeq(request.nextUrl.searchParams.get("after")),
    parseSeq(request.headers.get("last-event-id")),
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const push = (event: ChatbotSessionEvent) => {
        try {
          controller.enqueue(
            encoder.encode(
              `id: ${event.seq}\nevent: reply\ndata: ${JSON.stringify(event)}\n\n`,
            ),
          );
        } catch {
          // stream closed
        }
      };

      // Subscribe before replaying so nothing slips in between.
      const unsubscribe = subscribeSessionEvents(sessionId, push);
      getSessionEventsAfter(sessionId, afterSeq).forEach(push);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          finish();
        }
      }, HEARTBEAT_MS);

      function finish() {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      }

      request.signal.addEventListener("abort", finish);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
