import { apiClient } from "@/app/lib/apiClient";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { status, data } = await apiClient(request, "/api/v1/credentials/");
    return NextResponse.json(data, { status });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { status, data } = await apiClient(request, "/api/v1/credentials/", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(data, { status });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { status, data } = await apiClient(request, "/api/v1/credentials/", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return NextResponse.json(data, { status });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
