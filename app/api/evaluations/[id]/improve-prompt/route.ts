import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";
import { markJobPending } from "@/app/lib/store/promptImprovementStore";
import { buildWebhookCallbackUrl } from "@/app/lib/webhookCallback";
import type { LLMJobImmediatePublic } from "@/app/lib/types/promptImprovement";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const payload = {
      callback_url: buildWebhookCallbackUrl(
        request,
        "/api/webhooks/prompt-improvement",
      ),
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
