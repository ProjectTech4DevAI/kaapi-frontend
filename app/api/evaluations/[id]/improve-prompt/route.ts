import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";
import { markJobPending } from "@/app/lib/store/promptImprovementStore";
import { readWebhookSecret } from "@/app/lib/webhookSecret";
import type { LLMJobImmediatePublic } from "@/app/lib/types/promptImprovement";

function resolveCallbackUrl(request: NextRequest): string {
  const secretResult = readWebhookSecret();
  if (!secretResult.ok || !secretResult.secret) {
    throw new Error(
      secretResult.reason ?? "prompt_improvement_webhook_secret_missing",
    );
  }
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? null;
  const base = configured
    ? configured.replace(/\/$/, "")
    : `${request.headers.get("x-forwarded-proto") ?? "https"}://${
        request.headers.get("x-forwarded-host") ??
        request.headers.get("host") ??
        request.nextUrl.host
      }`;
  return `${base}/api/webhooks/prompt-improvement?secret_value=${encodeURIComponent(secretResult.secret)}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    let userBody: Record<string, unknown> = {};
    try {
      const parsed = await request.json();
      if (parsed && typeof parsed === "object") {
        userBody = parsed as Record<string, unknown>;
      }
    } catch {
      userBody = {};
    }

    const payload = {
      ...userBody,
      callback_url: userBody.callback_url ?? resolveCallbackUrl(request),
    };

    const { status, data } = await apiClient(
      request,
      `/api/v1/evaluations/${id}/improve-prompt`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    if (status === 202 && data && typeof data === "object") {
      const envelope = data as {
        success?: boolean;
        data?: LLMJobImmediatePublic;
      };
      const jobId = envelope.data?.job_id;
      if (jobId) markJobPending(jobId);
    }

    return NextResponse.json(data ?? { error: "Backend error" }, { status });
  } catch (error: unknown) {
    console.error("improve-prompt proxy error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to improve prompt",
      },
      { status: 500 },
    );
  }
}
