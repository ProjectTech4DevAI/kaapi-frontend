import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ run_id: string }> }
) {
  const { run_id } = await params;
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const apiKey = request.headers.get('X-API-KEY');

  // Extract query parameters from the request URL
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();

  try {
    // Forward query parameters to the backend
    const backendUrlWithParams = queryString
      ? `${backendUrl}/api/v1/evaluations/stt/runs/${run_id}?${queryString}`
      : `${backendUrl}/api/v1/evaluations/stt/runs/${run_id}`;

    const response = await fetch(backendUrlWithParams, {
      headers: {
        'X-API-KEY': apiKey || '',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (_error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch the run', data: null },
      { status: 500 }
    );
  }
}