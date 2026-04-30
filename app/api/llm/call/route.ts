/**
 * The browser polls the resulting job via GET /api/llm/call/{job_id} until it
 * completes.
 */

import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { status, data } = await apiClient(request, "/api/v1/llm/call", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(data, { status });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: null,
      },
      { status: 500 },
    );
  }
}
