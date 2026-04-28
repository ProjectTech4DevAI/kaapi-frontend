/**
 * The browser is responsible for generating the `callback_id` and the full
 * `callback_url` (see chatClient.buildCallbackUrl) — the BFF only forwards.
 * The one server-side concern is `WEBHOOK_SECRET`: when set we append it to
 * the callback URL as a `?secret=...` query param so the receiver can verify
 * the inbound webhook without leaking the secret into the client bundle.
 */

import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

function appendSecretToCallback(body: Record<string, unknown>): void {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return;
  const url = body.callback_url;
  if (typeof url !== "string" || url.length === 0) return;
  const sep = url.includes("?") ? "&" : "?";
  body.callback_url = `${url}${sep}secret=${encodeURIComponent(secret)}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    appendSecretToCallback(body);

    const { status, data } = await apiClient(request, "/api/v1/llm/call", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return NextResponse.json(data, { status });
  } catch (error) {
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
