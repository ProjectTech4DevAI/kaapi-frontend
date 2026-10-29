import "server-only";

export type SseSend = (event: string, data: unknown, id: number) => void;

const PING_EVERY_MS = 20_000;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

/**
 * Opens a long-lived SSE response. `subscribe` starts sending messages and
 * returns a cleanup, which runs when the browser disconnects.
 */
export function createSseResponse(
  request: Request,
  subscribe: (send: SseSend) => () => void,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const write = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          // Stream already closed.
        }
      };

      const unsubscribe = subscribe((event, data, id) =>
        write(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
      );
      const ping = setInterval(() => write(": ping\n\n"), PING_EVERY_MS);

      request.signal.addEventListener("abort", () => {
        clearInterval(ping);
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: SSE_HEADERS,
  });
}
