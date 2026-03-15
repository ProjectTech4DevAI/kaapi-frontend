import { NextRequest, NextResponse } from 'next/server';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export async function GET(request: NextRequest) {
  try {
    // Get the Kaapi API key from request headers
    const apiKey = request.headers.get('X-API-KEY');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing X-API-KEY header' },
        { status: 401 }
      );
    }

    const url = `${backendUrl}/api/v1/guardrails/ban_lists`;

    console.log('[GET /api/guardrails/ban_list] Forwarding to:', url);

    // Forward the request to the actual backend
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log('[GET /api/guardrails/ban_list] Backend response status:', response.status, response.statusText);

    // Handle empty responses (204 No Content, etc.)
    const text = await response.text();
    const data = text ? JSON.parse(text) : { data: [] };

    console.log('[GET /api/guardrails/ban_list] Backend response data:', JSON.stringify(data, null, 2));

    // Return the response with the same status code
    if (!response.ok) {
      console.error('[GET /api/guardrails/ban_list] Backend error:', response.status, data);
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

export async function POST(request: NextRequest) {
  try {
    // Get the Kaapi API key from request headers
    const apiKey = request.headers.get('X-API-KEY');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing X-API-KEY header' },
        { status: 401 }
      );
    }

    // Get the JSON body from the request
    const body = await request.json();

    const url = `${backendUrl}/api/v1/guardrails/ban_lists`;

    console.log('[POST /api/guardrails/ban_list] Forwarding to:', url);
    console.log('[POST /api/guardrails/ban_list] Body:', JSON.stringify(body, null, 2));

    // Forward the request to the actual backend
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log('[POST /api/guardrails/ban_list] Backend response status:', response.status, response.statusText);

    // Handle empty responses (204 No Content, etc.)
    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: true };

    console.log('[POST /api/guardrails/ban_list] Backend response data:', JSON.stringify(data, null, 2));

    // Return the response with the same status code
    if (!response.ok) {
      console.error('[POST /api/guardrails/ban_list] Backend error:', response.status, data);
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
