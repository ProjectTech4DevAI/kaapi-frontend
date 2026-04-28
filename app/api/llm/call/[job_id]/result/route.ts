/**
 * Returns the webhook-delivered result for a given job_id.
 *
 * Status semantics:
 *   - 204: webhook hasn't fired yet — caller should keep polling.
 *   - 200: result is ready (the body's `data.status` indicates success vs. failure).
 *
 * Reads only from the in-process job store; no upstream call is made.
 */

import { NextResponse } from "next/server";
import { clearResult, getResult } from "@/app/lib/llmJobStore";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ job_id: string }> },
) {
  const { job_id } = await params;
  const record = getResult(job_id);

  if (!record) {
    return new NextResponse(null, { status: 204 });
  }
  clearResult(job_id);

  return NextResponse.json({
    success: record.outcome === "completed",
    data: {
      job_id,
      status: record.status,
      llm_response: record.llm_response ?? null,
      error_message: record.error_message ?? null,
    },
  });
}
