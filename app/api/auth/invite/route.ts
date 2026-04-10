import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing invitation token" },
        { status: 400 },
      );
    }

    const { status, data, headers } = await apiClient(
      request,
      `/api/v1/auth/invite/verify?token=${encodeURIComponent(token)}`,
    );

    const res = NextResponse.json(data, { status });

    const setCookies = headers.getSetCookie?.() ?? [];
    for (const cookie of setCookies) {
      res.headers.append("Set-Cookie", cookie);
    }

    return res;
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to connect to backend" },
      { status: 500 },
    );
  }
}
