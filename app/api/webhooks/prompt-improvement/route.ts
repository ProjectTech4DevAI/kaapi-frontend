import { NextRequest, NextResponse } from "next/server";
import {
  getJobSnapshot,
  saveJobSnapshot,
} from "@/app/lib/store/promptImprovementStore";
import type { PromptImprovementJobPublic } from "@/app/lib/types/promptImprovement";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      success?: boolean;
      data?: PromptImprovementJobPublic;
      error?: string | null;
    };
    if (!body.data || !body.data.job_id) {
      return NextResponse.json(
        { success: false, error: "invalid_payload" },
        { status: 400 },
      );
    }
    saveJobSnapshot(body.data);
    return NextResponse.json({ success: true, data: { received: true } });
  } catch (error) {
    console.error("prompt-improvement webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "webhook_processing_failed",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("job_id");
  if (!jobId) {
    return NextResponse.json(
      { success: false, error: "job_id_required" },
      { status: 400 },
    );
  }
  const snapshot = getJobSnapshot(jobId);
  if (!snapshot) {
    return NextResponse.json(
      { success: false, error: "job_not_found", data: null },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: snapshot });
}
