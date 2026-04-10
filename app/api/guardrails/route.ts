import { guardrailsClient } from "@/app/lib/apiClient";
import { NextResponse, NextRequest } from "next/server";

function getAuthHeader(): string | undefined {
  const token = process.env.GUARDRAILS_TOKEN;
  return token ? `Bearer ${token}` : undefined;
}

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
      "/api/v1/guardrails/",
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
