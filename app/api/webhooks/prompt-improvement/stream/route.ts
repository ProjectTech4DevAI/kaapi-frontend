import { NextRequest } from "next/server";
import {
  getJobSnapshot,
  subscribeJobSnapshot,
} from "@/app/lib/store/promptImprovementStore";
import type { PromptImprovementJobSnapshot } from "@/app/lib/types/promptImprovement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("job_id");
  if (!jobId) {
    return new Response("job_id_required", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          // stream closed
        }
      };

      const finish = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      const push = (snap: PromptImprovementJobSnapshot) => {
        send("snapshot", snap);
        if (snap.status === "SUCCESS" || snap.status === "FAILED") {
          finish();
        }
      };

      // Prime with current state (or a synthetic PENDING when store hasn't
      // seen it yet — keeps the client from thinking the stream is stalled).
      const current = getJobSnapshot(jobId);
      if (current) {
        push(current);
      } else {
        send("snapshot", {
          job_id: jobId,
          status: "PENDING",
          config_version: null,
          error_message: null,
          updated_at: new Date().toISOString(),
        });
      }

      const unsubscribe = subscribeJobSnapshot(jobId, push);

      // every 20s so intermediaries (load balancers, browsers) don't
      // consider the connection idle.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          finish();
        }
      }, 20000);

      const abort = () => finish();
      request.signal.addEventListener("abort", abort);
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
