import { guardrailsClient } from "@/app/lib/apiClient";
import { NextResponse, NextRequest } from "next/server";

function getAuthHeader(): string | undefined {
  const token = process.env.GUARDRAILS_TOKEN;
  return token ? `Bearer ${token}` : undefined;
}

function buildEndpoint(request: NextRequest, config_id: string): string {
  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();
  const organizationId = searchParams.get("organization_id");
  const projectId = searchParams.get("project_id");
  if (organizationId) params.append("organization_id", organizationId);
  if (projectId) params.append("project_id", projectId);
  const qs = params.toString();
  return `/api/v1/guardrails/validators/configs/${config_id}${qs ? `?${qs}` : ""}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ config_id: string }> },
) {
  const authHeader = getAuthHeader();
  if (!authHeader) {
    return NextResponse.json(
      { error: "Missing GUARDRAILS_TOKEN environment variable" },
      { status: 500 },
    );
  }
  try {
    const { config_id } = await params;
    const { status, data } = await guardrailsClient(
      request,
      buildEndpoint(request, config_id),
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ config_id: string }> },
) {
  const authHeader = getAuthHeader();
  if (!authHeader) {
    return NextResponse.json(
      { error: "Missing GUARDRAILS_TOKEN environment variable" },
      { status: 500 },
    );
  }
  try {
    const { config_id } = await params;
    const body = await request.json();
    const { status, data } = await guardrailsClient(
      request,
      buildEndpoint(request, config_id),
      {
        method: "PATCH",
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ config_id: string }> },
) {
  const authHeader = getAuthHeader();
  if (!authHeader) {
    return NextResponse.json(
      { error: "Missing GUARDRAILS_TOKEN environment variable" },
      { status: 500 },
    );
  }
  try {
    const { config_id } = await params;
    const { status, data } = await guardrailsClient(
      request,
      buildEndpoint(request, config_id),
      {
        method: "DELETE",
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
