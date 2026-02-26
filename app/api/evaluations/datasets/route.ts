import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/evaluations/datasets
 *
 * Proxy endpoint to fetch all datasets from the backend.
 */
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

    // Get backend URL from environment variable
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Forward the request to the actual backend
    const response = await fetch(`${backendUrl}/api/v1/evaluations/datasets`, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    // Get the response data
    const data = await response.json();

    // Return the response with the same status code
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to forward request to backend', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/evaluations/datasets
 *
 * Proxy endpoint to work around CORS issues.
 * Forwards multipart/form-data requests to the backend API.
 */
export async function POST(request: NextRequest) {
  try {
    // Get the API key from request headers
    const apiKey = request.headers.get('X-API-KEY');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing X-API-KEY header' },
        { status: 401 }
      );
    }

    // Get the form data from the request
    const formData = await request.formData();

    // Get backend URL from environment variable
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Forward the request to the actual backend
    const response = await fetch(`${backendUrl}/api/v1/evaluations/datasets`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-API-KEY': apiKey,
       
      },
    });

    // Get the response data
    const data = await response.json();

    // Return the response with the same status code
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to forward request to backend', details: error.message },
      { status: 500 }
    );
  }
}
