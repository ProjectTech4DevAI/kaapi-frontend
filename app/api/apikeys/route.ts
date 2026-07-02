import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";
import { clearApiKeyCookies, setApiKeyCookies } from "@/app/lib/authCookie";
import type { AddApiKeyRequest, ApiKeyMeta } from "@/app/lib/types/credentials";

function maskKey(key: string): string {
  const tail = key.slice(-4);
  return `${"•".repeat(8)}${tail}`;
}

export async function POST(request: NextRequest) {
  let body: AddApiKeyRequest;
  try {
    body = (await request.json()) as AddApiKeyRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const key = body.key?.trim();
  const label = body.label?.trim();
  const provider = body.provider?.trim() || "Kaapi";

  if (!key || !label) {
    return NextResponse.json(
      { error: "Both a label and an API key are required" },
      { status: 400 },
    );
  }

  const verifyRequest = new Request(request.url, {
    headers: {
      "X-API-KEY": key,
      Cookie: request.headers.get("Cookie") || "",
    },
  });

  let status: number;
  try {
    ({ status } = await apiClient(verifyRequest, "/api/v1/apikeys/verify"));
  } catch {
    return NextResponse.json(
      { error: "Failed to reach backend for API key verification" },
      { status: 502 },
    );
  }

  if (status < 200 || status >= 300) {
    return NextResponse.json(
      { error: "Invalid API key. Please check the key and try again." },
      { status: 401 },
    );
  }

  const meta: ApiKeyMeta = {
    id: crypto.randomUUID(),
    label,
    provider,
    masked: maskKey(key),
    createdAt: new Date().toISOString(),
  };

  const res = NextResponse.json({ data: meta }, { status: 200 });
  setApiKeyCookies(res, key, meta);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true }, { status: 200 });
  clearApiKeyCookies(res);
  return res;
}
