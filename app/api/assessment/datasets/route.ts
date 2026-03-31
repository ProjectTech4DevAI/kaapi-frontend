import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/assessment/datasets
 *
 * Proxy endpoint to fetch all assessment datasets from the backend.
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

    const response = await fetch(`${backendUrl}/api/v1/assessment/datasets`, {
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
 * POST /api/assessment/datasets
 *
 * Proxy endpoint for uploading datasets (CSV or Excel).
 * Forwards multipart/form-data requests to the backend API.
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

    const formData = await request.formData();

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

    const response = await fetch(`${backendUrl}/api/v1/assessment/datasets`, {
      method: 'POST',
      body: formData,
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
