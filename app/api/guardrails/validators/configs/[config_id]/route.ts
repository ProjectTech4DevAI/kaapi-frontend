import { guardrailsClient } from "@/app/lib/guardrailsClient";
import { buildValidatorConfigEndpoint } from "@/app/lib/utils/guardrails";
import { NextResponse, NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ config_id: string }> },
) {
  try {
    const { config_id } = await params;
    const { status, data } = await guardrailsClient(
      request,
      buildValidatorConfigEndpoint(request, config_id),
    );
    return NextResponse.json(data, { status });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ config_id: string }> },
) {
  try {
    const { config_id } = await params;
    const body = await request.json();
    const { status, data } = await guardrailsClient(
      request,
      buildValidatorConfigEndpoint(request, config_id),
      {
        method: "PATCH",
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ config_id: string }> },
) {
  try {
    const { config_id } = await params;
    const { status, data } = await guardrailsClient(
      request,
      buildValidatorConfigEndpoint(request, config_id),
      {
        method: "DELETE",
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
