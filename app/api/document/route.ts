import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const endpoint = `/api/v1/documents${queryString ? `?${queryString}` : ""}`;
    const { status, data } = await apiClient(request, endpoint);
    return NextResponse.json(data, { status });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: null,
      },
      { status: 500 },
    );
  }
}

/**
 * Proxies the uploaded file to the backend while sending real-time progress
 * events back to the client via a newline-delimited JSON stream.
 * Uses a pull-based ReadableStream as the backend request body so that
 * them — giving accurate progress regardless of internal buffer sizes.
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("Content-Type") || "";

  const fileBuffer = new Uint8Array(await request.arrayBuffer());
  const totalSize = fileBuffer.byteLength;

  if (totalSize === 0) {
    return NextResponse.json({ error: "No body provided" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();

  const CHUNK_SIZE = 64 * 1024; // 64 KB

  (async () => {
    try {
      let offset = 0;
      let lastProgress = 0;

      const uploadBody = new ReadableStream({
        pull(controller) {
          if (offset >= totalSize) {
            controller.close();

            // All bytes forwarded — notify "processing" phase before backend responds
            writer
              .write(
                encoder.encode(JSON.stringify({ phase: "processing" }) + "\n"),
              )
              .catch(() => {});
            return;
          }
          const end = Math.min(offset + CHUNK_SIZE, totalSize);
          controller.enqueue(fileBuffer.subarray(offset, end));
          offset = end;

          const progress = Math.round((offset / totalSize) * 100);
          if (progress > lastProgress) {
            lastProgress = progress;
            writer
              .write(
                encoder.encode(
                  JSON.stringify({ phase: "uploading", progress }) + "\n",
                ),
              )
              .catch(() => {});
          }
        },
      });

      const { status, data } = await apiClient(request, "/api/v1/documents", {
        method: "POST",
        body: uploadBody,
        headers: { "Content-Type": contentType },
        signal: request.signal,
        // @ts-expect-error -- Node fetch supports duplex for streaming request bodies
        duplex: "half",
      });

      await writer.write(
        encoder.encode(JSON.stringify({ done: true, status, data }) + "\n"),
      );
    } catch (err) {
      try {
        await writer.write(
          encoder.encode(
            JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            }) + "\n",
          ),
        );
      } catch {}
    } finally {
      await writer.close();
    }
  })();

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
