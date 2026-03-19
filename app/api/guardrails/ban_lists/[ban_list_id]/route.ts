import { NextResponse } from 'next/server';

const backendUrl = process.env.NEXT_PUBLIC_GUARDRAILS_URL || 'http://localhost:8001';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ban_list_id: string }> }
) {
  const { ban_list_id } = await params;
  const apiKey = request.headers.get('X-API-KEY');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing X-API-KEY header' },
      { status: 401 }
    );
  }

  try {
    const url = `${backendUrl}/api/v1/guardrails/ban_lists/${ban_list_id}`;

    console.log('[GET /api/guardrails/ban_lists/[ban_list_id]] Forwarding to:', url);

    const response = await fetch(url, {
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log('[GET /api/guardrails/ban_list/[ban_list_id]] Backend response status:', response.status, response.statusText);

    // Handle empty responses (204 No Content, etc.)
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    console.log('[GET /api/guardrails/ban_list/[ban_list_id]] Backend response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('[GET /api/guardrails/ban_list/[ban_list_id]] Backend error:', response.status, data);
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ ban_list_id: string }> }
) {
  const { ban_list_id } = await params;
  const apiKey = request.headers.get('X-API-KEY');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing X-API-KEY header' },
      { status: 401 }
    );
  }

  try {
    // Get the JSON body from the request
    const body = await request.json();

    const url = `${backendUrl}/api/v1/guardrails/ban_lists/${ban_list_id}`;

    console.log('[PUT /api/guardrails/ban_list/[ban_list_id]] Forwarding to:', url);
    console.log('[PUT /api/guardrails/ban_list/[ban_list_id]] Body:', JSON.stringify(body, null, 2));

    const response = await fetch(url, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log('[PUT /api/guardrails/ban_list/[ban_list_id]] Backend response status:', response.status, response.statusText);

    // Handle empty responses (204 No Content, etc.)
    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: true };

    console.log('[PUT /api/guardrails/ban_list/[ban_list_id]] Backend response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('[PUT /api/guardrails/ban_list/[ban_list_id]] Backend error:', response.status, data);
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ ban_list_id: string }> }
) {
  const { ban_list_id } = await params;
  const apiKey = request.headers.get('X-API-KEY');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing X-API-KEY header' },
      { status: 401 }
    );
  }

  try {
    const url = `${backendUrl}/api/v1/guardrails/ban_lists/${ban_list_id}`;

    console.log('[DELETE /api/guardrails/ban_lists/[ban_list_id]] Forwarding to:', url);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log('[DELETE /api/guardrails/ban_list/[ban_list_id]] Backend response status:', response.status, response.statusText);

    // Handle empty responses (204 No Content, etc.)
    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: true };

    console.log('[DELETE /api/guardrails/ban_list/[ban_list_id]] Backend response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('[DELETE /api/guardrails/ban_list/[ban_list_id]] Backend error:', response.status, data);
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