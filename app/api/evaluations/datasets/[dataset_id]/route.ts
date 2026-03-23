import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/evaluations/datasets/:dataset_id
 *
 * Proxy endpoint to get dataset details (with optional signed URL).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dataset_id: string }> }
) {
  try {
    const apiKey = request.headers.get('X-API-KEY');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing X-API-KEY header' }, { status: 401 });
    }

    const { dataset_id } = await params;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const searchParams = request.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';

    const response = await fetch(`${backendUrl}/api/v1/evaluations/datasets/${dataset_id}${queryString}`, {
      method: 'GET',
      headers: { 'X-API-KEY': apiKey },
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // If fetch_content=true, download the CSV from the signed URL and return it
    const fetchContent = request.nextUrl.searchParams.get('fetch_content');
    if (fetchContent === 'true') {
      const signedUrl = data?.data?.signed_url || data?.signed_url;
      if (!signedUrl) {
        return NextResponse.json({ error: 'No signed URL available' }, { status: 404 });
      }
      const csvResponse = await fetch(signedUrl);
      if (!csvResponse.ok) {
        return NextResponse.json({ error: 'Failed to fetch CSV file' }, { status: 502 });
      }
      const csvText = await csvResponse.text();
      return NextResponse.json({ ...data, csv_content: csvText }, { status: 200 });
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
 * DELETE /api/evaluations/datasets/:dataset_id
 *
 * Proxy endpoint to delete a dataset from the backend.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ dataset_id: string }> }
) {
  try {
    // Get the API key from request headers
    const apiKey = request.headers.get('X-API-KEY');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing X-API-KEY header' },
        { status: 401 }
      );
    }

    const { dataset_id } = await params;

    // Get backend URL from environment variable
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

    // Forward the request to the actual backend
    const response = await fetch(`${backendUrl}/api/v1/evaluations/datasets/${dataset_id}`, {
      method: 'DELETE',
      headers: {
        'X-API-KEY': apiKey,
      },
    });

    // Get the response data
    let data;
    try {
      data = await response.json();
    } catch (_e) {
      // If response is not JSON, just return success
      data = { success: true };
    }

    // Return the response with the same status code
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
