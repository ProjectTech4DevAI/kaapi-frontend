/**
 * Webhook receiver for asynchronous LLM call results.
 *
 * The backend POSTs here when a job finishes. The id is carried in the URL
 * path (set by /api/llm/call POST when it generated the callback_url), since
 * the upstream payload itself doesn't include a job_id we can correlate
 * against.
 *
 * Payload shape from the backend:
 *   {
 *     "success": true,
 *     "data": { response: {...}, usage: {...}, provider_raw_response: {...} },
 *     "error": null,
 *     ...
 *   }
 *
 * We treat the entire `data` blob as the `llm_response` and store it under
 * the callback_id for the browser's polling to pick up.
 *
 * Auth: when WEBHOOK_SECRET is set we require a matching `secret` query param
 * (or X-Webhook-Secret header). The id in the URL is unguessable on its own,
 * but the secret adds a second layer for production deployments.
 */

import { NextResponse } from "next/server";
import { LLMJobRecord, publish } from "@/app/lib/llmJobStore";

function isAuthorized(request: Request): boolean {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) return true;
  const url = new URL(request.url);
  const provided =
    url.searchParams.get("secret") ||
    request.headers.get("x-webhook-secret") ||
    "";
  return provided === expected;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ callback_id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { callback_id } = await params;
  if (!callback_id) {
    return NextResponse.json({ error: "missing callback id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const root = (body as Record<string, unknown> | null) ?? {};
  const success = root.success !== false;
  const errorMessage =
    typeof root.error === "string"
      ? root.error
      : root.error == null
        ? null
        : JSON.stringify(root.error);

  const record: LLMJobRecord = {
    outcome: success ? "completed" : "failed",
    status: success ? "completed" : "failed",
    llm_response: root.data ?? null,
    error_message: errorMessage,
    receivedAt: Date.now(),
  };

  publish(callback_id, record);

  return NextResponse.json({ ok: true });
}
