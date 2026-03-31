import { NextResponse } from "next/server";
import { apiClient } from "@/app/lib/apiClient";

/**
 * POST /api/auth/google
 * Receives the Google credential token from the frontend (@react-oauth/google)
 * and sends it to the backend for verification and user creation/login.
 *
 * Request body: { token: string }
 * Backend sets a Set-Cookie with the access_token (HttpOnly).
 * We forward that cookie to the browser.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.token) {
      return NextResponse.json(
        { success: false, error: "Missing Google credential token" },
        { status: 400 },
      );
    }

    const {
      status,
      data,
      headers: backendHeaders,
    } = await apiClient(request, "/api/v1/auth/google", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = NextResponse.json(data, { status });

    // Forward Set-Cookie from backend so the browser stores the auth cookie
    const setCookie = backendHeaders.getSetCookie?.();
    if (setCookie) {
      setCookie.forEach((cookie: string) => {
        response.headers.append("Set-Cookie", cookie);
      });
    }

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to connect to backend" },
      { status: 500 },
    );
  }
}
