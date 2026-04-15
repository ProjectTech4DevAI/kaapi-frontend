import { guardrailsClient } from "@/app/lib/guardrailsClient";
import { buildValidatorConfigEndpoint } from "@/app/lib/utils/guardrails";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { status, data } = await guardrailsClient(
      request,
      buildValidatorConfigEndpoint(request),
    );
    return NextResponse.json(data, { status });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { status, data } = await guardrailsClient(
      request,
      buildValidatorConfigEndpoint(request),
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json(data, { status });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
