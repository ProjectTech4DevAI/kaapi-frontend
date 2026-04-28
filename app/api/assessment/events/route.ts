import { NextRequest, NextResponse } from "next/server";
import { assessmentApiFetch } from "@/app/api/assessment/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const response = await assessmentApiFetch(
      request,
      "/api/v1/assessment/events",
      {
        method: "GET",
        headers: { Accept: "text/event-stream" },
        cache: "no-store",
      },
    );

    if (!response.ok || !response.body) {
      const text = await response.text();
      return NextResponse.json(
        { error: "Failed to connect assessment event stream", details: text },
        { status: response.status || 500 },
      );
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: unknown) {
    console.error("Assessment events proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to connect assessment event stream",
      },
      { status: 500 },
    );
  }
}
