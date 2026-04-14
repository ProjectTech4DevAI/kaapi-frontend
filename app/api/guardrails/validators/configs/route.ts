import { guardrailsClient, getAuthHeader } from "@/app/lib/guardrailsClient";
import { buildValidatorConfigEndpoint } from "@/app/lib/utils/guardrails";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const authHeader = getAuthHeader();
  if (!authHeader) {
    return NextResponse.json(
      { error: "Missing GUARDRAILS_TOKEN environment variable" },
      { status: 500 },
    );
  }
  try {
    const { status, data } = await guardrailsClient(
      request,
      buildValidatorConfigEndpoint(request),
      { authHeader },
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
  const authHeader = getAuthHeader();
  if (!authHeader) {
    return NextResponse.json(
      { error: "Missing GUARDRAILS_TOKEN environment variable" },
      { status: 500 },
    );
  }
  try {
    const body = await request.json();
    const { status, data } = await guardrailsClient(
      request,
      buildValidatorConfigEndpoint(request),
      {
        method: "POST",
        body: JSON.stringify(body),
        authHeader,
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
