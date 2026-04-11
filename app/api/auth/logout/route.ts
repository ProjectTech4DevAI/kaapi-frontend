import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";
import { clearRoleCookie } from "@/app/lib/authCookie";

export async function POST(request: NextRequest) {
  const { status, data, headers } = await apiClient(
    request,
    "/api/v1/auth/logout",
    { method: "POST" },
  );

  const res = NextResponse.json(data, { status });

  const setCookies = headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) {
    res.headers.append("Set-Cookie", cookie);
  }

  clearRoleCookie(res);

  return res;
}
