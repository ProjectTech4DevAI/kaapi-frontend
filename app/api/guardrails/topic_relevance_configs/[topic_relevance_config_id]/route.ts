import { guardrailsUserClient } from "@/app/lib/guardrailsClient";
import { NextResponse, NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topic_relevance_config_id: string }> },
) {
  try {
    const { topic_relevance_config_id } = await params;
    const { status, data } = await guardrailsUserClient(
      request,
      `/api/v1/guardrails/topic_relevance_configs/${topic_relevance_config_id}`,
    );
    return NextResponse.json(data, { status });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ topic_relevance_config_id: string }> },
) {
  try {
    const { topic_relevance_config_id } = await params;
    const body = await request.json();
    const { status, data } = await guardrailsUserClient(
      request,
      `/api/v1/guardrails/topic_relevance_configs/${topic_relevance_config_id}`,
      {
        method: "PUT",
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
  { params }: { params: Promise<{ topic_relevance_config_id: string }> },
) {
  try {
    const { topic_relevance_config_id } = await params;
    const { status, data } = await guardrailsUserClient(
      request,
      `/api/v1/guardrails/ban_lists/${topic_relevance_config_id}`,
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
