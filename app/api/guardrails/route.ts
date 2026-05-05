import { guardrailsClient } from "@/app/lib/guardrailsClient";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { status, data } = await guardrailsClient(
      request,
      "/api/v1/guardrails",
    );
    return NextResponse.json(data, { status });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
