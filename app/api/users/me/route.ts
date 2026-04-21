import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";
import { setRoleCookieFromBody } from "@/app/lib/authCookie";

export async function GET(request: NextRequest) {
  try {
    const { status, data } = await apiClient(request, "/api/v1/users/me");
    const res = NextResponse.json(data, { status });

    if (status >= 200 && status < 300) {
      setRoleCookieFromBody(res, data);
    }

    return res;
  } catch {
    return NextResponse.json(
      { error: "Failed to connect to backend" },
      { status: 500 },
    );
  }
}
