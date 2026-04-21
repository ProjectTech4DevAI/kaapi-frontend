import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/assessment/evaluations
 *
 * Proxy endpoint to list assessment evaluation runs from the backend.
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-KEY');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing X-API-KEY header' },
        { status: 401 }
      );
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';

    const response = await fetch(`${backendUrl}/api/v1/assessment/evaluations${queryString}`, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to forward request to backend', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assessment/evaluations
 *
 * Proxy endpoint for submitting an assessment evaluation to the backend.
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-KEY');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing X-API-KEY header' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

    const response = await fetch(`${backendUrl}/api/v1/assessment/evaluations`, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to forward request to backend', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
