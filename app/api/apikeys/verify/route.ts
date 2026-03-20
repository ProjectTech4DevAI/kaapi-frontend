import { NextRequest, NextResponse } from 'next/server';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // Get the API key from request headers
    const apiKey = request.headers.get('X-API-KEY');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing X-API-KEY header' },
        { status: 401 }
      );
    }

    // Forward the request to the actual backend
    const url = `${backendUrl}/api/v1/apikeys/verify`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    // Handle empty responses (204 No Content, etc.)
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    // Return the response with the same status code
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to forward request to backend', details: error.message },
      { status: 500 }
    );
  }
}